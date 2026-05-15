// Register layer plugins before any component renders (side-effect imports)
import '../src/layers/l1-physical/index';
import '../src/layers/l2-datalink/index';
import '../src/layers/l3-network/index';
import '../src/layers/l4-transport/index';
import '../src/layers/l7-application/index';

// Flow-v1 shared keyframes (page-fade-in / dp-slide-in / hint-pulse / orbit).
import '../src/components/animations.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProgressProvider } from '../src/progress';
import Gallery from './Gallery';
import DmzDemo from './areas/DmzDemo';
import MinimalDemo from './basic/MinimalDemo';
import StarDemo from './basic/StarDemo';
import ThreeTierDemo from './basic/ThreeTierDemo';
import AllInOneDemo from './comprehensive/AllInOneDemo';
import EditorDemo from './editor/EditorDemo';
import EnterpriseDemo from './enterprise/EnterpriseDemo';
import EmbedDemo from './embed/EmbedDemo';
import ArpDemo from './networking/ArpDemo';
import DscpDemo from './networking/DscpDemo';
import EcmpDemo from './networking/EcmpDemo';
import HttpDemo from './networking/HttpDemo';
import Http2Demo from './networking/Http2Demo';
import Http3Demo from './networking/Http3Demo';
import HttpsDemo from './networking/HttpsDemo';
import GreDemo from './networking/GreDemo';
import Dhcpv6SlaacDemo from './networking/Dhcpv6SlaacDemo';
import HighAvailabilityDemo from './networking/HighAvailabilityDemo';
import Ipv6Demo from './networking/Ipv6Demo';
import Ipv6RoutingDemo from './networking/Ipv6RoutingDemo';
import LinkQosDemo from './networking/LinkQosDemo';
import MtuFragmentationDemo from './networking/MtuFragmentationDemo';
import MulticastDemo from './networking/MulticastDemo';
import MplsL3vpnDemo from './networking/MplsL3vpnDemo';
import ObservabilityDemo from './networking/ObservabilityDemo';
import StpLoopDemo from './networking/StpLoopDemo';
import UdpDemo from './networking/UdpDemo';
import VlanDemo from './networking/VlanDemo';
import WirelessDemo from './networking/WirelessDemo';
import VxlanEvpnDemo from './networking/VxlanEvpnDemo';
import ClientServerDemo from './routing/ClientServerDemo';
import DynamicRoutingDemo from './routing/DynamicRoutingDemo';
import MultiHopDemo from './routing/MultiHopDemo';
import OspfConvergenceDemo from './routing/OspfConvergenceDemo';
import DhcpDnsDemo from './services/DhcpDnsDemo';
import AclDemo from './simulation/AclDemo';
import DataTransferDemo from './simulation/DataTransferDemo';
import FailureSimDemo from './simulation/FailureSimDemo';
import InterfaceAwareDemo from './simulation/InterfaceAwareDemo';
import NatDemo from './simulation/NatDemo';
import SessionDemo from './simulation/SessionDemo';
import StepSimDemo from './simulation/StepSimDemo';
import TcpCongestionDemo from './simulation/TcpCongestionDemo';
import TcpHandshakeDemo from './simulation/TcpHandshakeDemo';
import TraceInspectorDemo from './simulation/TraceInspectorDemo';
import ControlledTopologyDemo from './topology/ControlledTopologyDemo';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

function DemoRoutes() {
  const location = useLocation();
  const learnerId = new URLSearchParams(location.search).get('learnerId');

  return (
    <ProgressProvider learnerId={learnerId}>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/basic/minimal" element={<MinimalDemo />} />
        <Route path="/basic/three-tier" element={<ThreeTierDemo />} />
        <Route path="/basic/star" element={<StarDemo />} />
        <Route path="/routing/client-server" element={<ClientServerDemo />} />
        <Route path="/routing/dynamic" element={<DynamicRoutingDemo />} />
        <Route path="/routing/multi-hop" element={<MultiHopDemo />} />
        <Route path="/routing/ospf-convergence" element={<OspfConvergenceDemo />} />
        <Route path="/networking/arp" element={<ArpDemo />} />
        <Route path="/networking/vlan" element={<VlanDemo />} />
        <Route path="/networking/stp" element={<StpLoopDemo />} />
        <Route path="/networking/mtu-fragmentation" element={<MtuFragmentationDemo />} />
        <Route path="/networking/link-qos" element={<LinkQosDemo />} />
        <Route path="/networking/dscp" element={<DscpDemo />} />
        <Route path="/networking/ecmp" element={<EcmpDemo />} />
        <Route path="/networking/observability" element={<ObservabilityDemo />} />
        <Route path="/networking/udp" element={<UdpDemo />} />
        <Route path="/networking/http" element={<HttpDemo />} />
        <Route path="/networking/http2" element={<Http2Demo />} />
        <Route path="/networking/http3" element={<Http3Demo />} />
        <Route path="/networking/https" element={<HttpsDemo />} />
        <Route path="/networking/ipv6" element={<Ipv6Demo />} />
        <Route path="/networking/ipv6-routing" element={<Ipv6RoutingDemo />} />
        <Route path="/networking/dhcpv6" element={<Dhcpv6SlaacDemo />} />
        <Route path="/networking/ha" element={<HighAvailabilityDemo />} />
        <Route path="/networking/wireless" element={<WirelessDemo />} />
        <Route path="/networking/tunneling/gre" element={<GreDemo />} />
        <Route path="/networking/tunneling/mpls-l3vpn" element={<MplsL3vpnDemo />} />
        <Route path="/networking/tunneling/vxlan-evpn" element={<VxlanEvpnDemo />} />
        <Route path="/areas/dmz" element={<DmzDemo />} />
        <Route path="/networking/multicast" element={<MulticastDemo />} />
        <Route path="/services/dhcp-dns" element={<DhcpDnsDemo />} />
        <Route path="/editor" element={<EditorDemo />} />
        <Route path="/topology/controlled" element={<ControlledTopologyDemo />} />
        <Route path="/simulation/step" element={<StepSimDemo />} />
        <Route path="/simulation/failure" element={<FailureSimDemo />} />
        <Route path="/simulation/trace-inspector" element={<TraceInspectorDemo />} />
        <Route path="/simulation/nat" element={<NatDemo />} />
        <Route path="/simulation/acl" element={<AclDemo />} />
        <Route path="/simulation/interface-aware" element={<InterfaceAwareDemo />} />
        <Route path="/simulation/session" element={<SessionDemo />} />
        <Route path="/simulation/data-transfer" element={<DataTransferDemo />} />
        <Route path="/simulation/tcp-handshake" element={<TcpHandshakeDemo />} />
        <Route path="/simulation/tcp-congestion" element={<TcpCongestionDemo />} />
        <Route path="/simulation/enterprise" element={<EnterpriseDemo />} />
        <Route path="/embed" element={<EmbedDemo />} />
        <Route path="/comprehensive/all-in-one" element={<AllInOneDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProgressProvider>
  );
}

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <DemoRoutes />
    </HashRouter>
  </StrictMode>,
);
