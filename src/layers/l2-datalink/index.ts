import { registerLayerPlugin } from '../../registry/LayerRegistry';
import { SwitchNode } from './SwitchNode';
import { SwitchForwarder } from './SwitchForwarder';
import type { NetworkTopology } from '../../types/topology';

registerLayerPlugin({
  layerId: 'l2',
  nodeTypes: {
    switch: SwitchNode,
  },
  deviceRoles: ['switch'],
  forwarder: (nodeId: string, topology: NetworkTopology) =>
    new SwitchForwarder(nodeId, topology),
});

export { SwitchForwarder } from './SwitchForwarder';
export { SwitchNode } from './SwitchNode';
