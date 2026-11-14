/**
 * A host asks by ARP and nobody inside its VLAN answers (IEEE 802.1Q, RFC 826,
 * REQ-350): the packet never leaves it. Loaded only when that happens, so it
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
