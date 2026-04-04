import { registerLayerPlugin } from '../../registry/LayerRegistry';

// L4 Transport layer stub
// TODO: implement TCP state machine, UDP forwarding
registerLayerPlugin({
  layerId: 'l4',
  nodeTypes: {},
  deviceRoles: [],
});
