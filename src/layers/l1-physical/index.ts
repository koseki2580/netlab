import { registerLayerPlugin } from '../../registry/LayerRegistry';

// L1 Physical layer stub
// TODO: implement Hub node and signal propagation
registerLayerPlugin({
  layerId: 'l1',
  nodeTypes: {},
  deviceRoles: ['hub', 'access-point', 'station'],
});

export { deterministicBackoffSlot, detectHiddenNodeCollision } from './wireless/CsmaCa';
export type { HiddenNodeCollisionInput, HiddenNodeTransmission } from './wireless/CsmaCa';
export { WirelessLinkController } from './wireless/WirelessLinkController';
export { transitionWirelessState } from './wireless/WirelessStateMachine';
export { WpaFourWayHandshake } from './wireless/WpaFourWayHandshake';
export type {
  WpaFourWayHandshakeInput,
  WpaFourWayHandshakeResult,
  WpaHandshakeMessage,
} from './wireless/WpaFourWayHandshake';
