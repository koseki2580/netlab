import { check, format, type Options } from 'prettier';
import { describe, expect, it } from 'vitest';
import type { EditSession } from '../../sandbox/EditSession';
import { EditSession as Session } from '../../sandbox/EditSession';
import type { SimulationSnapshot } from '../../sandbox/types';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { ospfConvergence } from '../ospf-convergence';
import { exportScenarioFromSnapshot, parseExportedScenarioJson } from './exporter';

const prettierOptions: Options = {
  parser: 'typescript',
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
};

function snapshot(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    id: 'snapshot-1',
    capturedAt: 1,
    topology: {
      nodes: [
        {
          id: 'client-1',
          type: 'client',
          position: { x: 10, y: 20 },
          data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
        },
        {
          id: 'server-1',
          type: 'server',
          position: { x: 300, y: 20 },
          data: { label: 'Server', role: 'server', layerId: 'l7', ip: '10.0.0.20' },
        },
      ],
      edges: [{ id: 'edge-1', source: 'client-1', target: 'server-1' }],
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

function exportFrom(
  overrides: Partial<SimulationSnapshot> = {},
  session: EditSession = Session.empty(),
) {
  return exportScenarioFromSnapshot(snapshot(overrides), session, {
    scenarioId: 'exported-lab',
    title: 'Exported Lab',
    summary: 'A state promoted from the sandbox.',
    includeAnnotations: false,
    preseedStrategy: 'as-initial',
  });
}

describe('exportScenarioFromSnapshot', () => {
  it('exports snapshot topology and parameters as the initial TypeScript scenario', async () => {
    const result = exportFrom();

    expect(result.ts).toContain("import type { Scenario } from './types';");
    expect(result.ts).toContain('export const exportedLab: Scenario = {');
    expect(result.ts).toContain("id: 'exported-lab'");
    expect(result.ts).toContain("title: 'Exported Lab'");
    expect(result.ts).toContain('parameters: {');
    expect(result.ts).not.toContain('preseedEdits');
    expect(result.ts).not.toContain('preseedAnnotations');
    await expect(check(result.ts, prettierOptions)).resolves.toBe(true);
  });

  it('exports a serializable JSON companion that round-trips map-backed topology', () => {
    const result = exportFrom({
      topology: {
        nodes: [],
        edges: [],
        areas: [],
        routeTables: new Map([
          [
            'router-1',
            [
              {
                destination: '0.0.0.0/0',
                nextHop: 'direct',
                metric: 0,
                protocol: 'static',
                adminDistance: 1,
                nodeId: 'router-1',
              },
            ],
          ],
        ]),
      },
    });

    const parsed = parseExportedScenarioJson(result.json);

    expect(parsed.scenario.metadata.id).toBe('exported-lab');
    expect(parsed.scenario.topology.routeTables.get('router-1')).toEqual([
      {
        destination: '0.0.0.0/0',
        nextHop: 'direct',
        metric: 0,
        protocol: 'static',
        adminDistance: 1,
        nodeId: 'router-1',
      },
    ]);
    expect(parsed.scenario.parameters).toEqual(DEFAULT_PARAMETERS);
  });

  it('includes annotations only when explicitly requested and normalizes them as scenario-authored', () => {
    const result = exportScenarioFromSnapshot(
      snapshot({
        annotations: [
          {
            id: 'annotation-1',
            traceEventId: 'trace-1:0',
            author: 'user',
            content: 'Useful packet boundary',
            createdAt: 10,
          },
        ],
      }),
      Session.empty(),
      {
        scenarioId: 'annotated-lab',
        title: 'Annotated Lab',
        summary: 'Includes instructor notes.',
        includeAnnotations: true,
        preseedStrategy: 'as-initial',
      },
    );

    const parsed = parseExportedScenarioJson(result.json);

    expect(parsed.scenario.preseedAnnotations).toEqual([
      {
        id: 'annotation-1',
        traceEventId: 'trace-1:0',
        author: 'scenario',
        content: 'Useful packet boundary',
        createdAt: 10,
      },
    ]);
  });

  it('stores only visible edits when exporting as a delta', () => {
    const session = Session.empty()
      .push({ kind: 'noop' })
      .push({ kind: 'param.set', key: 'engine.maxTtl', before: 64, after: 32 })
      .undo();

    const result = exportScenarioFromSnapshot(snapshot(), session, {
      scenarioId: 'delta-lab',
      title: 'Delta Lab',
      summary: 'Replays a prepared edit.',
      includeAnnotations: false,
      preseedStrategy: 'as-delta',
    });
    const parsed = parseExportedScenarioJson(result.json);

    expect(parsed.scenario.preseedEdits).toEqual([{ kind: 'noop' }]);
    expect(parsed.scenario.authoring).toEqual({ preseedStrategy: 'as-delta' });
    expect(result.ts).toContain("preseedStrategy: 'as-delta'");
  });

  it('serializes the same authoring strategy in TypeScript and JSON exports', () => {
    const result = exportScenarioFromSnapshot(snapshot(), Session.empty(), {
      scenarioId: 'initial-authoring-lab',
      title: 'Initial Authoring Lab',
      summary: 'Keeps authoring metadata in both artifacts.',
      includeAnnotations: false,
      preseedStrategy: 'as-initial',
    });

    expect(result.ts).toContain("authoring: {\n    preseedStrategy: 'as-initial'");
    expect(parseExportedScenarioJson(result.json).scenario.authoring).toEqual({
      preseedStrategy: 'as-initial',
    });
  });

  it('references an existing rubric source scenario instead of cloning rubric content', () => {
    const result = exportScenarioFromSnapshot(snapshot(), Session.empty(), {
      scenarioId: 'rubric-lab',
      title: 'Rubric Lab',
      summary: 'Keeps a rubric by reference.',
      includeAnnotations: false,
      preseedStrategy: 'as-initial',
      attachRubricId: ospfConvergence.assessmentRubric!.id,
    });

    expect(result.ts).toContain("import { scenarioRegistry } from './ScenarioRegistry';");
    expect(result.ts).toContain("scenarioRegistry.get('ospf-convergence')!.assessmentRubric!");
    expect(result.ts).not.toContain(ospfConvergence.assessmentRubric?.goal ?? 'unreachable');
    expect(JSON.parse(result.json)).toMatchObject({ assessmentRubricId: 'ospf-backup-path' });
    expect(result.warnings).toContain(
      'assessment rubric ospf-backup-path is referenced through scenario ospf-convergence',
    );
  });

  it('rejects unsupported values instead of silently serializing them as null', () => {
    expect(() =>
      exportScenarioFromSnapshot(
        snapshot({
          topology: {
            nodes: [
              {
                id: 'client-1',
                type: 'client',
                position: { x: 10, y: 20 },
                data: {
                  label: 'Client',
                  role: 'client',
                  layerId: 'l7',
                  unsupported: BigInt(1),
                },
              },
            ],
            edges: [],
            areas: [],
            routeTables: new Map(),
          },
        }),
        Session.empty(),
        {
          scenarioId: 'unsupported-lab',
          title: 'Unsupported Lab',
          summary: 'Contains unsupported data.',
          includeAnnotations: false,
          preseedStrategy: 'as-initial',
        },
      ),
    ).toThrow('unsupported scenario export value at scenario.topology.nodes[0].data.unsupported');
  });

  it('validates parsed scenario JSON before returning a typed payload', () => {
    expect(() => parseExportedScenarioJson('{"schemaVersion":2,"scenario":{}}')).toThrow(
      'unsupported scenario export schema: 2',
    );
    expect(() => parseExportedScenarioJson('{"schemaVersion":1}')).toThrow(
      'invalid scenario export JSON',
    );
  });

  it('emits TypeScript that remains stable after Prettier formatting', async () => {
    const result = exportFrom();
    const formatted = await format(result.ts, prettierOptions);

    expect(result.ts).toBe(formatted);
  });
});
