import { describe, expect, it } from 'vitest';

import {
  buildSoakScenario,
  evaluateSoakInvariants,
  formatSoakReport,
  runSyntheticSoak,
} from './soak-test.mjs';

describe('soak test harness', () => {
  it('builds the default plan/81p long-running scenario shape', () => {
    const scenario = buildSoakScenario();

    expect(scenario.routerCount).toBe(50);
    expect(scenario.clientCount).toBe(50);
    expect(scenario.edgeCount).toBe(200);
    expect(scenario.simulatedSteps).toBe(600_000);
    expect(scenario.qosLinkCount).toBe(50);
  });

  it('passes bounded invariant samples', () => {
    const scenario = buildSoakScenario({ edgeCount: 4, routerCount: 2 });
    const report = evaluateSoakInvariants({
      scenario,
      samples: [
        {
          heapUsedBytes: 100,
          linkQueueRegistrySize: 4,
          netflowCacheEntries: 200,
          flowCollectorRecords: 500,
          sandboxSnapshotCount: 6,
          sandboxEditCount: 5,
          localStorageWrites: 3,
          completionCount: 3,
          hookSubscribers: 2,
          openBroadcastChannels: 1,
          providerCount: 1,
        },
        {
          heapUsedBytes: 1024 * 1024,
          linkQueueRegistrySize: 4,
          netflowCacheEntries: 300,
          flowCollectorRecords: 600,
          sandboxSnapshotCount: 6,
          sandboxEditCount: 5,
          localStorageWrites: 3,
          completionCount: 3,
          hookSubscribers: 2,
          openBroadcastChannels: 1,
          providerCount: 1,
        },
      ],
    });

    expect(report.ok).toBe(true);
    expect(formatSoakReport(report)).toContain('soak invariants: PASS');
  });

  it('fails on memory growth or unbounded registries', () => {
    const scenario = buildSoakScenario({ edgeCount: 4, routerCount: 2 });
    const report = evaluateSoakInvariants({
      scenario,
      samples: [
        {
          heapUsedBytes: 0,
          linkQueueRegistrySize: 4,
          netflowCacheEntries: 1,
          flowCollectorRecords: 1,
          sandboxSnapshotCount: 1,
          sandboxEditCount: 0,
          localStorageWrites: 0,
          completionCount: 0,
          hookSubscribers: 2,
          openBroadcastChannels: 1,
          providerCount: 1,
        },
        {
          heapUsedBytes: 60 * 1024 * 1024,
          linkQueueRegistrySize: 5,
          netflowCacheEntries: 1,
          flowCollectorRecords: 1,
          sandboxSnapshotCount: 1,
          sandboxEditCount: 0,
          localStorageWrites: 0,
          completionCount: 0,
          hookSubscribers: 2,
          openBroadcastChannels: 1,
          providerCount: 1,
        },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.failures.map((failure) => failure.id)).toEqual([
      'heap-growth',
      'link-queue-registry',
    ]);
  });

  it('runs a deterministic synthetic soak without unbounded growth', () => {
    const report = runSyntheticSoak({ simulatedSteps: 1_000, sampleCount: 4 });

    expect(report.ok).toBe(true);
    expect(report.samples).toHaveLength(4);
  });
});
