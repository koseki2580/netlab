import { withoutLazyChunks } from './scripts/size-gate.mjs';

/**
 * Eager checks: what a consumer downloads up front (docs/dev/size-gate.md).
 * Per-pack checks: one lazily loaded learn chunk, on its own (pure data, no imports).
 */
const eager = (check) => ({ gzip: true, modifyEsbuildConfig: withoutLazyChunks, ...check });
const concept = (locale, chunk, limit) =>
  eager({
    name: `concept:${locale}:${chunk}`,
    path: `dist/concept-${locale}-${chunk}-*.mjs`,
    limit,
  });
/** [chunk, en limit, ja limit]: measured + ~10 % (docs/dev/size-gate.md). */
const CONCEPT_CHUNK_LIMITS = [
  ['core', '1.4 kB', '1.8 kB'],
  ['fundamentals', '6.5 kB', '7.8 kB'],
  ['l2', '6.6 kB', '7.8 kB'],
  ['l3', '8.4 kB', '9.9 kB'],
  ['l4', '3 kB', '3.7 kB'],
  ['l5', '5.2 kB', '6.3 kB'],
  ['l7web', '3.7 kB', '4.5 kB'],
  ['l7apps', '5.9 kB', '7.2 kB'],
  ['routing', '4.3 kB', '5.2 kB'],
];
const pack = (id, limit) => eager({ name: `pack:${id}`, path: `dist/pack-${id}-*.mjs`, limit });

export default [
  eager({ path: 'dist/netlab.es.js', limit: '220 kB' }),
  // The concept checks' strings, en and ja alike, in chunks loaded only when a view needs them
  // (REQ-365): core (panel strings, deck names), then one chunk per group of decks.
  ...CONCEPT_CHUNK_LIMITS.flatMap(([chunk, en, ja]) => [
    concept('en', chunk, en),
    concept('ja', chunk, ja),
  ]),
  // 26.3 kB once its English strings moved into the concept chunks.
  eager({ name: 'ui:concept-check', path: 'dist/ConceptCheckPanelInner-*.mjs', limit: '29 kB' }),
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
  // The terminal's commands, loaded when one first runs (REQ-361). 7.5 kB after ss -l/-u/-a
  // (REQ-418) and curl's limits and escaping (REQ-419); still loaded only on the first command.
  eager({ name: 'ui:terminal', path: 'dist/terminalCommands-*.mjs', limit: '8 kB' }),
  // The Japanese words, loaded only for a Japanese page (REQ-356).
  eager({ name: 'locale:ja', path: 'dist/locales/ja.js', limit: '25 kB' }),
  eager({ name: 'ui:scenario-export', path: 'dist/ScenarioExportDialog-*.mjs', limit: '52 kB' }),
  pack('dns', '3.5 kB'),
  pack('gre', '3 kB'),
  pack('ntp', '3 kB'),
  pack('vxlan', '3 kB'),
  pack('mpls', '3 kB'),
  pack('ipv6', '3 kB'),
  pack('icmpv6', '3 kB'),
  pack('nd', '3 kB'),
];
