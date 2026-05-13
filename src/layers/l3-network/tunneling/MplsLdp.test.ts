import { describe, expect, it } from 'vitest';
import { convergeLdp } from './MplsLdp';

describe('MPLS LDP', () => {
  it('forms deterministic label mappings for a linear LSP', () => {
    const result = convergeLdp({
      routers: ['pe1', 'p1', 'pe2'],
      fec: '10.0.1.0/24',
      baseLabel: 16000,
    });

    expect(result.converged).toBe(true);
    expect(result.steps).toBeLessThanOrEqual(75);
    expect(result.mappings.map((mapping) => mapping.routerId)).toEqual(['pe1', 'p1', 'pe2']);
  });
});
