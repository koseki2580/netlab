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
  forwarder: (nodeId: string, topology: NetworkTopology) => new RouterForwarder(nodeId, topology),
});

export { RouterForwarder } from './RouterForwarder';
export { RouterNode } from './RouterNode';
export { NatProcessor } from './NatProcessor';
export {
  electVrrpMaster,
  masterDownIntervalMs,
  transitionVrrpState,
  virtualRouterMac,
} from './VrrpStateMachine';
export { VrrpOrchestrator } from './VrrpOrchestrator';
export { parseGreHeader, serializeGreHeader } from './tunneling/GreHeader';
export { decapGre, encapGre } from './tunneling/GreEncap';
export {
  parseMplsStack,
  popMplsLabel,
  pushMplsLabel,
  serializeMplsStack,
  swapMplsLabel,
} from './tunneling/MplsLabelStack';
export { convergeLdp } from './tunneling/MplsLdp';
export { installVpnv4Route, lookupVrfRoute } from './tunneling/MplsVrf';
export { parseVxlanHeader, serializeVxlanHeader } from './tunneling/VxlanHeader';
export { decapVxlan, encapVxlan, replicateBum } from './tunneling/VxlanEncap';
export { advertiseType2, advertiseType5, learnType2 } from './tunneling/EvpnControlPlane';
export { answerArpFromEvpnCache } from './tunneling/ArpSuppression';
