import { describe, expect, it } from 'vitest';

import { calculateSandboxRatios, formatSandboxBenchReport } from './bench-sandbox.mjs';

describe('sandbox bench reporting', () => {
  it('keeps raw beta cost visible while gating normalized per-branch overhead', () => {
    expect(calculateSandboxRatios({ alphaMs: 10, betaMs: 25 })).toEqual({
      rawRatio: 2.5,
      normalizedRatio: 1.25,
    });
  });

  it('prints the normalized ratio as the gate ratio', () => {
    const report = formatSandboxBenchReport({
      ticks: 500,
      nodeCount: 20,
      alphaMs: 10,
      betaMs: 25,
    });

    expect(report).toContain('raw ratio: 2.50x');
    expect(report).toContain('ratio: 1.25x');
  });
});
