/**
 * @property-seed 0x5a4b77 scenario-authoring property-suite seed.
 * @property-num-runs 25 keeps TypeScript source generation round-trips inside the unit-test budget.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EditSession } from '../../../sandbox/EditSession';
import type { SimulationSnapshot } from '../../../sandbox/types';
import type { NetlabNode } from '../../../types/topology';
import { DEFAULT_PARAMETERS } from '../../../sandbox/types';
import { exportScenarioFromSnapshot, parseExportedScenarioJson } from '../exporter';

const nodeIdArb = fc.constantFrom('host-a', 'host-b', 'router-r1');

const nodeArb = nodeIdArb.map(
  (id) =>
    ({
      id,
      type: id.startsWith('router') ? 'router' : 'client',
      position: { x: id.length * 10, y: id.length * 5 },
      data: { label: id, role: id.startsWith('router') ? 'router' : 'client', layerId: 'l7' },
    }) satisfies NetlabNode,
);

const parametersArb = fc.record({
  tcp: fc.record({
    initialWindow: fc.integer({ min: 1, max: 100000 }),
    mss: fc.integer({ min: 1, max: 9000 }),
    rto: fc.integer({ min: 1, max: 10000 }),
  }),
  ospf: fc.record({
    helloIntervalMs: fc.integer({ min: 1, max: 60000 }),
    deadIntervalMs: fc.integer({ min: 1, max: 120000 }),
  }),
  arp: fc.record({
    cacheTtlMs: fc.integer({ min: 1, max: 3600000 }),
  }),
  engine: fc.record({
    tickMs: fc.integer({ min: 1, max: 1000 }),
    maxTtl: fc.integer({ min: 1, max: 255 }),
  }),
});

function snapshot(nodes: SimulationSnapshot['topology']['nodes'], parameters = DEFAULT_PARAMETERS) {
  return {
    id: 'snapshot-property',
    capturedAt: 1,
    topology: {
      nodes,
      edges: [],
      areas: [],
      routeTables: new Map([
        [
          'generated',
          [
            {
              destination: '0.0.0.0/0',
              nextHop: 'direct',
              metric: 0,
              protocol: 'static',
              adminDistance: 1,
              nodeId: 'generated',
            },
          ],
        ],
      ]),
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
    parameters,
    annotations: [
      {
        id: 'annotation-1',
        traceEventId: 'trace-1:0',
        author: 'user',
        content: 'Round-trip note',
        createdAt: 1,
      },
    ],
    snapshotRegistry: [],
    orphanedSnapshotRegistry: [],
  } satisfies SimulationSnapshot;
}

describe('scenario export round-trip properties', () => {
  it('preserves topology, parameters, annotations, and preseed edits through JSON', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(nodeArb, { selector: (node) => node.id, minLength: 1, maxLength: 3 }),
        parametersArb,
        (nodes, parameters) => {
          const source = snapshot(nodes, parameters);
          const result = exportScenarioFromSnapshot(
            source,
            EditSession.empty().push({ kind: 'noop' }),
            {
              scenarioId: 'property-export',
              title: 'Property Export',
              summary: 'Property generated export.',
              includeAnnotations: true,
              preseedStrategy: 'as-delta',
            },
          );
          const parsed = parseExportedScenarioJson(result.json).scenario;

          expect(parsed.topology).toEqual(source.topology);
          expect(parsed.parameters).toEqual(parameters);
          expect(parsed.preseedEdits).toEqual([{ kind: 'noop' }]);
          expect(parsed.preseedAnnotations).toEqual([
            { ...source.annotations[0], author: 'scenario' },
          ]);
        },
      ),
      { seed: 0x5a4b77, numRuns: 25 },
    );
  });
});
