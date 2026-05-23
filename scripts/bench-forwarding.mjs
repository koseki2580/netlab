#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const DEFAULT_BASELINE = 'scripts/bench-results/forwarding.json';
const DEFAULT_OPTIONS = Object.freeze({
  routerCount: 10,
  packetsPerSample: 180,
  samples: 5,
  warmupPackets: 30,
  tolerance: 0.15,
});

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS, baselinePath: DEFAULT_BASELINE, updateBaseline: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--update-baseline') {
      options.updateBaseline = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    if (key === '--baseline') options.baselinePath = value;
    else if (key === '--router-count') options.routerCount = Number(value);
    else if (key === '--packets') options.packetsPerSample = Number(value);
    else if (key === '--samples') options.samples = Number(value);
    else if (key === '--warmup') options.warmupPackets = Number(value);
    else if (key === '--tolerance') options.tolerance = Number(value);
    else throw new Error(`Unknown option: ${key}`);
    index += 1;
  }
  return options;
}

function mac(index, suffix = 0) {
  return `02:00:00:${index.toString(16).padStart(2, '0')}:00:${suffix
    .toString(16)
    .padStart(2, '0')}`;
}

function route(nodeId, destination, nextHop) {
  return {
    nodeId,
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
  };
}

export function buildForwardingTopology(routerCount = DEFAULT_OPTIONS.routerCount) {
  const nodes = [
    {
      id: 'client-0',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
        mac: mac(0, 10),
      },
    },
  ];
  const edges = [];
  const routeTables = new Map();
  const serverNetwork = `10.${routerCount}.0.0/24`;

  for (let index = 0; index < routerCount; index += 1) {
    const interfaces =
      index === 0
        ? [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: mac(index + 1, 0),
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: `10.${index + 1}.0.1`,
              prefixLength: 24,
              macAddress: mac(index + 1, 1),
            },
          ]
        : [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: `10.${index}.0.2`,
              prefixLength: 24,
              macAddress: mac(index + 1, 0),
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: `10.${index + 1}.0.1`,
              prefixLength: 24,
              macAddress: mac(index + 1, 1),
            },
          ];

    nodes.push({
      id: `router-${index}`,
      type: 'router',
      position: { x: (index + 1) * 160, y: index % 2 === 0 ? 0 : 80 },
      data: {
        label: `R${index}`,
        role: 'router',
        layerId: 'l3',
        interfaces,
      },
    });

    routeTables.set(`router-${index}`, [
      route(`router-${index}`, index === 0 ? '10.0.0.0/24' : `10.${index}.0.0/24`, 'direct'),
      route(`router-${index}`, `10.${index + 1}.0.0/24`, 'direct'),
      route(
        `router-${index}`,
        serverNetwork,
        index === routerCount - 1 ? 'direct' : `10.${index + 1}.0.2`,
      ),
    ]);
  }

  nodes.push({
    id: 'server-0',
    type: 'server',
    position: { x: (routerCount + 1) * 160, y: 0 },
    data: {
      label: 'Server',
      role: 'server',
      layerId: 'l7',
      ip: `10.${routerCount}.0.10`,
      mac: mac(routerCount + 1, 10),
    },
  });

  edges.push({ id: 'edge-client-router-0', source: 'client-0', target: 'router-0' });
  for (let index = 0; index < routerCount - 1; index += 1) {
    edges.push({
      id: `edge-router-${index}-${index + 1}`,
      source: `router-${index}`,
      target: `router-${index + 1}`,
    });
  }
  edges.push({
    id: `edge-router-${routerCount - 1}-server`,
    source: `router-${routerCount - 1}`,
    target: 'server-0',
  });

  return { nodes, edges, areas: [], routeTables };
}

