import { describe, expect, it } from 'vitest';
import type { IpPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import {
  arpTableMatchesTopology,
  fragmentsReassembleToOriginal,
  routeDecisionIsLongestPrefix,
  stpGraphIsTree,
  tcpStateReachable,
  type TcpStateTransition,
} from './oracles';

function route(destination: string, metric = 1): RouteEntry {
  return {
    destination,
    nextHop: 'direct',
    metric,
    protocol: 'static',
    adminDistance: 1,
    nodeId: 'r1',
  };
}

const treeTopology: NetworkTopology = {
  nodes: [
    {
      id: 'sw1',
      type: 'switch',
      position: { x: 0, y: 0 },
      data: { label: 'SW1', role: 'switch', layerId: 'l2' },
    },
    {
      id: 'sw2',
      type: 'switch',
      position: { x: 1, y: 0 },
      data: { label: 'SW2', role: 'switch', layerId: 'l2' },
    },
    {
      id: 'sw3',
      type: 'switch',
      position: { x: 2, y: 0 },
      data: { label: 'SW3', role: 'switch', layerId: 'l2' },
    },
  ],
  edges: [
    { id: 'e1', source: 'sw1', target: 'sw2' },
    { id: 'e2', source: 'sw2', target: 'sw3' },
    { id: 'e3', source: 'sw1', target: 'sw3' },
  ],
  areas: [],
  routeTables: new Map(),
};

describe('property oracles', () => {
  it('accepts ARP entries for directly connected neighbors', () => {
    arpTableMatchesTopology(
      {
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
        nodeArpTables: { a: { '10.0.0.2': '02:00:00:00:00:02' } },
        natTables: [],
        connTrackTables: [],
      },
      {
        nodes: [
          {
            id: 'a',
            type: 'client',
            position: { x: 0, y: 0 },
            data: {
              label: 'A',
              role: 'client',
              layerId: 'l7',
              ip: '10.0.0.1',
              mac: '02:00:00:00:00:01',
            },
          },
          {
            id: 'b',
            type: 'server',
            position: { x: 1, y: 0 },
            data: {
              label: 'B',
              role: 'server',
              layerId: 'l7',
              ip: '10.0.0.2',
              mac: '02:00:00:00:00:02',
            },
          },
        ],
        edges: [{ id: 'e1', source: 'a', target: 'b' }],
        areas: [],
        routeTables: new Map(),
      },
    );
  });

  it('rejects ARP entries for non-neighbors', () => {
    expect(() =>
      arpTableMatchesTopology(
        {
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
          nodeArpTables: { a: { '10.0.0.99': '02:00:00:00:00:99' } },
          natTables: [],
          connTrackTables: [],
        },
        {
          nodes: [
            {
              id: 'a',
              type: 'client',
              position: { x: 0, y: 0 },
              data: {
                label: 'A',
                role: 'client',
                layerId: 'l7',
                ip: '10.0.0.1',
                mac: '02:00:00:00:00:01',
              },
            },
            {
              id: 'b',
              type: 'server',
              position: { x: 1, y: 0 },
              data: {
                label: 'B',
                role: 'server',
                layerId: 'l7',
                ip: '10.0.0.2',
                mac: '02:00:00:00:00:02',
              },
            },
          ],
          edges: [],
          areas: [],
          routeTables: new Map(),
        },
      ),
    ).toThrow('ARP table entry is not reachable');
  });

  it('accepts fragments that reassemble to the original payload', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const fragments: IpPacket[] = [
      {
        layer: 'L3',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        ttl: 64,
        protocol: 1,
        identification: 1,
        flags: { df: false, mf: false },
        fragmentOffset: 0,
        payload: { layer: 'raw', data: '\x01\x02\x03\x04' },
      },
    ];
    fragmentsReassembleToOriginal(original, fragments);
  });

  it('rejects fragments with the wrong payload', () => {
    expect(() =>
      fragmentsReassembleToOriginal(new Uint8Array([1, 2]), [
        {
          layer: 'L3',
          srcIp: '10.0.0.1',
          dstIp: '10.0.0.2',
          ttl: 64,
          protocol: 1,
          identification: 1,
          flags: { df: false, mf: false },
          fragmentOffset: 0,
          payload: { layer: 'raw', data: '\x01\x03' },
        },
      ]),
    ).toThrow('Fragments do not reassemble');
  });

  it('accepts the longest-prefix route', () => {
    routeDecisionIsLongestPrefix(
      [route('10.0.0.0/8'), route('10.1.2.0/24')],
      '10.1.2.9',
      route('10.1.2.0/24'),
    );
  });

  it('rejects a non-longest-prefix route', () => {
    expect(() =>
      routeDecisionIsLongestPrefix(
        [route('10.0.0.0/8'), route('10.1.2.0/24')],
        '10.1.2.9',
        route('10.0.0.0/8'),
      ),
    ).toThrow('Route decision is not longest-prefix');
  });

  it('accepts active STP edges that form a tree', () => {
    stpGraphIsTree(new Set(['e1', 'e2']), treeTopology);
  });

  it('rejects active STP edges with a cycle', () => {
    expect(() => stpGraphIsTree(new Set(['e1', 'e2', 'e3']), treeTopology)).toThrow(
      'STP active graph is not a tree',
    );
  });

  it('accepts canonical TCP handshake transitions', () => {
    const log: TcpStateTransition[] = [
      { from: 'CLOSED', event: 'ACTIVE_OPEN', to: 'SYN_SENT' },
      { from: 'SYN_SENT', event: 'SYN_ACK_RECEIVED', to: 'ESTABLISHED' },
    ];
    tcpStateReachable(log);
  });

  it('rejects impossible TCP transitions', () => {
    expect(() =>
      tcpStateReachable([{ from: 'CLOSED', event: 'ACK_RECEIVED', to: 'ESTABLISHED' }]),
    ).toThrow('TCP transition is not reachable');
  });
});
