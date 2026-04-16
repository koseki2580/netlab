import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkSession } from '../../types/session';
import type { PacketHop } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { SessionDetail } from './SessionDetail';

const netlabMock = vi.hoisted(() => ({
  topology: {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology,
}));

const sessionMock = vi.hoisted(() => ({
  selectedSession: null as NetworkSession | null,
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: netlabMock.topology,
    routeTable: netlabMock.topology.routeTables,
    areas: netlabMock.topology.areas,
    hookEngine: {} as never,
  }),
}));

vi.mock('../../simulation/SessionContext', () => ({
  useSession: () => sessionMock,
}));

function makeTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'Router',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:00:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 0, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

function makeHop(overrides: Partial<PacketHop>): PacketHop {
  return {
    step: 0,
    nodeId: 'client-1',
    nodeLabel: 'Client',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'create',
    timestamp: 100,
    ...overrides,
  };
}

function makeSession(overrides: Partial<NetworkSession> = {}): NetworkSession {
  return {
    sessionId: '123456789abc',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    protocol: 'HTTP',
    requestType: 'GET /',
    status: 'success',
    createdAt: 100,
    events: [],
    ...overrides,
  };
}

function renderSessionDetail() {
  return renderToStaticMarkup(<SessionDetail />);
}

beforeEach(() => {
  netlabMock.topology = makeTopology();
  sessionMock.selectedSession = null;
});

describe('SessionDetail', () => {
  it('shows placeholder when no session selected', () => {
    const html = renderSessionDetail();

    expect(html).toContain('Select a session to inspect its lifecycle and packet paths.');
  });

  it('shortens long session ids in the header', () => {
    sessionMock.selectedSession = makeSession({ sessionId: 'abcdef1234567890' });

    const html = renderSessionDetail();

    expect(html).toContain('SESSION #abcdef12');
  });

  it('formats elapsed event times relative to session start', () => {
    sessionMock.selectedSession = makeSession({
      events: [
        { phase: 'request:initiated', timestamp: 105, seq: 0, nodeId: 'client-1' },
      ],
    });

    const html = renderSessionDetail();

    expect(html).toContain('5ms');
  });

  it('formats lifecycle phases for display', () => {
    sessionMock.selectedSession = makeSession({
      events: [
        { phase: 'request:initiated', timestamp: 105, seq: 0, nodeId: 'client-1' },
      ],
    });

    const html = renderSessionDetail();

    expect(html).toContain('request · initiated');
  });

  it('resolves node labels and falls back to raw ids when missing', () => {
    sessionMock.selectedSession = makeSession({
      events: [
        { phase: 'request:initiated', timestamp: 105, seq: 0, nodeId: 'missing-node' },
      ],
    });

    const html = renderSessionDetail();

    expect(html).toContain('Client → Server');
    expect(html).toContain('missing-node');
  });

  it('shows resolved node addresses in path views', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [
          makeHop({
            nodeId: 'router-1',
            nodeLabel: 'Router',
            event: 'forward',
            toNodeId: 'server-1',
            ingressInterfaceName: 'eth0',
            egressInterfaceName: 'eth1',
          }),
        ],
      },
    });

    const html = renderSessionDetail();

    expect(html).toContain('Router');
    expect(html).toContain('(10.0.0.1)');
  });

  it('describes drop hops with the drop reason', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'dropped',
        hops: [
          makeHop({
            nodeId: 'router-1',
            nodeLabel: 'Router',
            event: 'drop',
            reason: 'no-route',
          }),
        ],
      },
    });

    expect(renderSessionDetail()).toContain('drop: no-route');
  });

  it('describes deliver hops as delivered', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [makeHop({ event: 'deliver', nodeId: 'server-1', nodeLabel: 'Server' })],
      },
    });

    expect(renderSessionDetail()).toContain('delivered');
  });

  it('describes ARP request and reply hops', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [
          makeHop({ event: 'arp-request', dstIp: '10.0.0.1' }),
          makeHop({
            event: 'arp-reply',
            srcIp: '10.0.0.1',
            arpFrame: {
              layer: 'L2',
              srcMac: '00:00:00:00:00:01',
              dstMac: 'ff:ff:ff:ff:ff:ff',
              etherType: 0x0806,
              payload: {
                layer: 'ARP',
                hardwareType: 1,
                protocolType: 0x0800,
                operation: 'reply',
                senderMac: '00:00:00:00:00:01',
                senderIp: '10.0.0.1',
                targetMac: '00:00:00:00:00:03',
                targetIp: '10.0.0.10',
              },
            },
          }),
        ],
      },
    });

    const html = renderSessionDetail();

    expect(html).toContain('who has 10.0.0.1?');
    expect(html).toContain('10.0.0.1 is at 00:00:00:00:00:01');
  });

  it('describes forward hops with destination labels and interfaces', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [
          makeHop({
            nodeId: 'router-1',
            nodeLabel: 'Router',
            event: 'forward',
            toNodeId: 'server-1',
            ingressInterfaceName: 'eth0',
            egressInterfaceName: 'eth1',
          }),
        ],
      },
    });

    expect(renderSessionDetail()).toContain('to Server · eth0 → eth1');
  });

  it('renders session events in order', () => {
    sessionMock.selectedSession = makeSession({
      events: [
        { phase: 'request:initiated', timestamp: 101, seq: 0, nodeId: 'client-1' },
        { phase: 'request:delivered', timestamp: 103, seq: 1, nodeId: 'server-1' },
      ],
    });

    const html = renderSessionDetail();

    expect(html.indexOf('request · initiated')).toBeLessThan(
      html.indexOf('request · delivered'),
    );
  });

  it('renders error section when session has error', () => {
    sessionMock.selectedSession = makeSession({
      status: 'failed',
      error: { reason: 'node-down', nodeId: 'router-1' },
    });

    const html = renderSessionDetail();

    expect(html).toContain('ERROR');
    expect(html).toContain('node-down');
    expect(html).toContain('at Router');
  });

  it('renders request trace path with hops', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [makeHop({ nodeLabel: 'Client' }), makeHop({ step: 1, nodeId: 'server-1', nodeLabel: 'Server', event: 'deliver' })],
      },
    });

    const html = renderSessionDetail();

    expect(html).toContain('REQUEST PATH');
    expect(html).toContain('Client');
    expect(html).toContain('Server');
  });

  it('renders response trace path when present', () => {
    sessionMock.selectedSession = makeSession({
      responseTrace: {
        packetId: 'pkt-2',
        srcNodeId: 'server-1',
        dstNodeId: 'client-1',
        status: 'delivered',
        hops: [makeHop({ nodeId: 'server-1', nodeLabel: 'Server', event: 'create' })],
      },
    });

    const html = renderSessionDetail();

    expect(html).toContain('RESPONSE PATH');
    expect(html).toContain('Server');
  });

  it('shows message when trace has no hops', () => {
    sessionMock.selectedSession = makeSession({
      requestTrace: {
        packetId: 'pkt-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        status: 'delivered',
        hops: [],
      },
    });

    expect(renderSessionDetail()).toContain('No hops recorded.');
  });
});
