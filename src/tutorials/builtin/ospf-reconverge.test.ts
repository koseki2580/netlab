import { describe, expect, it } from 'vitest';
import type { RouteEntry } from '../../types/routing';
import type { SimulationState } from '../../types/simulation';
import { ospfReconverge } from './ospf-reconverge';

function makeState(
  routeEntries: RouteEntry[] = [],
  traceOverrides: Partial<SimulationState['traces'][number]>[] = [],
): SimulationState {
  return {
    status: 'idle',
    traces: traceOverrides.map((trace, index) => ({
      packetId: `trace-${index}`,
      srcNodeId: 'c1',
      dstNodeId: 'c2',
      hops: [],
      status: 'delivered',
      ...trace,
    })),
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    tutorialRouteTable: { r1: routeEntries },
  } as SimulationState;
}

describe('ospfReconverge tutorial predicates', () => {
  it('detects the preferred and backup routes from the tutorial route table snapshot', () => {
    expect(
      ospfReconverge.steps[0]?.predicate({
        state: makeState([
          {
            nodeId: 'r1',
            destination: '10.4.0.0/24',
            nextHop: '10.0.12.2',
            metric: 2,
            protocol: 'ospf',
            adminDistance: 110,
          },
        ]),
        events: [],
      }),
    ).toBe(true);

    expect(
      ospfReconverge.steps[1]?.predicate({
        state: makeState([
          {
            nodeId: 'r1',
            destination: '10.4.0.0/24',
            nextHop: '10.0.13.2',
            metric: 4,
            protocol: 'ospf',
            adminDistance: 110,
          },
        ]),
        events: [],
      }),
    ).toBe(true);
  });

  it('detects the rerouted probe through R3', () => {
    expect(
      ospfReconverge.steps[2]?.predicate({
        state: makeState(
          [],
          [
            {
              hops: [
                {
                  step: 0,
                  nodeId: 'r1',
                  nodeLabel: 'R1',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 64,
                  protocol: 'TCP',
                  event: 'forward',
                  toNodeId: 'r3',
                  activeEdgeId: 'e-r1-r3',
                  timestamp: 0,
                },
                {
                  step: 1,
                  nodeId: 'r3',
                  nodeLabel: 'R3',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 63,
                  protocol: 'TCP',
                  event: 'forward',
                  timestamp: 1,
                },
              ],
            },
          ],
        ),
        events: [],
      }),
    ).toBe(true);
  });

  it('requires a delivered probe that reached R3 for the final step', () => {
    expect(
      ospfReconverge.steps[3]?.predicate({
        state: makeState(
          [],
          [
            {
              status: 'delivered',
              hops: [
                {
                  step: 0,
                  nodeId: 'r3',
                  nodeLabel: 'R3',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 63,
                  protocol: 'TCP',
                  event: 'forward',
                  timestamp: 1,
                },
              ],
            },
          ],
        ),
        events: [],
      }),
    ).toBe(true);

    expect(ospfReconverge.steps[3]?.predicate({ state: makeState(), events: [] })).toBe(false);
  });
});
