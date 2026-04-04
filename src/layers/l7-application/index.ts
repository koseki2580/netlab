import { registerLayerPlugin } from '../../registry/LayerRegistry';
import { ClientNode } from './ClientNode';
import { ServerNode } from './ServerNode';

registerLayerPlugin({
  layerId: 'l7',
  nodeTypes: {
    client: ClientNode,
    server: ServerNode,
  },
  deviceRoles: ['client', 'server'],
});

export { ClientNode } from './ClientNode';
export { ServerNode } from './ServerNode';
