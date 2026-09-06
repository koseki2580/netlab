import { describe, expect, it } from 'vitest';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';
import { makeRouteEntry } from '../../simulation/__fixtures__/helpers';
import { RouterForwarder } from './RouterForwarder';

/**
 * The shape of the first lesson in the gallery: a client and a server on two
 * subnets, each behind its own switch, with one router between them. Both of
 * the router's routes are `direct`, and the links carry no handles binding an
 * interface to a side — which is the ordinary case, since a topology is not
 * required to state that.
 */
function clientServer(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          layerId: 'l7',
          role: 'client',
          ip: '10.0.0.10',
          mac: 'aa:00:00:00:00:01',
        },
      },
      {
        id: 'sw-private',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'SW-1',
          layerId: 'l2',
          role: 'switch',
          ports: [
            { id: 'p0', name: 'p0', macAddress: '' },
            { id: 'p1', name: 'p1', macAddress: '' },
          ],
        },
      },
      {
        id: 'router',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R-1',
          layerId: 'l3',
          role: 'router',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct' },
            { destination: '203.0.113.0/24', nextHop: 'direct' },
          ],
        },
      },
      {
        id: 'sw-public',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'SW-2',
          layerId: 'l2',
          role: 'switch',
          ports: [
            { id: 'p0', name: 'p0', macAddress: '' },
            { id: 'p1', name: 'p1', macAddress: '' },
          ],
        },
      },
      {
        id: 'server',
        type: 'server',
        position: { x: 0, y: 0 },
        data: {
          label: 'Server',
          layerId: 'l7',
          role: 'server',
          ip: '203.0.113.10',
          mac: 'aa:00:00:00:00:02',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'sw-private' },
      { id: 'e2', source: 'sw-private', target: 'router' },
      { id: 'e3', source: 'router', target: 'sw-public' },
      { id: 'e4', source: 'sw-public', target: 'server' },
    ],
    routeTables: new Map([
      [
        'router',
        [
          makeRouteEntry('router', '10.0.0.0/24', 'direct'),
          makeRouteEntry('router', '203.0.113.0/24', 'direct'),
        ],
      ],
    ]),
    areas: [],
  };
}

function toServer(): InFlightPacket {
  return {
    id: 'p1',
    srcNodeId: 'client',
    dstNodeId: 'server',
    currentDeviceId: 'router',
    ingressPortId: 'eth0',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: 'aa:00:00:00:00:01',
      dstMac: '00:00:00:02:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.10',
        dstIp: '203.0.113.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          checksum: 0,
          payload: { layer: 'raw', data: 'x' },
        },
      },
    },
  };
}

describe('a router resolving a directly connected route', () => {
  /**
   * TC-116 — it sends the packet towards the subnet it is addressed to.
   *
   * Any switch neighbour was accepted for a `direct` route, whichever subnet
   * lay behind it, so the gallery's first lesson sent its packet back down the
   * link it arrived on and reported a routing loop.
   */
  it('sends it out towards the subnet the destination is on', async () => {
    const forwarder = new RouterForwarder('router', clientServer());

    const decision = await forwarder.receive(toServer(), 'eth0', {
      neighbors: [
        { nodeId: 'sw-private', edgeId: 'e2' },
        { nodeId: 'sw-public', edgeId: 'e3' },
      ],
    });

    expect(decision.action).toBe('forward');
    expect(decision.action === 'forward' ? decision.nextNodeId : null).toBe('sw-public');
  });
});
