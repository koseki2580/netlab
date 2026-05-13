/**
 * @property-seed 0x5a4b12 plan/52 ARP table consistency property.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { topologyArb } from '../../testing/properties/arbitraries';
import { arpTableMatchesTopology } from '../../testing/properties/oracles';
import type { SimulationState } from '../../types/simulation';

function stateWithNeighborArp(
  topology: ReturnType<typeof topologyArb> extends fc.Arbitrary<infer T> ? T : never,
): SimulationState {
  const tables: Record<string, Record<string, string>> = {};
  for (const edge of topology.edges) {
    const source = topology.nodes.find((node) => node.id === edge.source);
    const target = topology.nodes.find((node) => node.id === edge.target);
    if (
      !source ||
      !target ||
      !source.data.ip ||
      !target.data.ip ||
      !source.data.mac ||
      !target.data.mac
    ) {
      continue;
    }
    tables[source.id] = { ...(tables[source.id] ?? {}), [target.data.ip]: target.data.mac };
    tables[target.id] = { ...(tables[target.id] ?? {}), [source.data.ip]: source.data.mac };
  }

  return {
    status: 'done',
    traces: [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'hop',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: tables,
    natTables: [],
    connTrackTables: [],
  };
}

describe('ARP properties', () => {
  it('accepts ARP tables whose entries point at directly connected interfaces', () => {
    fc.assert(
      fc.property(topologyArb(), (topology) => {
        expect(() =>
          arpTableMatchesTopology(stateWithNeighborArp(topology), topology),
        ).not.toThrow();
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
