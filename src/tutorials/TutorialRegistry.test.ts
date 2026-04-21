import { describe, expect, it } from 'vitest';
import { ScenarioRegistry } from '../scenarios';
import type { Tutorial } from './types';
import { TutorialRegistry } from './TutorialRegistry';

function makeRegistry() {
  const scenarios = new ScenarioRegistry();
  scenarios.register({
    metadata: {
      id: 'basic-arp',
      title: 'ARP',
      summary: 'summary',
      objective: 'objective',
      difficulty: 'intro',
      protocols: ['arp'],
      prerequisiteIds: [],
    },
    topology: {
      nodes: [],
      edges: [],
      areas: [],
      routeTables: new Map(),
    },
  });

  return new TutorialRegistry(scenarios);
}

function makeTutorial(overrides: Partial<Tutorial> = {}): Tutorial {
  return {
    id: 'arp-basics',
    scenarioId: 'basic-arp',
    title: 'ARP Basics',
    summary: 'summary',
    difficulty: 'intro',
    steps: [
      {
        id: 'step-1',
        title: 'Observe',
        description: 'Observe something',
        predicate: () => false,
      },
    ],
    ...overrides,
  };
}

describe('TutorialRegistry', () => {
  it('registers and retrieves a tutorial', () => {
    const registry = makeRegistry();
    const tutorial = makeTutorial();

    registry.register(tutorial);

    expect(registry.get('arp-basics')).toBe(tutorial);
  });

  it('lists tutorials in registration order', () => {
    const registry = makeRegistry();
    const first = makeTutorial();
    const second = makeTutorial({ id: 'fragmentation-roundtrip' });

    registry.register(first);
    registry.register(second);

    expect(registry.list()).toEqual([first, second]);
  });

  it('finds a tutorial by scenario id', () => {
    const registry = makeRegistry();
    const tutorial = makeTutorial();

    registry.register(tutorial);

    expect(registry.findByScenarioId('basic-arp')).toBe(tutorial);
  });

  it('throws on duplicate tutorial ids', () => {
    const registry = makeRegistry();
    registry.register(makeTutorial());

    expect(() => registry.register(makeTutorial())).toThrow('duplicate tutorial id');
  });

  it('throws when the scenario id is unknown', () => {
    const registry = makeRegistry();

    expect(() =>
      registry.register(makeTutorial({ id: 'bad-scenario', scenarioId: 'missing' })),
    ).toThrow('unknown tutorial scenario id');
  });

  it('throws when steps are empty', () => {
    const registry = makeRegistry();

    expect(() => registry.register(makeTutorial({ steps: [] }))).toThrow(
      'must define between 1 and 12 steps',
    );
  });

  it('throws when a tutorial has too many steps', () => {
    const registry = makeRegistry();
    const steps = Array.from({ length: 13 }, (_, index) => ({
      id: `step-${index}`,
      title: `Step ${index}`,
      description: 'desc',
      predicate: () => false,
    }));

    expect(() => registry.register(makeTutorial({ steps }))).toThrow(
      'must define between 1 and 12 steps',
    );
  });

  it('throws when a step is missing a predicate', () => {
    const registry = makeRegistry();
    const tutorial = {
      ...makeTutorial(),
      steps: [
        {
          id: 'broken-step',
          title: 'Broken',
          description: 'desc',
        },
      ],
    } as unknown as Tutorial;

    expect(() => registry.register(tutorial)).toThrow('tutorial must match Tutorial shape');
  });
});
