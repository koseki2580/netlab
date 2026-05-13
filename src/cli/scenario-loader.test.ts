import { describe, expect, it } from 'vitest';
import { loadScenario, listScenarioIds } from './scenario-loader';

describe('scenario-loader', () => {
  it('loads a built-in scenario by id', () => {
    const scenario = loadScenario('basic-arp');

    expect(scenario.metadata.title).toBe('ARP Basics');
    expect(scenario.topology.nodes.map((node) => node.id)).toContain('client-1');
  });

  it('lists the shipped built-in scenarios', () => {
    expect(listScenarioIds()).toEqual([
      'basic-arp',
      'fragmented-echo',
      'tcp-handshake',
      'ospf-convergence',
      'stp-loop',
      'nat-basics',
    ]);
  });

  it('throws a useful error for unknown ids', () => {
    expect(() => loadScenario('missing')).toThrow(/unknown scenario: missing/);
  });
});
