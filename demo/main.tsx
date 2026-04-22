// Register layer plugins before any component renders (side-effect imports)
import '../src/layers/l1-physical/index';
import '../src/layers/l2-datalink/index';
import '../src/layers/l3-network/index';
import '../src/layers/l4-transport/index';
import '../src/layers/l7-application/index';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import HttpDemo from './networking/HttpDemo';
import MtuFragmentationDemo from './networking/MtuFragmentationDemo';
import MulticastDemo from './networking/MulticastDemo';
import StpLoopDemo from './networking/StpLoopDemo';
import UdpDemo from './networking/UdpDemo';
import VlanDemo from './networking/VlanDemo';
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
import TcpHandshakeDemo from './simulation/TcpHandshakeDemo';
import TraceInspectorDemo from './simulation/TraceInspectorDemo';
import ControlledTopologyDemo from './topology/ControlledTopologyDemo';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <HashRouter>
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
        <Route path="/networking/udp" element={<UdpDemo />} />
        <Route path="/networking/http" element={<HttpDemo />} />
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
        <Route path="/simulation/enterprise" element={<EnterpriseDemo />} />
        <Route path="/embed" element={<EmbedDemo />} />
        <Route path="/comprehensive/all-in-one" element={<AllInOneDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
