import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../types/simulation';
import { arpBasics } from './arp-basics';

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'idle',
    traces: [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    ...overrides,
  };
}

describe('arpBasics tutorial predicates', () => {
  it('detects the first trace', () => {
    expect(
      arpBasics.steps[0]?.predicate({
        state: makeState({
          traces: [
            { packetId: 't1', srcNodeId: 'a', dstNodeId: 'b', hops: [], status: 'delivered' },
          ],
        }),
        events: [],
      }),
    ).toBe(true);
    expect(arpBasics.steps[0]?.predicate({ state: makeState(), events: [] })).toBe(false);
  });

  it('detects arp-request hops', () => {
    expect(
      arpBasics.steps[1]?.predicate({
        state: makeState({
          traces: [
            {
              packetId: 't1',
              srcNodeId: 'a',
              dstNodeId: 'b',
              status: 'delivered',
              hops: [
                {
                  step: 0,
                  nodeId: 'client-1',
                  nodeLabel: 'Client',
                  srcIp: '10.0.0.10',
                  dstIp: '203.0.113.10',
                  ttl: 64,
                  protocol: 'ARP',
                  event: 'arp-request',
                  timestamp: 0,
                },
              ],
            },
          ],
        }),
        events: [],
      }),
    ).toBe(true);
    expect(arpBasics.steps[1]?.predicate({ state: makeState(), events: [] })).toBe(false);
  });

  it('detects populated arp tables', () => {
    expect(
      arpBasics.steps[2]?.predicate({
        state: makeState({ nodeArpTables: { 'client-1': { '10.0.0.1': '00:00:00:01:00:00' } } }),
        events: [],
      }),
    ).toBe(true);
    expect(arpBasics.steps[2]?.predicate({ state: makeState(), events: [] })).toBe(false);
  });
});
