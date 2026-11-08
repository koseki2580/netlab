import { withoutLazyChunks } from './scripts/size-gate.mjs';

/**
 * Eager checks: what a consumer downloads up front (docs/dev/size-gate.md).
 * Per-pack checks: one lazily loaded learn chunk, on its own (pure data, no imports).
 */
const eager = (check) => ({ gzip: true, modifyEsbuildConfig: withoutLazyChunks, ...check });
const pack = (id, limit) => eager({ name: `pack:${id}`, path: `dist/pack-${id}-*.mjs`, limit });

export default [
  eager({ path: 'dist/netlab.es.js', limit: '220 kB' }),
  eager({ name: 'ui:concept-check', path: 'dist/ConceptCheckPanelInner-*.mjs', limit: '110 kB' }),
  eager({ name: 'ui:graph-maxgraph', path: 'dist/MaxGraphEngineInner-*.mjs', limit: '138 kB' }),
  eager({ name: 'ui:drill-kit', path: 'dist/drillKit-*.mjs', limit: '28 kB' }),
  eager({ path: 'dist/layers/l1-physical/index.js', limit: '4 kB' }),
  eager({ path: 'dist/layers/l2-datalink/index.js', limit: '7.5 kB' }),
  eager({ path: 'dist/layers/l3-network/index.js', limit: '20 kB' }),
  eager({ path: 'dist/layers/l4-transport/index.js', limit: '8 kB' }),
  eager({ path: 'dist/layers/l7-application/index.js', limit: '5 kB' }),
  eager({ path: 'dist/protocols/tls/index.js', limit: '4 kB' }),
  eager({ path: 'dist/protocols/quic/index.js', limit: '3 kB' }),
  eager({ path: 'dist/protocols/http2/index.js', limit: '2 kB' }),
  eager({ path: 'dist/protocols/http3/index.js', limit: '2 kB' }),
  eager({ name: 'worker', path: 'dist/assets/worker.entry-*.js', limit: '46 kB' }),
  eager({ name: 'ui:simulation-context', path: 'dist/sandbox-mode-*.mjs', limit: '66 kB' }),
  eager({ name: 'ui:node-ports', path: 'dist/NodePorts-*.mjs', limit: '3 kB' }),
  eager({ name: 'ui:scenario-export', path: 'dist/ScenarioExportDialog-*.mjs', limit: '52 kB' }),
  pack('dns', '3.5 kB'),
  pack('gre', '3 kB'),
  pack('ntp', '3 kB'),
  pack('vxlan', '3 kB'),
  pack('ipv6', '3 kB'),
  pack('icmpv6', '3 kB'),
  pack('nd', '3 kB'),
];
