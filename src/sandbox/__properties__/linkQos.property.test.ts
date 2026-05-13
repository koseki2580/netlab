/**
 * @property-seed 0x5a4b12 plan/81a link.qos reducer idempotency.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { LinkQosConfig } from '../../types/link';
import { EditSession } from '../EditSession';
import { fromEngine } from '../SimulationSnapshot';
import type { Edit } from '../edits';

const qosArb = fc.record({
  bandwidthBps: fc.option(fc.integer({ min: 1, max: 10_000_000 }), { nil: undefined }),
  propagationDelayMs: fc.option(fc.integer({ min: 0, max: 250 }), { nil: undefined }),
  lossPct: fc.constant(0),
  queueDepthSegments: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  lossSeed: fc.option(fc.integer({ min: 0, max: 10_000 }), { nil: undefined }),
});

function snapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function edit(after: LinkQosConfig): Edit {
  return {
    kind: 'link.qos',
    target: { kind: 'edge', edgeId: 'e1' },
    before: null,
    after,
  };
}

function compact(value: {
  readonly bandwidthBps: number | undefined;
  readonly propagationDelayMs: number | undefined;
  readonly lossPct: number;
  readonly queueDepthSegments: number | undefined;
  readonly lossSeed: number | undefined;
}): LinkQosConfig {
  const config: {
    bandwidthBps?: number;
    propagationDelayMs?: number;
    lossPct?: number;
    queueDepthSegments?: number;
    lossSeed?: number;
  } = { lossPct: value.lossPct };
  if (value.bandwidthBps !== undefined) config.bandwidthBps = value.bandwidthBps;
  if (value.propagationDelayMs !== undefined) config.propagationDelayMs = value.propagationDelayMs;
  if (value.queueDepthSegments !== undefined) config.queueDepthSegments = value.queueDepthSegments;
  if (value.lossSeed !== undefined) config.lossSeed = value.lossSeed;
  return config;
}

describe('link.qos sandbox properties', () => {
  it('is idempotent for the same target and after config', () => {
    fc.assert(
      fc.property(qosArb, (after) => {
        const qos = compact(after);
        const once = EditSession.empty().push(edit(qos)).apply(snapshot());
        const twice = EditSession.empty().push(edit(qos)).push(edit(qos)).apply(snapshot());

        expect(twice.topology.edges).toEqual(once.topology.edges);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
