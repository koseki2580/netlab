import { describe, expect, it } from 'vitest';
import type { NatEntry } from '../../types/nat';
import type { NatTranslation, PacketHop, SimulationState } from '../../types/simulation';
import { natTranslation } from './nat-translation';

function hop(overrides: Partial<PacketHop> & { natTranslation?: NatTranslation }): PacketHop {
  return {
    step: 0,
    nodeId: 'nat-router',
    nodeLabel: 'R-Edge',
    srcIp: '192.168.1.10',
    dstIp: '198.51.100.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'forward',
    timestamp: 0,
    ...overrides,
  };
}

function snatTranslation(): NatTranslation {
  return {
    type: 'snat',
    preSrcIp: '192.168.1.10',
    preSrcPort: 54321,
    postSrcIp: '203.0.113.1',
    postSrcPort: 1024,
    preDstIp: '198.51.100.10',
    preDstPort: 80,
    postDstIp: '198.51.100.10',
    postDstPort: 80,
  };
}

function dnatTranslation(): NatTranslation {
  return {
    type: 'dnat',
    preSrcIp: '198.51.100.10',
    preSrcPort: 55000,
    postSrcIp: '198.51.100.10',
    postSrcPort: 55000,
    preDstIp: '203.0.113.1',
    preDstPort: 8080,
    postDstIp: '192.168.1.10',
    postDstPort: 80,
  };
}

function snatEntry(): NatEntry {
  return {
    id: 'nat-1',
    proto: 'tcp',
    type: 'snat',
    insideLocalIp: '192.168.1.10',
    insideLocalPort: 54321,
    insideGlobalIp: '203.0.113.1',
    insideGlobalPort: 1024,
    outsidePeerIp: '198.51.100.10',
    outsidePeerPort: 80,
    createdAt: 0,
    lastSeenAt: 0,
  };
}

function makeState(options: {
  hops?: PacketHop[];
  status?: SimulationState['traces'][number]['status'];
  natEntries?: NatEntry[];
}): SimulationState {
  return {
    status: 'idle',
    traces:
      options.hops && options.hops.length > 0
        ? [
            {
              packetId: 'trace-0',
              srcNodeId: 'client-1',
              dstNodeId: 'server-1',
              hops: options.hops,
              status: options.status ?? 'delivered',
            },
          ]
        : [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: options.natEntries ? [{ routerId: 'nat-router', entries: options.natEntries }] : [],
    connTrackTables: [],
  } as SimulationState;
}

const [snatStep, sessionStep, dnatStep] = natTranslation.steps;

describe('natTranslation tutorial predicates', () => {
  it('detects the outbound SNAT rewrite to the public address', () => {
    expect(
      snatStep?.predicate({
        state: makeState({ hops: [hop({ natTranslation: snatTranslation() })] }),
        events: [],
      }),
    ).toBe(true);

    // A plain forward with no translation does not satisfy the SNAT step.
    expect(
      snatStep?.predicate({
        state: makeState({ hops: [hop({})] }),
        events: [],
      }),
    ).toBe(false);
  });

  it('detects the tracked SNAT session in the edge router NAT table', () => {
    expect(
      sessionStep?.predicate({
        state: makeState({ natEntries: [snatEntry()] }),
        events: [],
      }),
    ).toBe(true);

    // An empty NAT table means the session has not been tracked yet.
    expect(sessionStep?.predicate({ state: makeState({}), events: [] })).toBe(false);
  });

  it('detects the delivered inbound DNAT port-forward to the internal host', () => {
    expect(
      dnatStep?.predicate({
        state: makeState({
          hops: [hop({ nodeId: 'nat-router', natTranslation: dnatTranslation() })],
          status: 'delivered',
        }),
        events: [],
      }),
    ).toBe(true);

    // DNAT translated but the packet was dropped before delivery.
    expect(
      dnatStep?.predicate({
        state: makeState({
          hops: [hop({ natTranslation: dnatTranslation() })],
          status: 'dropped',
        }),
        events: [],
      }),
    ).toBe(false);
  });
});
