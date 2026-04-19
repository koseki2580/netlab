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
  forwarder: (nodeId: string, topology: NetworkTopology) => new SwitchForwarder(nodeId, topology),
});

export { SwitchForwarder } from './SwitchForwarder';
export { SwitchNode } from './SwitchNode';
export {
  DEFAULT_BRIDGE_PRIORITY,
  DEFAULT_STP_PATH_COST,
  compareBridgeId,
  formatBridgeId,
  makeBridgeId,
} from './stp/BridgeId';
export { computeStp } from './stp/computeStp';
export type { StpResult } from './stp/computeStp';
export { collectSwitchBridges, electRoot } from './stp/rootElection';
export type { SwitchBridge } from './stp/rootElection';
