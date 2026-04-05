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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
