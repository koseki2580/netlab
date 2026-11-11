import { bestRoute, isPortBearingPayload, protocolName } from '../routingHelpers';
import type { IpPacket } from '../../../../types/packets';
import type { HopTunnel } from '../../../../types/simulation';
import type {
  GreTunnelConfig,
  MplsLabel,
  VtepConfig,
  VxlanEncapConfig,
} from '../../../../types/tunneling';
import type { EthernetFrame } from '../../../../types/packets';
import type { ProtocolWire } from '../../../../protocols/pack/types';
import { protocolPacks } from '../../../../protocols/packs';
import { computeIpv4Checksum } from '../../../../utils/checksum';
import { isInSubnet } from '../../../../utils/cidr';
import { buildIpv4HeaderBytes } from '../../../../utils/packetLayout';
import {
  appendDropHop,
  appendHop,
  breakWith,
  continueWith,
  type HopContext,
  type StageResult,
} from './_shared';

interface Encapsulation {
  readonly push: (inner: IpPacket, config: GreTunnelConfig) => IpPacket;
  readonly pop: (outer: IpPacket) => { inner: IpPacket; key?: number };
}

const greEncapsulation = (wire: ProtocolWire | undefined) =>
  wire?.behaviour?.encapsulation as Encapsulation | undefined;

/** The hop goes on as `packet`: later stages, and the hop they record, read it. */
function adopt(ctx: HopContext, packet: IpPacket): void {
  ctx.workingPacket = {
    ...ctx.workingPacket,
    frame: { ...ctx.workingPacket.frame, payload: packet },
  };
  const { srcPort: _src, dstPort: _dst, ...base } = ctx.hop.base;
  ctx.hop = {
    ...ctx.hop,
    ipPacket: packet,
    transport: packet.payload,
    base: {
      ...base,
      srcIp: packet.srcIp,
      dstIp: packet.dstIp,
      ttl: packet.ttl,
      protocol: protocolName(packet.protocol),
      ...(isPortBearingPayload(packet.payload)
        ? { srcPort: packet.payload.srcPort, dstPort: packet.payload.dstPort }
        : {}),
    },
  };
}

function facts(
  stage: HopTunnel['stage'],
  outer: IpPacket,
  inner: IpPacket,
  key?: number,
  protocol = 'gre',
): HopTunnel {
  return {
    protocol,
    stage,
    outerSrc: outer.srcIp,
    outerDst: outer.dstIp,
    innerSrc: inner.srcIp,
    innerDst: inner.dstIp,
    ...(key === undefined ? {} : { key }),
  };
}

type TunnelInterface = NonNullable<HopContext['hop']['node']['data']['interfaces']>[number];

/** A tunnelling router's hop (REQ-304, REQ-331): GRE, then VXLAN. */
export async function tunnelHop(ctx: HopContext): Promise<StageResult> {
  const tunnels = ctx.hop.node.data.interfaces?.filter((iface) => iface.greTunnel) ?? [];
  if (tunnels.length > 0) {
    const result = greHop(ctx, tunnels, await protocolPacks.loadWire('gre'));
    if (result.kind !== 'continue' || ctx.hop.ipPacket.protocol === 47) return result;
  }
  const vtep = ctx.hop.node.data.vtep;
  if (vtep) {
    const result = vxlanHop(ctx, vtep, await protocolPacks.loadWire('vxlan'));
    if (result.kind !== 'continue') return result;
  }
  if (ctx.hop.node.data.mpls || ctx.workingPacket.frame.mplsStack) {
    await protocolPacks.loadWire('mpls'); // registers the label-stack bytes with packetLayout
    return mplsHop(ctx);
  }
  return continueWith(ctx);
}

