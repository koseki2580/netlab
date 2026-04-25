import { describe, expect, it } from 'vitest';
import { natBasics, scenarioRegistry } from '.';

describe('natBasics scenario', () => {
  it('is registered as nat-basics with the NAT demo topology', () => {
    expect(natBasics.metadata.id).toBe('nat-basics');
    expect(scenarioRegistry.get('nat-basics')).toBe(natBasics);
    expect(natBasics.topology.nodes.some((node) => node.id === 'nat-router')).toBe(true);
    expect(natBasics.sampleFlows?.some((flow) => flow.from === 'server-1')).toBe(true);
  });
});
