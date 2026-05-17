import type { PacketHop, PacketTrace } from '../../types/simulation';
import type { SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { appendTrace, nodeIp, nodeLabel } from './helpers';

function trafficLaunch(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'traffic.launch' }>,
): SimulationSnapshot {
  const flow = edit.flow;
  const srcIp = nodeIp(snapshot.topology, flow.srcNodeId);
  const dstIp = nodeIp(snapshot.topology, flow.dstNodeId);
  const baseHop: Omit<PacketHop, 'step' | 'nodeId' | 'nodeLabel' | 'event'> = {
    srcIp,
    dstIp,
    ttl: flow.ttl ?? snapshot.parameters.engine.maxTtl,
    protocol: flow.protocol.toUpperCase(),
    ...(flow.dstPort !== undefined ? { dstPort: flow.dstPort } : {}),
    timestamp: snapshot.capturedAt,
  };
  const trace: PacketTrace = {
    packetId: flow.id,
    label: `${flow.protocol.toUpperCase()} sandbox traffic`,
    srcNodeId: flow.srcNodeId,
    dstNodeId: flow.dstNodeId,
    status: 'delivered',
    hops: [
      {
        ...baseHop,
        step: 0,
        nodeId: flow.srcNodeId,
        nodeLabel: nodeLabel(snapshot.topology, flow.srcNodeId),
        event: 'create',
      },
      {
        ...baseHop,
        step: 1,
        nodeId: flow.dstNodeId,
        nodeLabel: nodeLabel(snapshot.topology, flow.dstNodeId),
        event: 'deliver',
      },
    ],
  };
  return appendTrace(snapshot, trace);
}

registerReducer('traffic.launch', trafficLaunch);
