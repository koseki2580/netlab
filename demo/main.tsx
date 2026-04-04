// Register layer plugins before any component renders (side-effect imports)
import '../src/layers/l1-physical/index';
import '../src/layers/l2-datalink/index';
import '../src/layers/l3-network/index';
import '../src/layers/l4-transport/index';
import '../src/layers/l7-application/index';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
