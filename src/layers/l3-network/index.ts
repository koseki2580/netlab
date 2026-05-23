import { registerLayerPlugin } from '../../registry/LayerRegistry';
import { protocolRegistry } from '../../registry/ProtocolRegistry';
import { inferRouteAddressFamily, routeResolutionKey } from '../../routing/AddressFamily';
import { BgpProtocol, bgpProtocol } from '../../routing/bgp/BgpProtocol';
import { decodeMpReachNlri, encodeMpReachNlri } from '../../routing/bgp/BgpMpReachNlri';
import { OspfProtocol, ospfProtocol } from '../../routing/ospf/OspfProtocol';
import { OspfV3Protocol, ospfV3Protocol } from '../../routing/ospf/OspfV3Protocol';
import { RipProtocol, ripProtocol } from '../../routing/rip/RipProtocol';
import { StaticProtocol, staticProtocol } from '../../routing/static/StaticProtocol';
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

for (const protocol of [staticProtocol, ospfProtocol, ospfV3Protocol, bgpProtocol, ripProtocol]) {
  if (!protocolRegistry.list().includes(protocol.name)) {
    protocolRegistry.register(protocol);
  }
}

export { BgpProtocol, bgpProtocol, decodeMpReachNlri, encodeMpReachNlri };
export type { MpReachNlri } from '../../routing/bgp/BgpMpReachNlri';
export { inferRouteAddressFamily, routeResolutionKey };
export type { AddressFamily, FamilyAware } from '../../routing/AddressFamily';
export { OspfProtocol, ospfProtocol, OspfV3Protocol, ospfV3Protocol };
export type {
  OspfV3Hello,
  OspfV3IntraAreaPrefixLsa,
  OspfV3LinkLsa,
} from '../../routing/ospf/OspfV3Protocol';
export { RipProtocol, ripProtocol, StaticProtocol, staticProtocol };
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
