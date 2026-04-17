import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import type { InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import type { PacketTrace } from '../types/simulation';
import { aclTopology, natTopology } from './__fixtures__/topologies';
import { ServiceOrchestrator, type PacketSender, type ServiceEventSink } from './ServiceOrchestrator';

const DHCP_TOPOLOGY: NetworkTopology = {
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
        ],
      },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 400, y: 0 },
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
  ],
  edges: [
    { id: 'e1', source: 'dhcp-client', target: 'switch-1', targetHandle: 'p0' },
    { id: 'e2', source: 'switch-1', target: 'dhcp-server', sourceHandle: 'p1' },
  ],
  areas: [],
  routeTables: new Map(),
};

const DNS_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
    {
      id: 'dns-server',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'DNS Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.53',
        dnsServer: {
          zones: [{ name: 'app.example.com', address: '192.0.2.50' }],
        },
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'dns-server' }],
  areas: [],
  routeTables: new Map(),
};

const TCP_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

function makePacketSender(topology: NetworkTopology): PacketSender {
  return {
    precompute: async (packet) => ({
      trace: deliveredTrace(packet),
      nodeArpTables: {},
      snapshots: [packet],
    }),
    findNode: (nodeId) => topology.nodes.find((node) => node.id === nodeId),
    getNeighbors: () => [],
  };
}

function deliveredTrace(packet: InFlightPacket): PacketTrace {
  return {
    packetId: packet.id,
    sessionId: packet.sessionId,
    srcNodeId: packet.srcNodeId,
    dstNodeId: packet.dstNodeId,
    status: 'delivered',
    hops: [
      {
        step: 0,
        nodeId: packet.srcNodeId,
        nodeLabel: packet.srcNodeId,
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: String(packet.frame.payload.protocol),
        event: 'deliver',
        timestamp: packet.timestamp,
      },
    ],
  };
}

function createSink(): ServiceEventSink & { traces: PacketTrace[] } {
  const traces: PacketTrace[] = [];

  return {
    traces,
    appendTrace: (trace) => {
      traces.push(trace);
    },
    notify: vi.fn(),
  };
}

describe('ServiceOrchestrator', () => {
  it('creates and reuses a NAT processor only for routers with inside and outside interfaces', () => {
    const services = new ServiceOrchestrator(natTopology(), new HookEngine());

    const natProcessor = services.getNatProcessor('nat-router');

    expect(natProcessor).not.toBeNull();
    expect(services.getNatProcessor('nat-router')).toBe(natProcessor);
    expect(services.getNatProcessor('isp-router')).toBeNull();
  });

  it('creates and reuses an ACL processor only for routers with ACL-configured interfaces', () => {
    const services = new ServiceOrchestrator(
      aclTopology({
        lanInboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
      }),
      new HookEngine(),
    );

    const aclProcessor = services.getAclProcessor('router-1');

    expect(aclProcessor).not.toBeNull();
    expect(services.getAclProcessor('router-1')).toBe(aclProcessor);
    expect(services.getAclProcessor('server-1')).toBeNull();
  });

  it('updates runtime DHCP state and emits four packet traces during a successful lease flow', async () => {
    const services = new ServiceOrchestrator(DHCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(DHCP_TOPOLOGY));
    const sink = createSink();

    await expect(services.simulateDhcp('dhcp-client', sink)).resolves.toBe(true);

    expect(sink.traces).toHaveLength(4);
    expect(services.getRuntimeNodeIp('dhcp-client')).toBe('192.168.1.101');
    expect(services.getDhcpLeaseState('dhcp-client')).toEqual(
      expect.objectContaining({
        status: 'bound',
        assignedIp: '192.168.1.101',
        dnsServerIp: '192.168.1.53',
      }),
    );
    expect(sink.notify).toHaveBeenCalled();
  });

  it('resolves DNS records and reuses the cache on subsequent lookups', async () => {
    const services = new ServiceOrchestrator(DNS_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(DNS_TOPOLOGY));
    const sink = createSink();

    await expect(services.simulateDns('client-1', 'app.example.com', sink)).resolves.toBe('192.0.2.50');
    await expect(services.simulateDns('client-1', 'app.example.com', sink)).resolves.toBe('192.0.2.50');

    expect(sink.traces).toHaveLength(2);
    expect(services.getDnsCache('client-1')).toEqual(
      expect.objectContaining({
        'app.example.com': expect.objectContaining({ address: '192.0.2.50' }),
      }),
    );
  });

  it('clears runtime service state with clearAll', async () => {
    const services = new ServiceOrchestrator(DHCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(DHCP_TOPOLOGY));

    await services.simulateDhcp('dhcp-client', createSink());
    services.clearAll();

    expect(services.getRuntimeNodeIp('dhcp-client')).toBeNull();
    expect(services.getDhcpLeaseState('dhcp-client')).toBeNull();
    expect(services.serializeNatTables()).toEqual([]);
    expect(services.serializeConnTrackTables()).toEqual([]);
  });

  it('registers a TCP connection after a successful handshake', async () => {
    const services = new ServiceOrchestrator(TCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(TCP_TOPOLOGY));
    const sink = createSink();

    const result = await services.simulateTcpConnect(
      'client-1',
      'server-1',
      12345,
      80,
      sink,
    );

    expect(result.success).toBe(true);
    expect(services.getTcpConnections()).toHaveLength(1);
    expect(services.getTcpConnectionsForNode('client-1')).toHaveLength(1);
    expect(sink.traces).toHaveLength(3);
  });

  it('removes a TCP connection after successful teardown', async () => {
    const services = new ServiceOrchestrator(TCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(TCP_TOPOLOGY));
    const sink = createSink();

    const connectResult = await services.simulateTcpConnect(
      'client-1',
      'server-1',
      12345,
      80,
      sink,
    );
    expect(connectResult.success).toBe(true);

    const disconnectResult = await services.simulateTcpDisconnect(
      connectResult.connection!.id,
      sink,
    );

    expect(disconnectResult.success).toBe(true);
    expect(services.getTcpConnections()).toEqual([]);
    expect(sink.traces).toHaveLength(7);
  });

  it('returns a TCP teardown failure when the connection does not exist', async () => {
    const services = new ServiceOrchestrator(TCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(TCP_TOPOLOGY));

    const result = await services.simulateTcpDisconnect('missing-connection', createSink());

    expect(result).toEqual({
      success: false,
      traces: [],
      failureReason: 'TCP disconnect failed: connection not found',
    });
  });

  it('clears TCP runtime state with clearAll', async () => {
    const services = new ServiceOrchestrator(TCP_TOPOLOGY, new HookEngine());
    services.setPacketSender(makePacketSender(TCP_TOPOLOGY));

    const connectResult = await services.simulateTcpConnect(
      'client-1',
      'server-1',
      12345,
      80,
      createSink(),
    );
    expect(connectResult.success).toBe(true);

    services.clearAll();

    expect(services.getTcpConnections()).toEqual([]);
  });
});
