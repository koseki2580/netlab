import { describe, expect, it } from 'vitest';
import { ScenarioRegistry } from './ScenarioRegistry';
import type { Scenario } from './types';

function makeScenario(id: string): Scenario {
  return {
    metadata: {
      id,
      title: `Scenario ${id}`,
      summary: 'summary',
      objective: 'objective',
      difficulty: 'intro',
      protocols: ['ipv4'],
      prerequisiteIds: [],
    },
    topology: {
      nodes: [],
      edges: [],
      areas: [],
      routeTables: new Map(),
    },
  };
}

describe('ScenarioRegistry', () => {
  it('registers and retrieves a scenario by id', () => {
    const registry = new ScenarioRegistry();
    const scenario = makeScenario('basic-arp');

    registry.register(scenario);

    expect(registry.get('basic-arp')).toBe(scenario);
  });

  it('lists registered scenarios in registration order', () => {
    const registry = new ScenarioRegistry();
    const first = makeScenario('one');
    const second = makeScenario('two');

    registry.register(first);
    registry.register(second);

    expect(registry.list()).toEqual([first, second]);
  });

  it('throws on duplicate ids', () => {
    const registry = new ScenarioRegistry();
    registry.register(makeScenario('duplicate'));

    expect(() => registry.register(makeScenario('duplicate'))).toThrow('duplicate scenario id');
  });

  it('returns undefined for an unknown id', () => {
    const registry = new ScenarioRegistry();

    expect(registry.get('missing')).toBeUndefined();
  });
});
