import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { SimulationEngine } from './SimulationEngine';
import { makePacket, makeRouteEntry } from './__fixtures__/helpers';
import type { NetworkTopology } from '../types/topology';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
});

function makeVlanTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'host-a1',
        type: 'client',
        position: { x: 80, y: 120 },
        data: {
          label: 'Host A1',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.10.10',
          mac: '02:00:00:00:10:10',
        },
      },
      {
        id: 'host-b1',
        type: 'client',
        position: { x: 80, y: 320 },
        data: {
          label: 'Host B1',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.20.20',
          mac: '02:00:00:00:20:20',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 320, y: 220 },
        data: {
          label: 'SW1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            {
              id: 'p1',
              name: 'fa0/1',
              macAddress: '02:00:00:10:00:01',
              vlanMode: 'access',
              accessVlan: 10,
            },
            {
              id: 'p2',
              name: 'fa0/2',
              macAddress: '02:00:00:10:00:02',
              vlanMode: 'access',
              accessVlan: 20,
            },
            {
              id: 'p24',
              name: 'fa0/24',
              macAddress: '02:00:00:10:00:24',
              vlanMode: 'trunk',
              trunkAllowedVlans: [10, 20],
            },
          ],
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 560, y: 220 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '192.0.2.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
              subInterfaces: [
                {
                  id: 'eth0.10',
                  parentInterfaceId: 'eth0',
                  vlanId: 10,
                  ipAddress: '10.0.10.1',
                  prefixLength: 24,
                },
                {
                  id: 'eth0.20',
                  parentInterfaceId: 'eth0',
                  vlanId: 20,
                  ipAddress: '10.0.20.1',
                  prefixLength: 24,
                },
              ],
            },
          ],
          staticRoutes: [
            { destination: '10.0.10.0/24', nextHop: 'direct' },
            { destination: '10.0.20.0/24', nextHop: 'direct' },
            { destination: '192.0.2.0/24', nextHop: 'direct' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e-a1', source: 'host-a1', target: 'switch-1', targetHandle: 'p1' },
      { id: 'e-b1', source: 'host-b1', target: 'switch-1', targetHandle: 'p2' },
      {
        id: 'e-trunk',
        source: 'switch-1',
        target: 'router-1',
        sourceHandle: 'p24',
        targetHandle: 'eth0',
      },
    ],
    areas: [],
    routeTables: new Map([
      [
        'router-1',
        [
          makeRouteEntry('router-1', '10.0.10.0/24', 'direct'),
          makeRouteEntry('router-1', '10.0.20.0/24', 'direct'),
          makeRouteEntry('router-1', '192.0.2.0/24', 'direct'),
        ],
      ],
    ]),
  };
}

describe('SimulationEngine — VLAN routing', () => {
  it('routes across VLANs and annotates the router hop with sub-interface names', async () => {
    const engine = new SimulationEngine(makeVlanTopology(), new HookEngine());
    const packet = makePacket('vlan-roas', 'host-a1', 'host-b1', '10.0.10.10', '10.0.20.20');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.event).toBe('forward');
    expect(routerHop?.ingressInterfaceName).toBe('eth0.10');
    expect(routerHop?.egressInterfaceName).toBe('eth0.20');
  });
});
