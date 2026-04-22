import { describe, expect, it } from 'vitest';
import type { InFlightPacket } from '../types/packets';
import type { PacketHop, SimulationState } from '../types/simulation';
import { countPcapRecords, makePacket } from './__fixtures__/helpers';
import { TraceRecorder } from './TraceRecorder';

describe('TraceRecorder', () => {
  it('appends a hop and snapshot with the provided step counter', () => {
    const recorder = new TraceRecorder();
    const packet = makePacket('trace-hop', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];

    const nextStep = recorder.appendHop(
      hops,
      snapshots,
      {
        nodeId: 'client-1',
        nodeLabel: 'Client',
        srcIp: '10.0.0.10',
        dstIp: '203.0.113.10',
        ttl: 64,
        protocol: 'TCP',
        event: 'create',
        toNodeId: 'server-1',
        activeEdgeId: 'edge-1',
        timestamp: 1000,
      },
      packet,
      0,
    );

    expect(nextStep).toBe(1);
    expect(hops).toEqual([
      expect.objectContaining({
        step: 0,
        nodeId: 'client-1',
        event: 'create',
      }),
    ]);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual(packet);
    expect(snapshots[0]).not.toBe(packet);
  });

  it('builds a dropped trace and derives the label from the packet payload', () => {
    const recorder = new TraceRecorder();
    const packet = makePacket('trace-drop', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    packet.frame.payload.payload = {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 1,
      ack: 0,
      flags: {
        syn: false,
        ack: true,
        fin: false,
        rst: false,
        psh: true,
        urg: false,
      },
      payload: {
        layer: 'L7',
        httpVersion: 'HTTP/1.1',
        method: 'GET',
        url: 'https://example.test',
        headers: {},
      },
    };

    const trace = recorder.emitDropTrace(packet, 'dns-resolution-failed', 'Client');

    expect(trace.status).toBe('dropped');
    expect(trace.label).toBe('HTTP GET');
    expect(trace.hops).toEqual([
      expect.objectContaining({
        step: 0,
        nodeId: 'client-1',
        nodeLabel: 'Client',
        event: 'drop',
        reason: 'dns-resolution-failed',
      }),
    ]);
  });

  it('exports recorded trace snapshots as a PCAP payload', () => {
    const recorder = new TraceRecorder();
    const packet = makePacket('trace-pcap', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    recorder.setSnapshots(packet.id, [packet]);

    const trace = {
      packetId: packet.id,
      srcNodeId: packet.srcNodeId,
      dstNodeId: packet.dstNodeId,
      status: 'delivered' as const,
      hops: [
        {
          step: 0,
          nodeId: 'client-1',
          nodeLabel: 'Client',
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          ttl: 64,
          protocol: 'TCP',
          event: 'create' as const,
          toNodeId: 'server-1',
          activeEdgeId: 'edge-1',
          timestamp: packet.timestamp,
        },
      ],
    };

    const bytes = recorder.exportPcap([trace], packet.id);

    expect(bytes.length).toBeGreaterThan(24);
    expect(countPcapRecords(bytes)).toBe(1);
  });

  it('merges secondary precompute results with step offsets and merged ARP tables', () => {
    const recorder = new TraceRecorder();
    const primaryPacket = makePacket(
      'trace-merge-primary',
      'client-1',
      'server-1',
      '10.0.0.10',
      '203.0.113.10',
    );
    const secondaryPacket = makePacket(
      'trace-merge-secondary',
      'server-1',
      'client-1',
      '203.0.113.10',
      '10.0.0.10',
    );

    const merged = recorder.mergeResults(
      {
        trace: {
          packetId: primaryPacket.id,
          srcNodeId: primaryPacket.srcNodeId,
          dstNodeId: primaryPacket.dstNodeId,
          status: 'delivered',
          hops: [
            {
              step: 0,
              nodeId: 'client-1',
              nodeLabel: 'Client',
              srcIp: '10.0.0.10',
              dstIp: '203.0.113.10',
              ttl: 64,
              protocol: 'TCP',
              event: 'create',
              timestamp: 1,
            },
          ],
        },
        nodeArpTables: { 'client-1': { '203.0.113.10': 'aa:aa:aa:aa:aa:aa' } },
        snapshots: [primaryPacket],
      },
      {
        trace: {
          packetId: secondaryPacket.id,
          srcNodeId: secondaryPacket.srcNodeId,
          dstNodeId: secondaryPacket.dstNodeId,
          status: 'delivered',
          hops: [
            {
              step: 0,
              nodeId: 'server-1',
              nodeLabel: 'Server',
              srcIp: '203.0.113.10',
              dstIp: '10.0.0.10',
              ttl: 64,
              protocol: 'TCP',
              event: 'deliver',
              timestamp: 2,
            },
          ],
        },
        nodeArpTables: { 'server-1': { '10.0.0.10': 'bb:bb:bb:bb:bb:bb' } },
        snapshots: [secondaryPacket],
      },
    );

    expect(merged.trace.hops.map((hop) => hop.step)).toEqual([0, 1]);
    expect(merged.nodeArpTables).toEqual({
      'client-1': { '203.0.113.10': 'aa:aa:aa:aa:aa:aa' },
      'server-1': { '10.0.0.10': 'bb:bb:bb:bb:bb:bb' },
    });
    expect(merged.snapshots).toHaveLength(2);
  });

  it('stores and returns snapshots by packet id', () => {
    const recorder = new TraceRecorder();
    const packet = makePacket(
      'trace-snapshots',
      'client-1',
      'server-1',
      '10.0.0.10',
      '203.0.113.10',
    );

    recorder.setSnapshots(packet.id, [packet]);

    expect(recorder.getSnapshots(packet.id)).toEqual([packet]);
    expect(recorder.getSnapshots('missing')).toEqual([]);
  });

  it('initializes full-path highlight state and trace colors when appending a trace', () => {
    const recorder = new TraceRecorder();
    const state = {
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
    } as unknown as SimulationState;

    const nextState = recorder.appendTrace(
      state,
      {
        packetId: 'trace-highlight',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [
          {
            step: 0,
            nodeId: 'client-1',
            nodeLabel: 'Client',
            srcIp: '10.0.0.10',
            dstIp: '203.0.113.10',
            ttl: 64,
            protocol: 'TCP',
            event: 'create',
            activeEdgeId: 'e1',
            timestamp: 1,
          },
          {
            step: 1,
            nodeId: 'router-1',
            nodeLabel: 'Router',
            srcIp: '10.0.0.10',
            dstIp: '203.0.113.10',
            ttl: 63,
            protocol: 'TCP',
            event: 'forward',
            activeEdgeId: 'e2',
            timestamp: 2,
          },
          {
            step: 2,
            nodeId: 'router-1',
            nodeLabel: 'Router',
            srcIp: '10.0.0.10',
            dstIp: '203.0.113.10',
            ttl: 62,
            protocol: 'TCP',
            event: 'forward',
            activeEdgeId: 'e1',
            timestamp: 3,
          },
        ],
      },
      {},
      (nodeArpTables) => nodeArpTables,
    );

    expect(nextState).toMatchObject({
      status: 'paused',
      currentTraceId: 'trace-highlight',
      activeEdgeIds: [],
      activePathEdgeIds: ['e1', 'e2'],
      highlightMode: 'path',
      traceColors: {
        'trace-highlight': 'var(--netlab-accent-cyan)',
      },
    });
  });
});
