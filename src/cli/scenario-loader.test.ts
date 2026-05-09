import { describe, expect, it } from 'vitest';
import { loadScenario, listScenarioIds } from './scenario-loader';

describe('scenario-loader', () => {
  it('loads a built-in scenario by id', () => {
    const scenario = loadScenario('basic-arp');

    expect(scenario.metadata.title).toBe('ARP Basics');
    expect(scenario.topology.nodes.map((node) => node.id)).toContain('client-1');
  });

  it('lists the five initial built-in scenarios', () => {
    expect(listScenarioIds()).toEqual([
      'basic-arp',
      'fragmented-echo',
      'tcp-handshake',
      'ospf-convergence',
      'nat-basics',
    ]);
  });

  it('throws a useful error for unknown ids', () => {
    expect(() => loadScenario('missing')).toThrow(/unknown scenario: missing/);
  });
});
