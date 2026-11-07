/**
 * NDP on the wire (REQ-191), loaded only when an IPv6 sender first has to ask:
 * most sends never need it, so it stays out of the engine's own bundle.
 */
import type { InFlightPacket } from '../../../types/packets';
import type { PacketHop } from '../../../types/simulation';
import { solicitedNodeAddress, solicitedNodeMac, type NdpMessage } from '../../icmpv6';
import type { TraceRecorder } from '../../TraceRecorder';
import type { InterfaceResolver } from '../resolvers';
import type { ArpTargetInfo } from './ArpDispatcher';

/**
 * A Neighbor Solicitation to the target's solicited-node address and 33:33
 * MAC, and the target's unicast Advertisement back (RFC 4861 §4.3, §4.4).
 */
export function injectNdpExchange(
  traceRecorder: TraceRecorder,
  ifaceResolver: InterfaceResolver,
  info: ArpTargetInfo,
  senderNodeId: string,
  targetMac: string,
  edgeId: string,
  workingPacket: InFlightPacket,
  stepCounter: number,
  hops: PacketHop[],
  snapshots: InFlightPacket[],
  baseTs: number,
): number {
  const frame = (
    srcMac: string,
    dstMac: string,
    srcIp: string,
    dstIp: string,
    message: NdpMessage,
  ): NonNullable<PacketHop['ndpFrame']> => ({
    layer: 'L2',
    srcMac,
    dstMac,
    etherType: 0x86dd,
    payload: {
      layer: 'L3',
      version: 6,
      srcIp,
      dstIp,
      ttl: 255,
      hopLimit: 255,
      nextHeader: 58,
      protocol: 58,
      payload: message,
    },
  });
  const solicit = frame(
    info.senderMac,
    solicitedNodeMac(info.targetIp),
    info.senderIp,
    solicitedNodeAddress(info.targetIp),
    {
      layer: 'L4',
      type: 135,
      code: 0,
      checksum: 0,
      targetAddress: info.targetIp,
      options: [{ type: 1, linkLayerAddress: info.senderMac }],
    },
  );
  const advert = frame(targetMac, info.senderMac, info.targetIp, info.senderIp, {
    layer: 'L4',
    type: 136,
    code: 0,
    checksum: 0,
    targetAddress: info.targetIp,
    flags: {
      router: ifaceResolver.findNode(info.targetNodeId)?.data.role === 'router',
      solicited: true,
      override: true,
    },
    options: [{ type: 2, linkLayerAddress: targetMac }],
  });
  const hopOf = (
    nodeId: string,
    toNodeId: string,
    event: 'ndp-solicit' | 'ndp-advert',
    ndpFrame: NonNullable<PacketHop['ndpFrame']>,
  ): Omit<PacketHop, 'step'> => ({
    nodeId,
    nodeLabel: ifaceResolver.findNode(nodeId)?.data.label ?? nodeId,
    srcIp: ndpFrame.payload.srcIp,
    dstIp: ndpFrame.payload.dstIp,
    srcMac: ndpFrame.srcMac,
    dstMac: ndpFrame.dstMac,
    ttl: 255,
    protocol: 'ICMPv6',
    event,
    toNodeId,
    activeEdgeId: edgeId,
    ndpFrame,
    ndpState: event === 'ndp-solicit' ? 'INCOMPLETE' : 'REACHABLE',
    timestamp: baseTs,
  });
  stepCounter = traceRecorder.appendHop(
    hops,
    snapshots,
    hopOf(senderNodeId, info.targetNodeId, 'ndp-solicit', solicit),
    workingPacket,
    stepCounter,
  );
  return traceRecorder.appendHop(
    hops,
    snapshots,
    hopOf(info.targetNodeId, senderNodeId, 'ndp-advert', advert),
    workingPacket,
    stepCounter,
  );
}
