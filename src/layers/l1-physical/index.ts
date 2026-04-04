import { registerLayerPlugin } from '../../registry/LayerRegistry';

// L1 Physical layer stub
// TODO: implement Hub node and signal propagation
registerLayerPlugin({
  layerId: 'l1',
  nodeTypes: {},
  deviceRoles: ['hub'],
});