function greHop(
  ctx: HopContext,
  tunnels: readonly TunnelInterface[],
  wire: ProtocolWire | undefined,
): StageResult {
  const { ipPacket, base } = ctx.hop;
  const hook = greEncapsulation(wire);
  if (!hook) return continueWith(ctx);

  if ('gre' in ipPacket.payload) {
    const end = tunnels.find((iface) => iface.greTunnel!.sourceIp === ipPacket.dstIp);
    if (!end) return continueWith(ctx);
    const { inner, key } = hook.pop(ipPacket);
    const tunnel = facts('decap', ipPacket, inner, key);
    if (key !== end.greTunnel!.key) {
      appendDropHop(ctx, 'gre-key-mismatch', ctx.workingPacket, { tunnel });
      return breakWith(ctx);
    }
    appendHop(ctx, { ...base, action: 'tunnel:gre-unwrap', tunnel }, ctx.workingPacket);
    adopt(ctx, inner);
    return continueWith(ctx);
  }

  const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
  const route = bestRoute(ipPacket.dstIp, routes);
  const nextHop = route?.nextHop === 'direct' ? ipPacket.dstIp : route?.nextHop;
  const exit =
    nextHop === undefined
      ? undefined
      : tunnels.find((iface) => isInSubnet(nextHop, `${iface.ipAddress}/${iface.prefixLength}`));
  if (!exit) return continueWith(ctx);
  if (ipPacket.ttl <= 1) {
    appendDropHop(ctx, 'ttl-exceeded', ctx.workingPacket);
    return breakWith(ctx);
  }
  const forwarded = { ...ipPacket, ttl: ipPacket.ttl - 1 };
  const inner = {
    ...forwarded,
    headerChecksum: computeIpv4Checksum(buildIpv4HeaderBytes(forwarded, { checksumOverride: 0 })),
  };
  const outer = hook.push(inner, exit.greTunnel!);
  appendHop(
    ctx,
    {
      ...base,
      action: 'tunnel:gre-wrap',
      tunnel: facts('encap', outer, inner, exit.greTunnel!.key),
    },
    ctx.workingPacket,
  );
  adopt(ctx, outer);
  return continueWith(ctx);
}

interface VxlanEncapsulation {
  readonly push: (inner: EthernetFrame, config: VxlanEncapConfig) => IpPacket;
  readonly pop: (outer: IpPacket) => { vni: number; inner: EthernetFrame };
}

/** The router MAC a VTEP's inner frames carry: its first interface's (symmetric IRB). */
function vtepMac(ctx: HopContext, vtepIp: string): string {
  const node = ctx.deps.topology.nodes.find(
    (candidate) =>
      candidate.data.vtep?.sourceVtepIp === vtepIp ||
      candidate.data.interfaces?.some((iface) => iface.ipAddress === vtepIp),
  );
  return node?.data.interfaces?.[0]?.macAddress ?? '00:00:00:00:00:00';
}

/**
 * VXLAN in the engine (REQ-331): a leaf wraps a packet whose next hop is a peer VTEP
 * in an inner Ethernet frame (its router MAC to the peer's) and UDP 4789; the peer
 * unwraps what is addressed to it and routes the inner packet on. EVPN's route
 * learning is not on the wire: the routes are given.
 */
function vxlanHop(ctx: HopContext, vtep: VtepConfig, wire: ProtocolWire | undefined): StageResult {
  const { ipPacket, base } = ctx.hop;
  const hook = wire?.behaviour?.encapsulation as VxlanEncapsulation | undefined;
  if (!hook) return continueWith(ctx);
  const udp = ipPacket.payload;

  if (ipPacket.dstIp === vtep.sourceVtepIp && 'payload' in udp && 'vxlan' in udp.payload) {
    const { vni, inner } = hook.pop(ipPacket);
    const packet = inner.payload as IpPacket;
    const tunnel = facts('decap', ipPacket, packet, vni, 'vxlan');
    if (vni !== vtep.vni) {
      appendDropHop(ctx, 'vxlan-vni-mismatch', ctx.workingPacket, { tunnel });
      return breakWith(ctx);
    }
    appendHop(ctx, { ...base, action: 'tunnel:vxlan-unwrap', tunnel }, ctx.workingPacket);
    adopt(ctx, packet);
    return continueWith(ctx);
  }

  const route = bestRoute(ipPacket.dstIp, ctx.deps.topology.routeTables.get(ctx.current) ?? []);
  const peer = route?.nextHop;
  if (!peer || !vtep.peerVtepIps.includes(peer)) return continueWith(ctx);
  if (ipPacket.ttl <= 1) {
    appendDropHop(ctx, 'ttl-exceeded', ctx.workingPacket);
    return breakWith(ctx);
  }
  const forwarded = { ...ipPacket, ttl: ipPacket.ttl - 1 };
  const packet = {
    ...forwarded,
    headerChecksum: computeIpv4Checksum(buildIpv4HeaderBytes(forwarded, { checksumOverride: 0 })),
  };
  const frame: EthernetFrame = {
    layer: 'L2',
    srcMac: vtepMac(ctx, vtep.sourceVtepIp),
    dstMac: vtepMac(ctx, peer),
    etherType: 0x0800,
    payload: packet,
  };
  const outer = hook.push(frame, {
    vni: vtep.vni,
    sourceVtepIp: vtep.sourceVtepIp,
    destinationVtepIp: peer,
  });
  appendHop(
    ctx,
    {
      ...base,
      action: 'tunnel:vxlan-wrap',
      tunnel: facts('encap', outer, packet, vtep.vni, 'vxlan'),
    },
    ctx.workingPacket,
  );
  adopt(ctx, outer);
  return continueWith(ctx);
}

