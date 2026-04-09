import { registerLayerPlugin } from '../../registry/LayerRegistry';
import { RouterNode } from './RouterNode';
import { RouterForwarder } from './RouterForwarder';
import type { NetworkTopology } from '../../types/topology';

registerLayerPlugin({
  layerId: 'l3',
  nodeTypes: {
    router: RouterNode,
  },
  deviceRoles: ['router'],
  forwarder: (nodeId: string, topology: NetworkTopology) =>
    new RouterForwarder(nodeId, topology),
});

export { RouterForwarder } from './RouterForwarder';
export { RouterNode } from './RouterNode';
export { NatProcessor } from './NatProcessor';
