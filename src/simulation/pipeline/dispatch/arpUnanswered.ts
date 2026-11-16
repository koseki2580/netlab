/**
 * A host asks by ARP and nobody inside its VLAN answers (IEEE 802.1Q, RFC 826,
 * REQ-350): the packet never leaves it. A router that asks on its own LAN and
 * gets no answer drops the packet and tells the source (REQ-371). Loaded only when that happens, so it
 * stays out of the engine's own bundle.
 */
import { isVlanAllowedOnPort, resolveIngressVlan } from '../../../layers/l2-datalink/vlan';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import type { SwitchPort } from '../../../types/topology';
import { deriveDeterministicMac } from '../../../utils/network';
import { ArpBuilder } from '../builders/ArpBuilder';
import { interfaceMatchesTarget } from '../../../layers/l3-network/logicalInterfaces';
import { passArpThroughSwitches } from './stages/floodCopies';
import {
  appendDropHop,
  appendHop,
  breakWith,
  type RoutedContext,
  type StageResult,
} from './stages/_shared';

interface Next {
  readonly nodeId: string;
  readonly edgeId: string;
}

/** The port of `switchId` that `edgeId` plugs into, when the edge names one. */
function portOn(ctx: RoutedContext, switchId: string, edgeId: string): SwitchPort | undefined {
  const edge = ctx.deps.topology.edges.find((candidate) => candidate.id === edgeId);
  const handle = edge?.source === switchId ? edge.sourceHandle : edge?.targetHandle;
  return ctx.deps.ifaceResolver.findNode(switchId)?.data.ports?.find((port) => port.id === handle);
}

/**
 * Whether nobody inside the sender's VLAN would answer its ARP: no gateway on its subnet,
 * and no device of its VLAN (through its switches, over links that are up) has the
 * destination. A port with no VLAN setting is in VLAN 1, as on a real switch.
 */
export function nobodyAnswers(ctx: RoutedContext, next: Next): boolean {
  const { ifaceResolver, addresses } = ctx.deps;
  const failures = ctx.shared.failureState;
  const ingress = portOn(ctx, next.nodeId, next.edgeId);
  const vlan = ingress
    ? resolveIngressVlan(ingress, {} as Parameters<typeof resolveIngressVlan>[1])
    : null;
  if (vlan === null) return false;
  const packet = ctx.workingPacket;
  const target = packet.frame.payload.dstIp;
  const sender = ifaceResolver.findNode(ctx.current);
  const senderIp = sender ? addresses.nodeIp(sender) : undefined;
  const gateway = senderIp
    ? ifaceResolver.findGatewayThroughSwitches(next.nodeId, ctx.current, senderIp, failures)
    : null;
  if (gateway && !interfaceMatchesTarget(gateway.iface, target)) return false;
  const visited = new Set<string>();
  const reaches = (switchId: string, from: string): boolean => {
    if (visited.has(switchId)) return false;
    visited.add(switchId);
    return ifaceResolver.getNeighbors(switchId, from, failures).some((neighbor) => {
      const port = portOn(ctx, switchId, neighbor.edgeId);
      if (port && !isVlanAllowedOnPort(port, vlan)) return false;
      const node = ifaceResolver.findNode(neighbor.nodeId);
      if (!node) return false;
      if (node.data.role === 'switch') return reaches(node.id, switchId);
      return node.id === packet.dstNodeId || addresses.ownsIp(node, target);
    });
  };
  return !reaches(next.nodeId, ctx.current);
}

/**
 * The host's `create`, its ARP request for its gateway (or for the destination
 * when it has none) with the copies its VLAN heard, and the drop at the host.
 */
