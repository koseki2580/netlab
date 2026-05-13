import { registerLayerPlugin } from '../../registry/LayerRegistry';

// L4 Transport layer — educational TCP connection simulation
registerLayerPlugin({
  layerId: 'l4',
  nodeTypes: {},
  deviceRoles: [],
});

export { TcpStateMachine, describeTransition, transition } from './TcpStateMachine';
export { TcpOrchestrator } from './TcpOrchestrator';
export type {
  TcpHandshakeResult,
  TcpPacketSender,
  TcpEventSink,
  TcpTeardownResult,
} from './TcpOrchestrator';
export { TcpConnectionTracker } from './TcpConnectionTracker';
export {
  buildSynPacket,
  buildSynAckPacket,
  buildAckPacket,
  buildFinPacket,
  buildRstPacket,
  generateISN,
} from './tcpPacketBuilder';
export type { TcpPacketOptions } from './tcpPacketBuilder';
export { buildUdpPacket, generateEphemeralPort } from './udpPacketBuilder';
export type { UdpPacketOptions } from './udpPacketBuilder';
export { decodeQuicVarint, encodeQuicVarint } from './quic/QuicVarint';
export { parseQuicFrame, serializeQuicFrame } from './quic/QuicFrame';
export type { QuicFrame } from './quic/QuicFrame';
export { deriveQuicKeys, openQuicPayload, protectQuicPayload } from './quic/QuicPacketProtection';
export type { QuicAeadKeys } from './quic/QuicPacketProtection';
export { QuicHandshake } from './quic/QuicHandshake';
export type { QuicAnnotation, QuicHandshakeRun } from './quic/QuicHandshake';
export { reassembleQuicStream, streamDirection, streamInitiator } from './quic/QuicStream';
export type { QuicStreamChunk } from './quic/QuicStream';
export { respondToPathChallenge, startPathValidation } from './quic/QuicPathValidation';
export type { QuicPathChallenge } from './quic/QuicPathValidation';
