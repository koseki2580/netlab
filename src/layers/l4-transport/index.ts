import { registerLayerPlugin } from '../../registry/LayerRegistry';

// L4 Transport layer — educational TCP connection simulation
registerLayerPlugin({
  layerId: 'l4',
  nodeTypes: {},
  deviceRoles: [],
});

export {
  TcpStateMachine,
  describeTransition,
  transition,
} from './TcpStateMachine';
export {
  TcpOrchestrator,
} from './TcpOrchestrator';
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
