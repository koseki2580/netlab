import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { SimulationEngine } from './SimulationEngine';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'dhcp-client',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        label: 'DHCP Client',
        role: 'client',
        layerId: 'l7',
        dhcpClient: { enabled: true },
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 200, y: 0 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:10:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:10:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '00:00:00:10:00:03' },
        ],
      },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 400, y: -120 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.1',
        dhcpServer: {
          leasePool: '192.168.1.100/30',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          dnsServer: '192.168.1.53',
          leaseTime: 86400,
        },
      },
    },
    {
      id: 'dns-server',
      type: 'server',
      position: { x: 400, y: 0 },
      data: {
        label: 'DNS Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.53',
        dnsServer: {
          zones: [{ name: 'web.example.com', address: '192.168.1.10' }],
        },
      },
    },
    {
      id: 'web-server',
      type: 'server',
      position: { x: 400, y: 120 },
      data: {
        label: 'Web Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'dhcp-client', target: 'switch-1', targetHandle: 'p0' },
    { id: 'e2', source: 'switch-1', target: 'dhcp-server', sourceHandle: 'p1' },
    { id: 'e3', source: 'switch-1', target: 'dns-server', sourceHandle: 'p2' },
    { id: 'e4', source: 'switch-1', target: 'web-server', sourceHandle: 'p3' },
  ],
  areas: [],
  routeTables: new Map(),
};

function makeEngine() {
  return new SimulationEngine(TOPOLOGY, new HookEngine());
}

function buildHttpPacket(): InFlightPacket {
  return {
    id: `http-fetch-${Date.now()}`,
    srcNodeId: 'dhcp-client',
    dstNodeId: 'web-server',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '0.0.0.0',
        dstIp: '192.168.1.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 49152,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: {
            syn: false,
            ack: false,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: {
            layer: 'L7',
            httpVersion: 'HTTP/1.1',
            method: 'GET',
            url: 'http://web.example.com/api',
            headers: { host: 'web.example.com' },
          },
        },
      },
    },
    currentDeviceId: 'dhcp-client',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

describe('SimulationEngine DHCP/DNS services', () => {
  it('simulates DHCP as four traces and binds a runtime IP', async () => {
    const engine = makeEngine();

    await expect(engine.simulateDhcp('dhcp-client')).resolves.toBe(true);

    const state = engine.getState();
    expect(state.traces.map((trace) => trace.label)).toEqual([
      'DHCP DISCOVER',
      'DHCP OFFER',
      'DHCP REQUEST',
      'DHCP ACK',
    ]);
    expect(new Set(state.traces.map((trace) => trace.sessionId)).size).toBe(1);
    expect(engine.getRuntimeNodeIp('dhcp-client')).toBe('192.168.1.101');
    expect(engine.getDhcpLeaseState('dhcp-client')?.status).toBe('bound');
  });

  it('auto-runs DHCP and DNS before HTTP, then reuses the DNS cache on the next send', async () => {
    const engine = makeEngine();

    await engine.send(buildHttpPacket());

    expect(engine.getState().traces.map((trace) => trace.label)).toEqual([
      'DHCP DISCOVER',
      'DHCP OFFER',
      'DHCP REQUEST',
      'DHCP ACK',
      'DNS QUERY',
      'DNS RESPONSE',
      'HTTP GET',
    ]);
    expect(engine.getDnsCache('dhcp-client')?.['web.example.com']?.address).toBe('192.168.1.10');

    engine.clearTraces();
    await engine.send(buildHttpPacket());

    expect(engine.getState().traces.map((trace) => trace.label)).toEqual(['HTTP GET']);
  });
});

describe('SimulationEngine TCP from a DHCP-addressed client', () => {
  // TC-820: a client that took its address from DHCP opens a connection from
  // the address it was leased, not from whatever its static fields hold.
  it('TC-820: the handshake uses the leased address on every segment', async () => {
    const engine = makeEngine();
    await expect(engine.simulateDhcp('dhcp-client')).resolves.toBe(true);
    const leased = engine.getRuntimeNodeIp('dhcp-client');
    expect(leased).toBe('192.168.1.101');

    const result = await engine.tcpConnect('dhcp-client', 'web-server', 49152, 80);

    expect(result.success).toBe(true);
    expect(result.connection?.srcIp).toBe(leased);
    expect(result.traces).toHaveLength(3);
    for (const trace of result.traces) {
      expect(trace.status).toBe('delivered');
    }
    const segmentIps = engine
      .getState()
      .traces.slice(-3)
      .map((trace) => trace.hops[0]?.srcIp);
    expect(segmentIps).toEqual([leased, '192.168.1.10', leased]);
  });
});

