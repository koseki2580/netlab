import { describe, expect, it } from 'vitest';
import { ScenarioRegistry } from '../ScenarioRegistry';
import type { Scenario } from '../types';
import { validateScenarioExport } from './validator';
import { DEFAULT_PARAMETERS, type SimulationSnapshot } from '../../sandbox/types';

function scenario(id: string): Scenario {
  return {
    metadata: {
      id,
      title: id,
      summary: id,
      objective: id,
      difficulty: 'intro',
      protocols: [],
      prerequisiteIds: [],
    },
    topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
  };
}

function scenarioWithRubric(id: string, rubricId: string): Scenario {
  return {
    ...scenario(id),
    assessmentRubric: {
      id: rubricId,
      goal: 'Reachability survives a failure.',
      subgoals: [],
      constraints: [],
    },
  };
}

function snapshot(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    id: 'snapshot-1',
    capturedAt: 1,
    topology: {
      nodes: [
        {
          id: 'a',
          type: 'client',
          position: { x: 0, y: 0 },
          data: { label: 'A', role: 'client', layerId: 'l7' },
        },
        {
          id: 'b',
          type: 'server',
          position: { x: 100, y: 0 },
          data: { label: 'B', role: 'server', layerId: 'l7' },
        },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
      areas: [],
      routeTables: new Map(),
    },
    state: {
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds: [],
      activePathEdgeIds: [],
      highlightMode: 'path',
      traceColors: {},
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
      natTables: [],
      connTrackTables: [],
    },
    parameters: DEFAULT_PARAMETERS,
    annotations: [],
    snapshotRegistry: [],
    orphanedSnapshotRegistry: [],
    ...overrides,
  };
}

describe('validateScenarioExport', () => {
  it('accepts a valid scenario export request', () => {
    expect(
      validateScenarioExport(snapshot(), {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Valid metadata.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
      }).valid,
    ).toBe(true);
  });

  it('rejects non kebab-case scenario ids', () => {
    const result = validateScenarioExport(snapshot(), {
      scenarioId: 'New Scenario',
      title: 'New Scenario',
      summary: 'Invalid id.',
      includeAnnotations: false,
      preseedStrategy: 'as-initial',
    });

    expect(result.errors).toContain('scenarioId must be kebab-case');
  });

  it('rejects duplicate scenario ids in the supplied registry', () => {
    const registry = new ScenarioRegistry();
    registry.register(scenario('new-scenario'));

    const result = validateScenarioExport(
      snapshot(),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Duplicate id.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
      },
      { registry },
    );

    expect(result.errors).toContain('scenarioId already exists: new-scenario');
  });

  it('rejects empty title and summary metadata', () => {
    const result = validateScenarioExport(snapshot(), {
      scenarioId: 'new-scenario',
      title: ' ',
      summary: '',
      includeAnnotations: false,
      preseedStrategy: 'as-initial',
    });

    expect(result.errors).toEqual(
      expect.arrayContaining(['title is required', 'summary is required']),
    );
  });

  it('rejects duplicate node and edge ids', () => {
    const result = validateScenarioExport(
      snapshot({
        topology: {
          nodes: [
            {
              id: 'a',
              type: 'client',
              position: { x: 0, y: 0 },
              data: { label: 'A', role: 'client', layerId: 'l7' },
            },
            {
              id: 'a',
              type: 'server',
              position: { x: 100, y: 0 },
              data: { label: 'A2', role: 'server', layerId: 'l7' },
            },
          ],
          edges: [
            { id: 'e1', source: 'a', target: 'a' },
            { id: 'e1', source: 'a', target: 'a' },
          ],
          areas: [],
          routeTables: new Map(),
        },
      }),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Duplicate topology ids.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
      },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining(['duplicate node id: a', 'duplicate edge id: e1']),
    );
  });

  it('rejects edges that reference missing nodes', () => {
    const result = validateScenarioExport(
      snapshot({
        topology: {
          nodes: [],
          edges: [{ id: 'e1', source: 'missing-a', target: 'missing-b' }],
          areas: [],
          routeTables: new Map(),
        },
      }),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Dangling edge.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
      },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        'edge e1 source node is missing: missing-a',
        'edge e1 target node is missing: missing-b',
      ]),
    );
  });

  it('rejects non-positive protocol parameters', () => {
    const result = validateScenarioExport(
      snapshot({
        parameters: { ...DEFAULT_PARAMETERS, engine: { ...DEFAULT_PARAMETERS.engine, maxTtl: 0 } },
      }),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Bad parameters.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
      },
    );

    expect(result.errors).toContain('parameter engine.maxTtl must be positive');
  });

  it('rejects unsupported HTML-like annotation markup when annotations are included', () => {
    const result = validateScenarioExport(
      snapshot({
        annotations: [
          {
            id: 'a1',
            traceEventId: 'trace-1:0',
            author: 'user',
            content: '<script>alert(1)</script>',
            createdAt: 0,
          },
        ],
      }),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Bad annotation.',
        includeAnnotations: true,
        preseedStrategy: 'as-initial',
      },
    );

    expect(result.errors).toContain('annotation a1 contains unsupported markup');
  });

  it('rejects unknown rubric ids', () => {
    const result = validateScenarioExport(snapshot(), {
      scenarioId: 'new-scenario',
      title: 'New Scenario',
      summary: 'Bad rubric.',
      includeAnnotations: false,
      preseedStrategy: 'as-initial',
      attachRubricId: 'missing-rubric',
    });

    expect(result.errors).toContain('rubric id is not registered: missing-rubric');
  });

  it('rejects rubric ids that match multiple source scenarios', () => {
    const registry = new ScenarioRegistry();
    registry.register(scenarioWithRubric('rubric-source-a', 'shared-rubric'));
    registry.register(scenarioWithRubric('rubric-source-b', 'shared-rubric'));

    const result = validateScenarioExport(
      snapshot(),
      {
        scenarioId: 'new-scenario',
        title: 'New Scenario',
        summary: 'Ambiguous rubric.',
        includeAnnotations: false,
        preseedStrategy: 'as-initial',
        attachRubricId: 'shared-rubric',
      },
      { registry },
    );

    expect(result.errors).toContain(
      'rubric id is ambiguous: shared-rubric (rubric-source-a, rubric-source-b)',
    );
  });
});
