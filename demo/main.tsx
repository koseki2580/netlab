// Register layer plugins before any component renders (side-effect imports)
import '../src/layers/l1-physical/index';
import '../src/layers/l2-datalink/index';
import '../src/layers/l3-network/index';
import '../src/layers/l4-transport/index';
import '../src/layers/l7-application/index';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Gallery from './Gallery';
import MinimalDemo from './basic/MinimalDemo';
import ThreeTierDemo from './basic/ThreeTierDemo';
import StarDemo from './basic/StarDemo';
import ClientServerDemo from './routing/ClientServerDemo';
import MultiHopDemo from './routing/MultiHopDemo';
import DmzDemo from './areas/DmzDemo';
import EditorDemo from './editor/EditorDemo';
import ControlledTopologyDemo from './topology/ControlledTopologyDemo';
import StepSimDemo from './simulation/StepSimDemo';
import FailureSimDemo from './simulation/FailureSimDemo';
import TraceInspectorDemo from './simulation/TraceInspectorDemo';
import InterfaceAwareDemo from './simulation/InterfaceAwareDemo';
import SessionDemo from './simulation/SessionDemo';
import EmbedDemo from './embed/EmbedDemo';

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
        <Route path="/routing/multi-hop" element={<MultiHopDemo />} />
        <Route path="/areas/dmz" element={<DmzDemo />} />
        <Route path="/editor" element={<EditorDemo />} />
        <Route path="/topology/controlled" element={<ControlledTopologyDemo />} />
        <Route path="/simulation/step" element={<StepSimDemo />} />
        <Route path="/simulation/failure" element={<FailureSimDemo />} />
        <Route path="/simulation/trace-inspector" element={<TraceInspectorDemo />} />
        <Route path="/simulation/interface-aware" element={<InterfaceAwareDemo />} />
        <Route path="/simulation/session" element={<SessionDemo />} />
        <Route path="/embed" element={<EmbedDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
