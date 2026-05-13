import { beforeAll, describe, expect, it } from 'vitest';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry, registerLayerPlugin } from '../registry/LayerRegistry';
import type { NetworkTopology } from '../types/topology';
import { makeEngine } from './__fixtures__/helpers';

beforeAll(() => {
  if (!layerRegistry.getForwarder('l3')) {
    registerLayerPlugin({
      layerId: 'l3',
      nodeTypes: {},
      forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
    });
  }
  if (!layerRegistry.getForwarder('l2')) {
    registerLayerPlugin({
      layerId: 'l2',
      nodeTypes: {},
      forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
    });
  }
});

function dualStackTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          layerId: 'l7',
          role: 'client',
          ip: '10.0.1.10',
          ipv6: '2001:db8:1::10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 100, y: 0 },
        data: {
          label: 'R1',
          layerId: 'l3',
          role: 'router',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:1::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:01',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:2::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:02',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 200, y: 0 },
        data: {
          label: 'Server',
          layerId: 'l7',
          role: 'server',
          ip: '10.0.2.20',
          ipv6: '2001:db8:2::20',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      {
        id: 'e-client-r1',
        source: 'client-1',
        target: 'router-1',
        targetHandle: 'eth0',
      },
      {
        id: 'e-r1-server',
        source: 'router-1',
        target: 'server-1',
        sourceHandle: 'eth1',
      },
    ],
    areas: [],
    routeTables: new Map([
      [
        'router-1',
        [
          {
            destination: '2001:db8:1::/64',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 1,
            nodeId: 'router-1',
          },
          {
            destination: '2001:db8:2::/64',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 1,
            nodeId: 'router-1',
          },
        ],
      ],
    ]),
  };
}

describe('ForwardingPipeline IPv6', () => {
  it('delivers IPv6 echo request and reply through a dual-stack router', async () => {
    const engine = makeEngine(dualStackTopology());

    const trace = await engine.ping('client-1', '2001:0db8:2::20');

    expect(trace.status).toBe('delivered');
    expect(trace.hops.some((hop) => hop.protocol === 'ICMPv6')).toBe(true);
    expect(trace.hops.some((hop) => hop.event === 'arp-request')).toBe(false);
    expect(trace.hops.some((hop) => hop.srcIp === '2001:db8:2::20')).toBe(true);
  });
});