export async function askUnanswered(ctx: RoutedContext, next: Next): Promise<StageResult> {
  const { ifaceResolver, macResolver, addresses, frameMaterializer, traceRecorder } = ctx.deps;
  const sender = ifaceResolver.findNode(ctx.current);
  const senderIp = sender ? (addresses.nodeIp(sender) ?? '') : '';
  const gateway = senderIp
    ? ifaceResolver.findGatewayThroughSwitches(
        next.nodeId,
        ctx.current,
        senderIp,
        EMPTY_FAILURE_STATE,
      )
    : null;
  const frame = ctx.workingPacket.frame;
  const targetIp = gateway?.iface.ipAddress ?? frame.payload.dstIp;
  const senderMac =
    macResolver.resolveEndpointMac(ctx.current) ?? deriveDeterministicMac(ctx.current);
  const request = new ArpBuilder().buildRequestFrame({ ip: senderIp, mac: senderMac }, targetIp);
  const at = { toNodeId: next.nodeId, activeEdgeId: next.edgeId };

  appendHop(ctx, { ...ctx.hop.base, event: 'create', ...at }, ctx.workingPacket);
  ctx.stepCounter = traceRecorder.appendHop(
    ctx.shared.hops,
    ctx.shared.snapshots,
    frameMaterializer.withArpFrameMacs(
      {
        nodeId: ctx.current,
        nodeLabel: sender?.data.label ?? ctx.current,
        srcIp: senderIp,
        dstIp: targetIp,
        ttl: 0,
        protocol: 'ARP',
        event: 'arp-request',
        ...at,
        arpFrame: request,
        timestamp: ctx.baseTs,
      },
      request,
    ),
    ctx.workingPacket,
    ctx.stepCounter,
  );
  const hop = ctx.shared.hops[ctx.shared.hops.length - 1];
  // The copies are of the question, so the switches see the address it asks for.
  const asking = {
    ...ctx,
    workingPacket: {
      ...ctx.workingPacket,
      frame: { ...frame, payload: { ...frame.payload, dstIp: targetIp } },
    },
  };
  const copies = await passArpThroughSwitches(asking, {
    senderId: ctx.current,
    senderMac,
    targetId: '',
    targetMac: '',
    nextNodeId: next.nodeId,
    edgeId: next.edgeId,
  });
  if (hop && copies.length > 0) hop.flood = { copies };
  appendDropHop(ctx, 'arp-no-reply', ctx.workingPacket);
  return breakWith(ctx);
}

/**
 * The router's own network that holds `target`, and the neighbour on that
 * interface's cable: where its ARP for `target` would go (REQ-371). Null for
 * an address of none of its networks — that is the routing table's business.
 */
export function routerLanFor(
  ctx: RoutedContext,
  target: string,
): {
  iface: ReturnType<RoutedContext['deps']['ifaceResolver']['findLogicalById']>;
  next: Next;
} | null {
  const { ifaceResolver, topology } = ctx.deps;
  const router = ifaceResolver.findNode(ctx.current);
  const iface = (router?.data.interfaces ?? [])
    .map((candidate) => ifaceResolver.findLogicalById(ctx.current, candidate.id))
    .find((candidate) => candidate !== null && interfaceMatchesTarget(candidate, target));
  if (!iface) return null;
  const edge = topology.edges.find(
    (candidate) =>
      (candidate.source === ctx.current && candidate.sourceHandle === iface.id) ||
      (candidate.target === ctx.current && candidate.targetHandle === iface.id),
  );
  if (edge) {
    const nodeId = edge.source === ctx.current ? edge.target : edge.source;
    return { iface, next: { nodeId, edgeId: edge.id } };
  }
  // A cable that names no interface: the neighbour whose side holds a device
  // on that network (itself, or behind its switches).
  const failures = ctx.shared.failureState;
  const onNetwork = (nodeId: string, from: string, seen: Set<string>): boolean => {
    const node = ifaceResolver.findNode(nodeId);
    if (!node || seen.has(nodeId)) return false;
    seen.add(nodeId);
    const address = ctx.deps.addresses.nodeIp(node);
    if (node.data.role !== 'switch')
      return (
        (address !== undefined && address !== null && interfaceMatchesTarget(iface, address)) ||
        (node.data.interfaces ?? []).some(
          (other) =>
            other.ipAddress !== undefined && interfaceMatchesTarget(iface, other.ipAddress),
        )
      );
    return ifaceResolver
      .getNeighbors(nodeId, from, failures)
      .some(
        (neighbor) => neighbor.nodeId !== ctx.current && onNetwork(neighbor.nodeId, nodeId, seen),
      );
  };
  const neighbor = ifaceResolver
    .getNeighbors(ctx.current, null, failures)
    .find((candidate) => onNetwork(candidate.nodeId, ctx.current, new Set()));
  return neighbor ? { iface, next: { nodeId: neighbor.nodeId, edgeId: neighbor.edgeId } } : null;
}

/** Whether nobody beyond `next` (through switches, over links that are up) has `target`. */
export function routerNobodyAnswers(ctx: RoutedContext, next: Next, target: string): boolean {
  const { ifaceResolver, addresses } = ctx.deps;
  const failures = ctx.shared.failureState;
  const visited = new Set<string>();
  const owns = (nodeId: string, from: string): boolean => {
    const node = ifaceResolver.findNode(nodeId);
    if (!node || visited.has(nodeId)) return false;
    visited.add(nodeId);
    if (node.data.role !== 'switch') return addresses.ownsIp(node, target);
    return ifaceResolver
      .getNeighbors(nodeId, from, failures)
      .some((neighbor) => neighbor.nodeId !== ctx.current && owns(neighbor.nodeId, nodeId));
  };
  return !owns(next.nodeId, ctx.current);
}

