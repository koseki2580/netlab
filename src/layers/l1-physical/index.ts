import { registerLayerPlugin } from '../../registry/LayerRegistry';
import type { NetworkTopology } from '../../types/topology';
import { HubForwarder } from './HubForwarder';
import { HubNode } from './components/HubNode';

registerLayerPlugin({
  layerId: 'l1',
  nodeTypes: {
    hub: HubNode,
  },
  deviceRoles: ['hub', 'access-point', 'station'],
  forwarder: (nodeId: string, topology: NetworkTopology) => new HubForwarder(nodeId, topology),
});

export { HubForwarder } from './HubForwarder';
export { HubNode } from './components/HubNode';
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
