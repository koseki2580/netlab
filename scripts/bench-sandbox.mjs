#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function makeTraceBackedState(topology, hopCount) {
  const hops = Array.from({ length: hopCount }, (_, index) => {
    const node = topology.nodes[index % topology.nodes.length];
    const nextEdge = topology.edges[index % Math.max(topology.edges.length, 1)];
    return {
      step: index,
      nodeId: node.id,
      nodeLabel: node.data.label,
      srcIp: '10.0.0.10',
      dstIp: `10.0.${topology.nodes.length - 1}.10`,
      ttl: 64 - (index % 64),
      protocol: 'ICMP',
      event: index === 0 ? 'create' : index === hopCount - 1 ? 'deliver' : 'forward',
      timestamp: index,
      ...(nextEdge ? { activeEdgeId: nextEdge.id } : {}),
    };
  });
  const trace = {
    packetId: 'bench-trace',
    srcNodeId: topology.nodes[0].id,
    dstNodeId: topology.nodes[topology.nodes.length - 1].id,
    hops,
    status: 'delivered',
  };

  return {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
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

export function calculateSandboxRatios({ alphaMs, betaMs }) {
  const rawRatio = betaMs / Math.max(alphaMs, 0.001);
  return {
    rawRatio,
    normalizedRatio: rawRatio / 2,
  };
}

export function formatSandboxBenchReport({ ticks, nodeCount, alphaMs, betaMs }) {
  const { rawRatio, normalizedRatio } = calculateSandboxRatios({ alphaMs, betaMs });
  return [
    `sandbox bench: ${ticks} trace-backed ticks, ${nodeCount}-node topology`,
    `alpha: ${alphaMs.toFixed(2)}ms`,
    `beta:  ${betaMs.toFixed(2)}ms`,
    `raw ratio: ${rawRatio.toFixed(2)}x`,
    `ratio: ${normalizedRatio.toFixed(2)}x`,
  ].join('\n');
}

function main() {
  const nodeCount = 20;
  const ticks = 5000;
  const topology = makeTopology(nodeCount);
  const engine = new SimulationEngine(topology, new HookEngine());
  engine.setState(makeTraceBackedState(topology, ticks));
  const snapshot = {
    id: 'bench',
    capturedAt: engine.getState().currentStep,
    topology,
    state: engine.getState(),
    parameters,
  };
  const alphaMs = run('alpha', snapshot, ticks);
  const betaMs = run('beta', snapshot, ticks);
  const { normalizedRatio } = calculateSandboxRatios({ alphaMs, betaMs });

  console.log(formatSandboxBenchReport({ ticks, nodeCount, alphaMs, betaMs }));

  if (normalizedRatio > 1.8) {
    console.warn(
      'normalized beta/alpha ratio exceeded 1.8x; file a bug note before treating this as a gate.',
    );
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const thisPath = fileURLToPath(import.meta.url);

if (invokedPath === thisPath) {
  main();
}
