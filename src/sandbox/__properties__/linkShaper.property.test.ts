/**
 * @property-seed 0x5a4b12 link.shaper reducer validation.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { LinkShaperConfig } from '../../types/link';
import { EditSession } from '../EditSession';
import { fromEngine } from '../SimulationSnapshot';
import type { Edit } from '../edits';

const VALID_SHAPER: LinkShaperConfig = {
  classes: [
    { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
    { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
  ],
};

function snapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function edit(after: LinkShaperConfig | null): Edit {
  return {
    kind: 'link.shaper',
    target: { kind: 'edge', edgeId: 'e1' },
    before: null,
    after,
  };
}

function apply(after: LinkShaperConfig | null) {
  return EditSession.empty().push(edit(after)).apply(snapshot());
}

describe('link.shaper sandbox properties', () => {
  it('is idempotent for the same target and after config', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (depth) => {
        const after: LinkShaperConfig = {
          classes: VALID_SHAPER.classes.map((klass) => ({
            ...klass,
            queueDepthSegments: depth,
          })),
        };
        const once = EditSession.empty().push(edit(after)).apply(snapshot());
        const twice = EditSession.empty().push(edit(after)).push(edit(after)).apply(snapshot());

        expect(twice.topology.edges).toEqual(once.topology.edges);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it.each([
    [
      'link-shaper/no-default',
      { classes: [{ id: 'ef', dscp: [46], weightPct: 100, queueDepthSegments: 8 }] },
    ],
    [
      'link-shaper/multiple-defaults',
      {
        classes: [
          { id: 'a', dscp: [10], weightPct: 50, queueDepthSegments: 8, default: true },
          { id: 'b', dscp: [], weightPct: 50, queueDepthSegments: 8, default: true },
        ],
      },
    ],
    [
      'link-shaper/weight-out-of-range',
      {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 0, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 100, queueDepthSegments: 8, default: true },
        ],
      },
    ],
    [
      'link-shaper/weight-sum',
      {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 70, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    ],
    [
      'link-shaper/dscp-out-of-range',
      {
        classes: [
          { id: 'ef', dscp: [64], weightPct: 80, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    ],
    [
      'link-shaper/dscp-overlap',
      {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'voice', dscp: [46], weightPct: 10, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 10, queueDepthSegments: 8, default: true },
        ],
      },
    ],
    [
      'link-shaper/duplicate-class-id',
      {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'ef', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    ],
  ] satisfies readonly (readonly [string, LinkShaperConfig])[])(
    'rejects invalid configs with %s',
    (code, config) => {
      expect(() => apply(config)).toThrow(expect.objectContaining({ code }));
    },
  );

  it('removes only the shaper when after is null', () => {
    const withShaper = apply(VALID_SHAPER);
    const withoutShaper = EditSession.empty()
      .push(edit(VALID_SHAPER))
      .push(edit(null))
      .apply(snapshot());

    expect(withShaper.topology.edges[0]?.data?.link?.shaper).toEqual(VALID_SHAPER);
    expect(withoutShaper.topology.edges[0]?.data?.link?.shaper).toBeUndefined();
  });
});
