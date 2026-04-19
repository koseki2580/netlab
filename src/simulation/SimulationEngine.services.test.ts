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
