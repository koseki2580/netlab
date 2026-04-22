import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../types/simulation';
import { fragmentationRoundtrip } from './fragmentation-roundtrip';

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
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
    ...overrides,
  };
}

function hop(action?: 'fragment' | 'reassembly-complete') {
  return {
    step: 0,
    nodeId: 'router-r1',
    nodeLabel: 'R1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'ICMP',
    event: 'forward' as const,
    timestamp: 0,
    ...(action ? { action } : {}),
  };
}

describe('fragmentationRoundtrip tutorial predicates', () => {
  it('detects the initial trace', () => {
    expect(
      fragmentationRoundtrip.steps[0]?.predicate({
        state: makeState({
          traces: [
            { packetId: 't1', srcNodeId: 'a', dstNodeId: 'b', hops: [], status: 'delivered' },
          ],
        }),
        events: [],
      }),
    ).toBe(true);
    expect(fragmentationRoundtrip.steps[0]?.predicate({ state: makeState(), events: [] })).toBe(
      false,
    );
  });

  it('detects fragmentation and reassembly actions', () => {
    const state = makeState({
      traces: [
        {
          packetId: 't1',
          srcNodeId: 'a',
          dstNodeId: 'b',
          status: 'delivered',
          hops: [hop('fragment'), hop('reassembly-complete')],
        },
      ],
    });

    expect(fragmentationRoundtrip.steps[1]?.predicate({ state, events: [] })).toBe(true);
    expect(fragmentationRoundtrip.steps[2]?.predicate({ state, events: [] })).toBe(true);
  });

  it('detects the delivered terminal trace', () => {
    expect(
      fragmentationRoundtrip.steps[3]?.predicate({
        state: makeState({
          traces: [
            { packetId: 't1', srcNodeId: 'a', dstNodeId: 'b', hops: [hop()], status: 'delivered' },
          ],
        }),
        events: [],
      }),
    ).toBe(true);
    expect(fragmentationRoundtrip.steps[3]?.predicate({ state: makeState(), events: [] })).toBe(
      false,
    );
  });
});
