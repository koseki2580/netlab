import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../types/simulation';
import { tcpThreeWay } from './tcp-three-way';

function makeState(labels: string[] = []): SimulationState {
  return {
    status: 'idle',
    traces: labels.map((label, index) => ({
      packetId: `trace-${index}`,
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      label,
      hops: [],
      status: 'delivered',
    })),
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };
}

describe('tcpThreeWay tutorial predicates', () => {
  it('detects SYN and SYN-ACK traces', () => {
    expect(tcpThreeWay.steps[0]?.predicate({ state: makeState(['TCP SYN']), events: [] })).toBe(
      true,
    );
    expect(
      tcpThreeWay.steps[1]?.predicate({ state: makeState(['TCP SYN', 'TCP SYN-ACK']), events: [] }),
    ).toBe(true);
  });

  it('requires all three handshake traces for the final step', () => {
    expect(
      tcpThreeWay.steps[2]?.predicate({
        state: makeState(['TCP SYN', 'TCP SYN-ACK', 'TCP ACK']),
        events: [],
      }),
    ).toBe(true);
    expect(
      tcpThreeWay.steps[2]?.predicate({ state: makeState(['TCP SYN', 'TCP SYN-ACK']), events: [] }),
    ).toBe(false);
  });
});
