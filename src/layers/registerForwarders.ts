import { layerRegistry, registerLayerPlugin } from '../registry/LayerRegistry';
import { SwitchForwarder } from './l2-datalink/SwitchForwarder';
import { RouterForwarder } from './l3-network/RouterForwarder';
import type { NetworkTopology } from '../types/topology';

// Worker runtimes need forwarding behavior without React node component imports.
if (!layerRegistry.getForwarder('l2')) {
  registerLayerPlugin({
    layerId: 'l2',
    nodeTypes: {},
    deviceRoles: ['switch'],
    forwarder: (nodeId: string, topology: NetworkTopology) => new SwitchForwarder(nodeId, topology),
  });
}

if (!layerRegistry.getForwarder('l3')) {
  registerLayerPlugin({
    layerId: 'l3',
    nodeTypes: {},
    deviceRoles: ['router'],
    forwarder: (nodeId: string, topology: NetworkTopology) => new RouterForwarder(nodeId, topology),
  });
}
