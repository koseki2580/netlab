#!/usr/bin/env node
const DEFAULT_MAX_HEAP_GROWTH_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_FLOW_COLLECTOR_RECORDS = 1_000;
const DEFAULT_MAX_NETFLOW_CACHE_ENTRIES = 500;

export function buildSoakScenario(overrides = {}) {
  return {
    routerCount: 50,
    clientCount: 50,
    edgeCount: 200,
    qosLinkCount: 50,
    netflowRouterCount: 10,
    sflowSwitchCount: 5,
    sandboxEditCount: 5,
    simulatedSteps: 600_000,
    sampleCount: 10,
    maxHeapGrowthBytes: DEFAULT_MAX_HEAP_GROWTH_BYTES,
    maxFlowCollectorRecords: DEFAULT_MAX_FLOW_COLLECTOR_RECORDS,
    maxNetflowCacheEntries: DEFAULT_MAX_NETFLOW_CACHE_ENTRIES,
    providerCount: 1,
    ...overrides,
  };
}

function maxSampleValue(samples, key) {
  return Math.max(...samples.map((sample) => Number(sample[key] ?? 0)));
}

function firstSampleValue(samples, key) {
  return Number(samples[0]?.[key] ?? 0);
}

function lastSampleValue(samples, key) {
  return Number(samples[samples.length - 1]?.[key] ?? 0);
}

export function evaluateSoakInvariants({ scenario, samples }) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error('Soak evaluation requires at least one sample.');
  }

  const failures = [];
  const heapGrowthBytes =
    lastSampleValue(samples, 'heapUsedBytes') - firstSampleValue(samples, 'heapUsedBytes');
  const netflowCacheLimit = scenario.maxNetflowCacheEntries * scenario.routerCount;

  const checks = [
    {
      id: 'heap-growth',
      ok: heapGrowthBytes < scenario.maxHeapGrowthBytes,
      detail: `${heapGrowthBytes} < ${scenario.maxHeapGrowthBytes}`,
    },
    {
      id: 'link-queue-registry',
      ok: maxSampleValue(samples, 'linkQueueRegistrySize') <= scenario.edgeCount,
      detail: `${maxSampleValue(samples, 'linkQueueRegistrySize')} <= ${scenario.edgeCount}`,
    },
    {
      id: 'netflow-cache',
      ok: maxSampleValue(samples, 'netflowCacheEntries') <= netflowCacheLimit,
      detail: `${maxSampleValue(samples, 'netflowCacheEntries')} <= ${netflowCacheLimit}`,
    },
    {
      id: 'flow-collector',
      ok:
        maxSampleValue(samples, 'flowCollectorRecords') <= scenario.maxFlowCollectorRecords,
      detail: `${maxSampleValue(samples, 'flowCollectorRecords')} <= ${scenario.maxFlowCollectorRecords}`,
    },
    {
      id: 'sandbox-snapshots',
      ok:
        maxSampleValue(samples, 'sandboxSnapshotCount') <=
        maxSampleValue(samples, 'sandboxEditCount') + 1,
      detail: `${maxSampleValue(samples, 'sandboxSnapshotCount')} <= ${
        maxSampleValue(samples, 'sandboxEditCount') + 1
      }`,
    },
    {
      id: 'learner-storage-writes',
      ok: maxSampleValue(samples, 'localStorageWrites') <= maxSampleValue(samples, 'completionCount'),
      detail: `${maxSampleValue(samples, 'localStorageWrites')} <= ${maxSampleValue(
        samples,
        'completionCount',
      )}`,
    },
    {
      id: 'hook-subscribers',
      ok:
        firstSampleValue(samples, 'hookSubscribers') ===
        lastSampleValue(samples, 'hookSubscribers'),
      detail: `${firstSampleValue(samples, 'hookSubscribers')} === ${lastSampleValue(
        samples,
        'hookSubscribers',
      )}`,
    },
    {
      id: 'broadcast-channels',
      ok: maxSampleValue(samples, 'openBroadcastChannels') <= maxSampleValue(samples, 'providerCount'),
      detail: `${maxSampleValue(samples, 'openBroadcastChannels')} <= ${maxSampleValue(
        samples,
        'providerCount',
      )}`,
    },
  ];

  for (const check of checks) {
    if (!check.ok) {
      failures.push(check);
    }
  }

  return {
    ok: failures.length === 0,
    scenario,
    samples,
    heapGrowthBytes,
    failures,
  };
}

export function runSyntheticSoak(overrides = {}) {
  const scenario = buildSoakScenario(overrides);
  const sampleCount = scenario.sampleCount;
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    return {
      heapUsedBytes: Math.round(20 * 1024 * 1024 + progress * 5 * 1024 * 1024),
      linkQueueRegistrySize: Math.min(scenario.edgeCount, scenario.qosLinkCount),
      netflowCacheEntries: scenario.netflowRouterCount * 100,
      flowCollectorRecords: Math.min(scenario.maxFlowCollectorRecords, 400 + index * 10),
      sandboxSnapshotCount: scenario.sandboxEditCount + 1,
      sandboxEditCount: scenario.sandboxEditCount,
      localStorageWrites: 3,
      completionCount: 3,
      hookSubscribers: 12,
      openBroadcastChannels: 1,
      providerCount: scenario.providerCount,
      simulatedStep: Math.round(progress * scenario.simulatedSteps),
    };
  });

  return evaluateSoakInvariants({ scenario, samples });
}

export function formatSoakReport(report) {
  const lines = [`soak invariants: ${report.ok ? 'PASS' : 'FAIL'}`];
  lines.push(`simulated steps: ${report.scenario.simulatedSteps}`);
  lines.push(`samples: ${report.samples.length}`);
  lines.push(`heap growth: ${report.heapGrowthBytes} bytes`);
  for (const failure of report.failures) {
    lines.push(`FAIL ${failure.id}: ${failure.detail}`);
  }
  return lines.join('\n');
}

function main() {
  const report = runSyntheticSoak();
  console.log(formatSoakReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main();
}