function makePacket(index, routerCount) {
  const srcPort = 20000 + (index % 2000);
  return {
    id: `bench-${index}`,
    srcNodeId: 'client-0',
    dstNodeId: 'server-0',
    currentDeviceId: 'client-0',
    ingressPortId: '',
    path: [],
    timestamp: index,
    frame: {
      layer: 'L2',
      srcMac: mac(0, 10),
      dstMac: mac(1, 0),
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.10',
        dstIp: `10.${routerCount}.0.10`,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort: 443,
          seq: index,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function runPacketSet(engine, routerCount, packets) {
  for (let index = 0; index < packets; index += 1) {
    const trace = await engine.precompute(makePacket(index, routerCount));
    if (trace.status !== 'delivered') {
      throw new Error(`Benchmark packet ${index} was not delivered: ${trace.status}`);
    }
  }
}

export async function runForwardingBenchmark(api, options = DEFAULT_OPTIONS) {
  const sampleOpsPerSecond = [];

  for (let sample = 0; sample < options.samples; sample += 1) {
    const topology = buildForwardingTopology(options.routerCount);
    const engine = new api.SimulationEngine(topology, new api.HookEngine(), {
      useMainThread: true,
      traceDetailLevel: 'metadata-only',
    });

    let elapsedMs;
    try {
      await runPacketSet(engine, options.routerCount, options.warmupPackets);
      const started = performance.now();
      await runPacketSet(engine, options.routerCount, options.packetsPerSample);
      elapsedMs = performance.now() - started;
    } finally {
      engine.dispose();
    }

    sampleOpsPerSecond.push((options.packetsPerSample / elapsedMs) * 1000);
  }

  return {
    scenario: `${options.routerCount}-router-chain-precompute`,
    routerCount: options.routerCount,
    packetsPerSample: options.packetsPerSample,
    samples: options.samples,
    warmupPackets: options.warmupPackets,
    medianOpsPerSecond: median(sampleOpsPerSecond),
    sampleOpsPerSecond,
  };
}

export function createBaseline(result, tolerance = DEFAULT_OPTIONS.tolerance) {
  return {
    schemaVersion: 1,
    scenario: result.scenario,
    routerCount: result.routerCount,
    packetsPerSample: result.packetsPerSample,
    samples: result.samples,
    warmupPackets: result.warmupPackets,
    tolerance,
    baselineOpsPerSecond: Number(result.medianOpsPerSecond.toFixed(2)),
    minOpsPerSecond: Number((result.medianOpsPerSecond * (1 - tolerance)).toFixed(2)),
    updatedAt: new Date().toISOString(),
  };
}

export function evaluateBenchmark(result, baseline) {
  return {
    passed: result.medianOpsPerSecond >= baseline.minOpsPerSecond,
    deltaPercent:
      ((result.medianOpsPerSecond - baseline.baselineOpsPerSecond) /
        baseline.baselineOpsPerSecond) *
      100,
  };
}

export function formatForwardingReport(result, baseline, evaluation) {
  return [
    `forwarding bench: ${result.scenario}`,
    `median: ${result.medianOpsPerSecond.toFixed(2)} packets/sec`,
    `samples: ${result.sampleOpsPerSecond.map((value) => value.toFixed(2)).join(', ')}`,
    `baseline: ${baseline.baselineOpsPerSecond.toFixed(2)} packets/sec`,
    `floor: ${baseline.minOpsPerSecond.toFixed(2)} packets/sec`,
    `delta: ${evaluation.deltaPercent.toFixed(2)}%`,
    `status: ${evaluation.passed ? 'pass' : 'fail'}`,
  ].join('\n');
}

async function readBaseline(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeBaseline(path, baseline) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const require = createRequire(import.meta.url);
  let api;
  try {
    api = require('../dist/netlab.cjs.js');
    require('../dist/layers/l3-network/index.cjs.js');
  } catch (error) {
    console.error('Run `npm run build` before `node scripts/bench-forwarding.mjs`.');
    throw error;
  }

  const result = await runForwardingBenchmark(api, options);
  const baselinePath = resolve(options.baselinePath);

  if (options.updateBaseline) {
    const baseline = createBaseline(result, options.tolerance);
    await writeBaseline(baselinePath, baseline);
    console.log(formatForwardingReport(result, baseline, evaluateBenchmark(result, baseline)));
    console.log(`updated baseline: ${options.baselinePath}`);
    return;
  }

  const baseline = await readBaseline(baselinePath);
  const evaluation = evaluateBenchmark(result, baseline);
  console.log(formatForwardingReport(result, baseline, evaluation));
  if (!evaluation.passed) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const thisPath = fileURLToPath(import.meta.url);

if (invokedPath === thisPath) {
  main();
}
