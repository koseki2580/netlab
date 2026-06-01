#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let api;
try {
  api = require('../dist/netlab.cjs.js');
} catch (error) {
  console.error('Run `npm run build` before `node scripts/bench-large-topology.mjs`.');
  throw error;
}

const { BranchedSimulationEngine, EditSession, HookEngine, SimulationEngine } = api;

const DEFAULT_PARAMETERS = Object.freeze({
  tcp: Object.freeze({ initialWindow: 65535, mss: 1460, rto: 1000 }),
  ospf: Object.freeze({ helloIntervalMs: 10000, deadIntervalMs: 40000 }),
  arp: Object.freeze({ cacheTtlMs: 1800000 }),
  engine: Object.freeze({ tickMs: 100, maxTtl: 64 }),
});

function makeTopology(size) {
  const nodes = Array.from({ length: size }, (_, index) => ({
    id: `node-${index}`,
    type: index === 0 ? 'client' : index === size - 1 ? 'server' : 'router',
    position: { x: (index % 20) * 120, y: Math.floor(index / 20) * 120 },
    data: {
      label: `N${index}`,
      role: index === 0 ? 'client' : index === size - 1 ? 'server' : 'router',
      layerId: index === 0 || index === size - 1 ? 'l7' : 'l3',
      ip: `10.${Math.floor(index / 255)}.${index % 255}.10`,
    },
  }));
  const edges = Array.from({ length: size - 1 }, (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    type: 'smoothstep',
  }));

  return { nodes, edges, areas: [], routeTables: new Map() };
}

function makeSnapshot(size) {
  const topology = makeTopology(size);
  const engine = new SimulationEngine(topology, new HookEngine(), { useMainThread: true });
  const state = engine.getState();
  const snapshot = {
    id: `bench-${size}`,
    capturedAt: state.currentStep,
    topology,
    state,
    parameters: DEFAULT_PARAMETERS,
    annotations: [],
    snapshotRegistry: [],
    orphanedSnapshotRegistry: [],
  };
  engine.dispose();
  return snapshot;
}

function makeSession(depth) {
  let session = EditSession.empty();
  for (let index = 0; index < depth; index += 1) {
    session = session.push({
      kind: 'param.set',
      key: index % 2 === 0 ? 'engine.tickMs' : 'engine.maxTtl',
      before: index % 2 === 0 ? 100 : 64,
      after: index % 2 === 0 ? 100 + (index % 200) : 32 + (index % 64),
    });
  }
  return session;
}

function measureFull(snapshot, session) {
  const runner = new BranchedSimulationEngine(snapshot, { checkpointEvery: 0 });
  const started = performance.now();
  runner.applyEdits(session);
  const elapsed = performance.now() - started;
  runner.dispose();
  return elapsed;
}

function measureCheckpoint(snapshot, session, interval = 10) {
  const runner = new BranchedSimulationEngine(snapshot, { checkpointEvery: interval });
  for (let index = interval; index < session.head; index += interval) {
    runner.applyEdits(session.goToHead(index));
  }

  const started = performance.now();
  runner.applyEdits(session);
  const elapsed = performance.now() - started;
  runner.dispose();
  return elapsed;
}

const rows = [];
for (const nodes of [50, 100, 200]) {
  const snapshot = makeSnapshot(nodes);
  for (const edits of [100, 500, 1000]) {
    const session = makeSession(edits);
    const full = measureFull(snapshot, session);
    const checkpoint = measureCheckpoint(snapshot, session);
    rows.push({
      nodes,
      requestedEdits: edits,
      visibleEdits: session.head,
      full,
      checkpoint,
      speedup: full / Math.max(checkpoint, 0.001),
    });
  }
}

console.log(
  '| Nodes | Requested edits | Visible head | Full replay ms | Checkpoint replay ms | Speedup |',
);
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const row of rows) {
  console.log(
    `| ${row.nodes} | ${row.requestedEdits} | ${row.visibleEdits} | ${row.full.toFixed(2)} | ${row.checkpoint.toFixed(2)} | ${row.speedup.toFixed(2)}x |`,
  );
}