// A router between two LANs. The server-side switch is cabled first, so a
// router that cannot see the leased address falls back to it and sends the
// reply back the wrong way.
function routedDhcpTopology(): NetworkTopology {
  const node = (id: string, role: string, data: Record<string, unknown> = {}) => ({
    id,
    type: role,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role,
      layerId: role === 'router' ? 'l3' : role === 'switch' ? 'l2' : 'l7',
      ...data,
    },
  });
  const ports = (prefix: string) =>
    [0, 1, 2].map((index) => ({
      id: `${prefix}-p${index}`,
      name: `fa0/${index}`,
      macAddress: `00:00:00:20:0${prefix === 'lan' ? 1 : 2}:0${index}`,
    }));
  return {
    nodes: [
      node('pc', 'client', { dhcpClient: { enabled: true } }),
      node('sw-lan', 'switch', { ports: ports('lan') }),
      node('dhcp', 'server', {
        ip: '192.168.1.2',
        dhcpServer: {
          leasePool: '192.168.1.100/30',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          leaseTime: 86400,
        },
      }),
      node('r1', 'router', {
        interfaces: [
          {
            id: 'r1-lan',
            name: 'g0/0',
            ipAddress: '192.168.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:01',
          },
          {
            id: 'r1-wan',
            name: 'g0/1',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:02',
          },
        ],
      }),
      node('sw-srv', 'switch', { ports: ports('srv') }),
      node('web', 'server', {
        ip: '10.0.0.10',
        staticRoutes: [{ destination: '0.0.0.0/0', nextHop: '10.0.0.1' }],
      }),
    ] as NetworkTopology['nodes'],
    edges: [
      {
        id: 'e-srv',
        source: 'r1',
        target: 'sw-srv',
        sourceHandle: 'r1-wan',
        targetHandle: 'srv-p0',
      },
      {
        id: 'e-lan',
        source: 'r1',
        target: 'sw-lan',
        sourceHandle: 'r1-lan',
        targetHandle: 'lan-p0',
      },
      { id: 'e-pc', source: 'pc', target: 'sw-lan', targetHandle: 'lan-p1' },
      { id: 'e-dhcp', source: 'sw-lan', target: 'dhcp', sourceHandle: 'lan-p2' },
      { id: 'e-web', source: 'sw-srv', target: 'web', sourceHandle: 'srv-p1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          {
            destination: '192.168.1.0/24',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 0,
            nodeId: 'r1',
          },
          {
            destination: '10.0.0.0/24',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 0,
            nodeId: 'r1',
          },
        ],
      ],
    ]) as NetworkTopology['routeTables'],
  };
}

describe('SimulationEngine routing to a DHCP-addressed client', () => {
  // TC-821: a router sends a reply toward the LAN where the leased address
  // lives, not toward whichever switch happens to be cabled first.
  it('TC-821: the server reply crosses the router back to the leased address', async () => {
    const engine = new SimulationEngine(routedDhcpTopology(), new HookEngine());
    await expect(engine.simulateDhcp('pc')).resolves.toBe(true);
    const leased = engine.getRuntimeNodeIp('pc');

    const result = await engine.tcpConnect('pc', 'web', 49152, 80);

    expect(result.traces.map((trace) => trace.status)).toEqual([
      'delivered',
      'delivered',
      'delivered',
    ]);
    expect(result.connection?.srcIp).toBe(leased);
    const reply = result.traces[1];
    const replyHops = reply?.hops ?? [];
    expect(replyHops[replyHops.length - 1]?.nodeId).toBe('pc');
  });
});

describe('Leases stay inside the engine that granted them', () => {
  // TC-823: two engines built from one topology object each route by their own
  // leases; one engine's DHCP lease is invisible to the other's routers.
  it('TC-823: a router in another engine on the same topology does not see the lease', async () => {
    const shared = routedDhcpTopology();
    const withoutLease = new SimulationEngine(shared, new HookEngine());
    const withLease = new SimulationEngine(shared, new HookEngine());
    await expect(withLease.simulateDhcp('pc')).resolves.toBe(true);
    const leased = withLease.getRuntimeNodeIp('pc') ?? '';
    expect(withoutLease.getRuntimeNodeIp('pc')).toBeNull();

    const reached = await withLease.ping('web', leased);
    const notReached = await withoutLease.ping('web', leased);

    expect(reached.hops.some((hop) => hop.nodeId === 'pc')).toBe(true);
    expect(notReached.hops.some((hop) => hop.nodeId === 'pc')).toBe(false);
  });
});
