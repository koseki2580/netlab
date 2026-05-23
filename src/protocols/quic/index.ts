export { decodeQuicVarint, encodeQuicVarint } from '../../layers/l4-transport/quic/QuicVarint';
export { parseQuicFrame, serializeQuicFrame } from '../../layers/l4-transport/quic/QuicFrame';
export type { QuicFrame } from '../../layers/l4-transport/quic/QuicFrame';
export {
  deriveQuicKeys,
  openQuicPayload,
  protectQuicPayload,
} from '../../layers/l4-transport/quic/QuicPacketProtection';
export type { QuicAeadKeys } from '../../layers/l4-transport/quic/QuicPacketProtection';
export { QuicHandshake } from '../../layers/l4-transport/quic/QuicHandshake';
export type {
  QuicAnnotation,
  QuicHandshakeRun,
} from '../../layers/l4-transport/quic/QuicHandshake';
export {
  reassembleQuicStream,
  streamDirection,
  streamInitiator,
} from '../../layers/l4-transport/quic/QuicStream';
export type { QuicStreamChunk } from '../../layers/l4-transport/quic/QuicStream';
export {
  respondToPathChallenge,
  startPathValidation,
} from '../../layers/l4-transport/quic/QuicPathValidation';
export type { QuicPathChallenge } from '../../layers/l4-transport/quic/QuicPathValidation';
