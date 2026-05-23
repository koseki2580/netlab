import { describe, expect, it } from 'vitest';
import { scenarioRegistry } from './index';
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
  it('registers the shipped built-in scenarios at repo boot', () => {
    expect(scenarioRegistry.list().map((scenario) => scenario.metadata.id)).toEqual([
      'basic-arp',
      'fragmented-echo',
      'tcp-handshake',
      'ospf-convergence',
      'rip-convergence',
      'stp-loop',
      'nat-basics',
    ]);
  });

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

  it('rejects scenario ids that are not kebab-case', () => {
    const registry = new ScenarioRegistry();

    expect(() => registry.register(makeScenario('Bad Id'))).toThrow(
      'scenario id must be kebab-case',
    );
  });

  it('rejects summaries longer than 140 characters', () => {
    const registry = new ScenarioRegistry();
    const scenario = makeScenario('too-long');

    expect(() =>
      registry.register({
        ...scenario,
        metadata: {
          ...scenario.metadata,
          summary: 'x'.repeat(141),
        },
      }),
    ).toThrow('scenario summary must be 140 characters or fewer');
  });

  it('returns a fresh list array for each call', () => {
    const registry = new ScenarioRegistry();
    registry.register(makeScenario('one'));

    expect(registry.list()).not.toBe(registry.list());
  });
});
