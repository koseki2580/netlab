#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let api;
try {
  api = require('../dist/netlab.cjs.js');
} catch (error) {
  console.error('Run `npm run build` before `node scripts/bench-sandbox.mjs`.');
  throw error;
}

const { BranchedSimulationEngine, HookEngine, SimulationEngine } = api;

const parameters = Object.freeze({
  tcp: Object.freeze({ initialWindow: 65535, mss: 1460, rto: 1000 }),
  ospf: Object.freeze({ helloIntervalMs: 10000, deadIntervalMs: 40000 }),
  arp: Object.freeze({ cacheTtlMs: 1800000 }),
  engine: Object.freeze({ tickMs: 100, maxTtl: 64 }),
});

function makeTopology(size) {
  const nodes = Array.from({ length: size }, (_, index) => ({
    id: `node-${index}`,
    type: index === 0 ? 'client' : index === size - 1 ? 'server' : 'router',
    position: { x: index * 120, y: index % 2 === 0 ? 80 : 180 },
    data: {
      label: `N${index}`,
      role: index === 0 ? 'client' : index === size - 1 ? 'server' : 'router',
      layerId: index === 0 || index === size - 1 ? 'l7' : 'l3',
      ip: `10.0.${index}.10`,
    },
  }));
  const edges = Array.from({ length: size - 1 }, (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    type: 'smoothstep',
  }));

  return {
    nodes,
    edges,
    areas: [],
    routeTables: new Map(),
  };
}

function run(mode, snapshot, ticks) {
  const runner = new BranchedSimulationEngine(snapshot, { mode });
  const started = performance.now();
  for (let index = 0; index < ticks; index += 1) {
    runner.step();
  }
  const elapsed = performance.now() - started;
  runner.dispose();
  return elapsed;
}

const topology = makeTopology(20);
const engine = new SimulationEngine(topology, new HookEngine());
const snapshot = {
  id: 'bench',
  capturedAt: engine.getState().currentStep,
  topology,
  state: engine.getState(),
  parameters,
};
const ticks = 500;
const alphaMs = run('alpha', snapshot, ticks);
const betaMs = run('beta', snapshot, ticks);
const ratio = betaMs / Math.max(alphaMs, 0.001);

console.log(`sandbox bench: ${ticks} ticks, 20-node topology`);
console.log(`alpha: ${alphaMs.toFixed(2)}ms`);
console.log(`beta:  ${betaMs.toFixed(2)}ms`);
console.log(`ratio: ${ratio.toFixed(2)}x`);

if (ratio > 1.8) {
  console.warn('beta/alpha ratio exceeded 1.8x; file a bug note before treating this as a gate.');
}
