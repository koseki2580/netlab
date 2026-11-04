import { bestRoute, isPortBearingPayload, protocolName } from '../routingHelpers';
import { isIpv6Packet, type IpPacket } from '../../../../types/packets';
import type { HopTunnel } from '../../../../types/simulation';
import type { GreTunnelConfig } from '../../../../types/tunneling';
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
): HopTunnel {
  return {
    protocol: 'gre',
    stage,
    outerSrc: outer.srcIp,
    outerDst: outer.dstIp,
    innerSrc: inner.srcIp,
    innerDst: inner.dstIp,
    ...(key === undefined ? {} : { key }),
  };
}

/**
 * The pack's encapsulation hook in the engine (REQ-304): a router with a tunnel
 * interface wraps what it routes into the tunnel, and unwraps what arrives for it.
 * A router without one, and every packet of any other kind, passes untouched.
 */
export function runTunnelStage(ctx: HopContext): StageResult | Promise<StageResult> {
  const { node, ipPacket } = ctx.hop;
  const tunnels = node.data.interfaces?.filter((iface) => iface.greTunnel) ?? [];
  if (node.data.role !== 'router' || tunnels.length === 0 || isIpv6Packet(ipPacket)) {
    return continueWith(ctx);
  }
  // GRE's wire tier loads on the first router with a tunnel (REQ-312).
  const loaded = protocolPacks.wire('gre');
  return loaded
    ? tunnelHop(ctx, tunnels, loaded)
    : protocolPacks.loadWire('gre').then((wire) => tunnelHop(ctx, tunnels, wire));
}

type TunnelInterface = NonNullable<HopContext['hop']['node']['data']['interfaces']>[number];

function tunnelHop(
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