/**
 * The router's ARP request for `target`, with the copies its LAN heard, then
 * the drop and, unless the source cannot be told, ICMP host unreachable from
 * the address the packet came in on (RFC 1812 §5.2.7.1).
 */
export async function routerAsksUnanswered(
  ctx: RoutedContext,
  next: Next,
  target: string,
): Promise<StageResult> {
  const { ifaceResolver, macResolver, addresses, frameMaterializer, traceRecorder, icmpBuilder } =
    ctx.deps;
  const router = ifaceResolver.findNode(ctx.current);
  const egress = routerLanFor(ctx, target)?.iface ?? null;
  const senderIp = egress?.ipAddress ?? '';
  const senderMac =
    egress?.macAddress ??
    macResolver.resolveEndpointMac(ctx.current) ??
    deriveDeterministicMac(ctx.current);
  const request = new ArpBuilder().buildRequestFrame({ ip: senderIp, mac: senderMac }, target);
  const at = { toNodeId: next.nodeId, activeEdgeId: next.edgeId };
  ctx.stepCounter = traceRecorder.appendHop(
    ctx.shared.hops,
    ctx.shared.snapshots,
    frameMaterializer.withArpFrameMacs(
      {
        nodeId: ctx.current,
        nodeLabel: router?.data.label ?? ctx.current,
        srcIp: senderIp,
        dstIp: target,
        ttl: 0,
        protocol: 'ARP',
        event: 'arp-request',
        ...at,
        arpFrame: request,
        timestamp: ctx.baseTs,
      },
      request,
    ),
    ctx.workingPacket,
    ctx.stepCounter,
  );
  const hop = ctx.shared.hops[ctx.shared.hops.length - 1];
  if (ifaceResolver.findNode(next.nodeId)?.data.role === 'switch') {
    const frame = ctx.workingPacket.frame;
    const asking = {
      ...ctx,
      workingPacket: {
        ...ctx.workingPacket,
        frame: { ...frame, payload: { ...frame.payload, dstIp: target } },
      },
    };
    const copies = await passArpThroughSwitches(asking, {
      senderId: ctx.current,
      senderMac,
      targetId: '',
      targetMac: '',
      nextNodeId: next.nodeId,
      edgeId: next.edgeId,
    });
    if (hop && copies.length > 0) hop.flood = { copies };
  }
  const extras: { icmpGenerated?: boolean } = {};
  const ingressId = ctx.hop.base.ingressInterfaceId;
  const answerFrom =
    (ingressId ? ifaceResolver.findLogicalById(ctx.current, ingressId)?.ipAddress : undefined) ??
    (router ? addresses.nodeIp(router) : undefined);
  if (
    answerFrom &&
    !ctx.shared.options.suppressGeneratedIcmp &&
    icmpBuilder.shouldEmitGeneratedIcmp(ctx.workingPacket.frame.payload.srcIp)
  ) {
    extras.icmpGenerated = true;
    // Host unreachable is network unreachable with code 1 (RFC 792); built here,
    // where it is needed, so the engine's own chunk does not carry it.
    const unreachable = icmpBuilder.buildNetUnreachable(ctx.current, answerFrom, ctx.workingPacket);
    const ip = unreachable.frame.payload;
    ctx.generatedIcmpPackets.push({
      ...unreachable,
      id: unreachable.id.replace(/net-unreachable$/, 'host-unreachable'),
      frame: { ...unreachable.frame, payload: { ...ip, payload: { ...ip.payload, code: 1 } } },
    } as typeof unreachable);
  }
  appendDropHop(ctx, 'arp-no-reply', ctx.workingPacket, extras);
  return breakWith(ctx);
}

/**
 * The router's side of REQ-371, decided and drawn here so the engine's own
 * chunk carries one call: for an IPv4 address of one of the router's own
 * networks that nobody there has, the unanswered ARP and its drop; otherwise
 * null, and the caller carries on.
 */
export async function unansweredAtRouter(ctx: RoutedContext): Promise<StageResult | null> {
  const payload = ctx.workingPacket.frame.payload;
  if ('hopLimit' in payload) return null;
  const target = ctx.routing.nextHopIp ?? payload.dstIp;
  const lan = routerLanFor(ctx, target);
  return lan && routerNobodyAnswers(ctx, lan.next, target)
    ? routerAsksUnanswered(ctx, lan.next, target)
    : null;
}
