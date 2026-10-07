// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { gradeExercise } from '../grade/gradeExercise';
import { applyChanges } from '../model/settings';
import { DEV_TILL_ID } from '../devFixtures';
import { addressCandidates } from './candidates';
import { fixture } from './testSupport';

const till = fixture(DEV_TILL_ID);
const passesWith = async (ip: string) =>
  (await gradeExercise(till, applyChanges(till.start, [{ kind: 'host-ip', nodeId: 'pc1', ip }])))
    .passed;

describe('address chips for a host', () => {
  it('offers four addresses of which at least one works and at least one does not', async () => {
    const chips = addressCandidates(till.start, 'pc1', 0);
    expect(chips).toHaveLength(4);
    expect(new Set(chips).size).toBe(4);
    const outcomes = await Promise.all(chips.map(passesWith));
    expect(outcomes).toContain(true);
    expect(outcomes).toContain(false);
    // Exactly one chip works: every other one is a real mistake.
    expect(outcomes.filter(Boolean)).toHaveLength(1);
  });

  it('includes the mistakes a beginner makes: an address in use, another network', () => {
    const chips = addressCandidates(till.start, 'pc1', 0);
    // The simulator accepts the network's own address for a host, so it is not offered as wrong.
    expect(chips).not.toContain('192.168.1.0');
    expect(chips.some((chip) => ['192.168.1.11', '192.168.1.1'].includes(chip))).toBe(true);
    expect(chips.some((chip) => !chip.startsWith('192.168.1.'))).toBe(true);
    // Never the address the host has now: that is the one known not to work.
    expect(chips).not.toContain('192.168.2.50');
  });

  it('is the same for the same seed, and the order moves with the seed', () => {
    expect(addressCandidates(till.start, 'pc1', 7)).toEqual(
      addressCandidates(till.start, 'pc1', 7),
    );
    const firsts = new Set(
      Array.from({ length: 12 }, (_, seed) => {
        const chips = addressCandidates(till.start, 'pc1', seed);
        return chips.findIndex(
          (chip) =>
            chip.startsWith('192.168.1.') && !['192.168.1.11', '192.168.1.1'].includes(chip),
        );
      }),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('offers nothing where the network of the host cannot be told', () => {
    expect(addressCandidates({ nodes: till.start.nodes, edges: [], areas: [] }, 'pc1', 0)).toEqual(
      [],
    );
  });
});
