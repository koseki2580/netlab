import type { InFlightPacket } from '../../types/packets';
import type { PacketTrace } from '../../types/simulation';
import type { PacketFieldPath, SimulationSnapshot } from '../types';
import type { Edit } from './types';
import { registerReducer } from './registry';
import { appendTrace, nodeLabel, withState } from './helpers';

function packetHeader(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.header' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (!hop) return snapshot;

  switch (edit.fieldPath) {
    case 'l2.srcMac':
      if (typeof edit.after === 'string') hop.srcMac = edit.after;
      break;
    case 'l2.dstMac':
      if (typeof edit.after === 'string') hop.dstMac = edit.after;
      break;
    case 'l3.srcIp':
      if (typeof edit.after === 'string') hop.srcIp = edit.after;
      break;
    case 'l3.dstIp':
      if (typeof edit.after === 'string') hop.dstIp = edit.after;
      break;
    case 'l3.ttl':
      if (typeof edit.after === 'number') hop.ttl = edit.after;
      break;
    case 'l3.protocol':
      hop.protocol = String(edit.after);
      break;
    case 'l4.srcPort':
      if (typeof edit.after === 'number') hop.srcPort = edit.after;
      break;
    case 'l4.dstPort':
      if (typeof edit.after === 'number') hop.dstPort = edit.after;
      break;
  }

  if (state.selectedPacket && state.selectedHop?.step === hop.step) {
    state.selectedPacket = patchSelectedPacketHeader(
      state.selectedPacket,
      edit.fieldPath,
      edit.after,
    );
  }

  return withState(snapshot, state);
}
function patchSelectedPacketHeader(
  packet: InFlightPacket,
  fieldPath: PacketFieldPath,
  value: string | number,
): InFlightPacket {
  const next = structuredClone(packet);
  const transport = next.frame.payload.payload;
  switch (fieldPath) {
    case 'l2.srcMac':
      if (typeof value === 'string') next.frame.srcMac = value;
      break;
    case 'l2.dstMac':
      if (typeof value === 'string') next.frame.dstMac = value;
      break;
    case 'l3.srcIp':
      if (typeof value === 'string') next.frame.payload.srcIp = value;
      break;
    case 'l3.dstIp':
      if (typeof value === 'string') next.frame.payload.dstIp = value;
      break;
    case 'l3.ttl':
      if (typeof value === 'number') next.frame.payload.ttl = value;
      break;
    case 'l3.protocol':
      if (typeof value === 'number') next.frame.payload.protocol = value;
      break;
    case 'l4.srcPort':
      if (typeof value === 'number' && 'srcPort' in transport) transport.srcPort = value;
      break;
    case 'l4.dstPort':
      if (typeof value === 'number' && 'dstPort' in transport) transport.dstPort = value;
      break;
  }
  return next;
}
function packetFlags(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.flags.tcp' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  if (state.selectedPacket) {
    const transport = state.selectedPacket.frame.payload.payload;
    if ('flags' in transport) {
      transport.flags = edit.after;
    }
  }
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (hop) {
    const fields = hop.changedFields ?? [];
    hop.changedFields = fields.includes('tcp.flags') ? fields : [...fields, 'tcp.flags'];
  }
  return withState(snapshot, state);
}
function packetPayload(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.payload' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  if (state.selectedPacket) {
    const transport = state.selectedPacket.frame.payload.payload;
    if ('payload' in transport && transport.payload.layer === 'raw') {
      transport.payload.data = edit.after;
    }
  }
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (hop) {
    const fields = hop.changedFields ?? [];
    hop.changedFields = fields.includes('payload') ? fields : [...fields, 'payload'];
  }
  return withState(snapshot, state);
}
function packetCompose(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.compose' }>,
): SimulationSnapshot {
  const packet = edit.packet;
  const trace: PacketTrace = {
    packetId: packet.id,
    label: 'Composed packet',
    srcNodeId: packet.srcNodeId,
    dstNodeId: packet.dstNodeId,
    status: 'delivered',
    hops: [
      {
        step: 0,
        nodeId: packet.srcNodeId,
        nodeLabel: nodeLabel(snapshot.topology, packet.srcNodeId),
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        srcMac: packet.frame.srcMac,
        dstMac: packet.frame.dstMac,
        ttl: packet.frame.payload.ttl,
        protocol: String(packet.frame.payload.protocol),
        event: 'create',
        timestamp: packet.timestamp,
      },
      {
        step: 1,
        nodeId: packet.dstNodeId,
        nodeLabel: nodeLabel(snapshot.topology, packet.dstNodeId),
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: String(packet.frame.payload.protocol),
        event: 'deliver',
        timestamp: packet.timestamp,
      },
    ],
  };

  return appendTrace(snapshot, trace);
}

registerReducer('packet.header', packetHeader);
registerReducer('packet.flags.tcp', packetFlags);
registerReducer('packet.payload', packetPayload);
registerReducer('packet.compose', packetCompose);
