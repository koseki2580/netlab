import { describe, expect, it } from 'vitest';
import { drawAt, splitmix64 } from './prng';

describe('splitmix64 deterministic PRNG', () => {
  it('returns a stable known sequence for a seed', () => {
    const rng = splitmix64(42n);

    expect([rng(), rng(), rng()].map((value) => Number(value.toFixed(12)))).toEqual([
      0.195895190218, 0.887507581837, 0.403672400774,
    ]);
  });

  it('drawAt is a pure function of seed and sequence', () => {
    expect(drawAt(7, 123)).toBe(drawAt(7, 123));
    expect(drawAt(7, 123)).not.toBe(drawAt(7, 124));
  });
});