const labelsOf = (stack: readonly MplsLabel[] | undefined) =>
  (stack ?? []).map((entry) => entry.label);

/** The frame from here on: these labels (or none), EtherType to match, and where MPLS sends it. */
function relabel(ctx: HopContext, stack: readonly MplsLabel[], nextHop: string | undefined): void {
  const { mplsStack: _old, ...frame } = ctx.workingPacket.frame;
  const { mplsNextHop: _hop, ...packet } = ctx.workingPacket;
  ctx.workingPacket = {
    ...packet,
    ...(nextHop ? { mplsNextHop: nextHop } : {}),
    frame: stack.length
      ? { ...frame, etherType: 0x8847, mplsStack: stack }
      : { ...frame, etherType: 0x0800 },
  };
}

/**
 * MPLS in the engine (REQ-334): push at the ingress PE by FTN, swap or pop by the
 * top label. When no label is left the packet is routed by IP. LDP and VPN labels
 * are given in `mpls`, not signalled on the wire.
 */
function mplsHop(ctx: HopContext): StageResult {
  const { ipPacket, base } = ctx.hop;
  const tables = ctx.hop.node.data.mpls ?? {};
  const stack = ctx.workingPacket.frame.mplsStack;
  const note = (
    action: 'push' | 'swap' | 'pop',
    before: readonly MplsLabel[],
    after: readonly MplsLabel[],
  ) =>
    appendHop(
      ctx,
      {
        ...base,
        action: `tunnel:mpls-${action}`,
        mpls: { action, before: labelsOf(before), after: labelsOf(after) },
      },
      ctx.workingPacket,
    );

  if (!stack) {
    const ftn = tables.ftn?.find((entry) => isInSubnet(ipPacket.dstIp, entry.prefix));
    if (!ftn) return continueWith(ctx);
    const ttl = ipPacket.ttl - 1;
    const pushed = ftn.push.map((label, i) => ({
      label,
      tc: 0,
      endOfStack: i === ftn.push.length - 1,
      ttl,
    }));
    note('push', [], pushed);
    relabel(ctx, pushed, ftn.nextHop);
    return continueWith(ctx);
  }

  let labels: readonly MplsLabel[] = stack;
  while (labels.length > 0) {
    const [top, ...rest] = labels;
    const entry = tables.lfib?.find((candidate) => candidate.inLabel === top!.label);
    if (!entry) {
      appendDropHop(ctx, 'mpls-no-label', ctx.workingPacket, {
        mpls: { action: 'pop', before: labelsOf(labels), after: labelsOf(labels) },
      });
      return breakWith(ctx);
    }
    if (entry.action === 'swap') {
      const swapped = [
        { ...top!, label: entry.outLabel ?? top!.label, ttl: top!.ttl - 1 },
        ...rest,
      ];
      note('swap', labels, swapped);
      relabel(ctx, swapped, entry.nextHop);
      return continueWith(ctx);
    }
    note('pop', labels, rest);
    relabel(ctx, rest, entry.nextHop);
    // PHP: labels remain and this entry sends them on; none remain: route by IP.
    if (rest.length > 0 && entry.nextHop) return continueWith(ctx);
    labels = rest;
  }
  return continueWith(ctx);
}
