import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SimulationEngine } from './SimulationEngine';
import { HookEngine } from '../hooks/HookEngine';
import { layerRegistry } from '../registry/LayerRegistry';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import type { NetworkTopology } from '../types/topology';
import type { InFlightPacket, EthernetFrame } from '../types/packets';
import type { RouteEntry, RouterInterface } from '../types/routing';
import { type FailureState, EMPTY_FAILURE_STATE, makeInterfaceFailureId } from '../types/failure';
import { computeFcs, computeIpv4Checksum } from '../utils/checksum';
import { buildEthernetFrameBytes, buildIpv4HeaderBytes } from '../utils/packetLayout';
import { serializeArpFrame } from '../utils/packetSerializer';

const CLIENT_MAC = '02:00:00:00:00:10';
const SERVER_MAC = '02:00:00:00:00:20';
const SERVER_TWO_MAC = '02:00:00:00:00:21';

// Register forwarders once without importing React components
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIpFrame(
  srcIp: string,
  dstIp: string,
  ttl = 64,
  srcPort = 12345,
  dstPort = 80,
): EthernetFrame {
  return {
    layer: 'L2',
    srcMac: '00:00:00:00:00:01',
    dstMac: '00:00:00:00:00:02',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp,
      dstIp,
      ttl,
      protocol: 6,
      payload: {
        layer: 'L4',
        srcPort,
        dstPort,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw', data: '' },
      },
    },
  };
}

function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  ttl = 64,
  srcPort = 12345,
  dstPort = 80,
): InFlightPacket {
  return {
    id,
    srcNodeId,
    dstNodeId,
    frame: makeIpFrame(srcIp, dstIp, ttl, srcPort, dstPort),
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function makeRouteEntry(
  nodeId: string,
  destination: string,
  nextHop: string,
): RouteEntry {
  return {
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
    nodeId,
  };
}

function deriveDeterministicMac(nodeId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < nodeId.length; i++) {
    hash ^= nodeId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash >>>= 0;

  return [
    0x02,
    (hash >>> 24) & 0xff,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    hash & 0xff,
    nodeId.length & 0xff,
  ].map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function countPcapRecords(bytes: Uint8Array): number {
  let count = 0;
  let offset = 24;

  while (offset < bytes.length) {
    const recordLength = readUint32LE(bytes, offset + 8);
    offset += 16 + recordLength;
    count++;
  }

  return count;
}

function pcapRecordBytes(bytes: Uint8Array, index: number): Uint8Array {
  let offset = 24;

  for (let recordIndex = 0; recordIndex < index; recordIndex++) {
    offset += 16 + readUint32LE(bytes, offset + 8);
  }

  const recordLength = readUint32LE(bytes, offset + 8);
  return bytes.slice(offset + 16, offset + 16 + recordLength);
}

/** Simple two-node topology: client-1 -- e1 -- server-1 */
function directTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 200, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_MAC },
      },
    ],
    edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

function directTopologyWithoutServerMac(): NetworkTopology {
  const topology = directTopology();
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'server-1'
        ? {
            ...node,
            data: { ...node.data, mac: undefined },
          }
        : node,
    ),
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- server-1 */
function singleRouterTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

function singleRouterTopologyWithoutServerMac(): NetworkTopology {
  const topology = singleRouterTopology();
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'server-1'
        ? {
            ...node,
            data: { ...node.data, mac: undefined },
          }
        : node,
    ),
  };
}

/** client-1 -- e1 -- switch-1 -- e2 -- server-1 */
function switchPassthroughTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
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
            { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1' },
      { id: 'e2', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

/** client-1 -- e1(targetHandle=p0) -- switch-1(sourceHandle=p1) -- e2 -- server-1 */
function switchPassthroughTopologyWithHandles(): NetworkTopology {
  const topology = switchPassthroughTopology();
  return {
    ...topology,
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1', targetHandle: 'p0' },
      { id: 'e2', source: 'switch-1', target: 'server-1', sourceHandle: 'p1' },
    ],
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- switch-1 -- e3 -- server-1 */
function routerSwitchHostTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 400, y: 0 },
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
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_TWO_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'switch-1' },
      { id: 'e3', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e3 -- server-1 */
function multiHopTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-2', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e4 -- server-1
 *                         └──── e3 ──── router-3 -- e5 --┘
 */
function failureFallbackTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.16.0.0/30', 'direct'),
        makeRouteEntry('router-1', '172.17.0.0/30', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
        { ...makeRouteEntry('router-1', '0.0.0.0/0', '172.17.0.2'), metric: 5 },
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/30', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-2', '10.0.0.0/24', '172.16.0.1'),
        makeRouteEntry('router-2', '0.0.0.0/0', '172.16.0.1'),
      ],
    ],
    [
      'router-3',
      [
        makeRouteEntry('router-3', '172.17.0.0/30', 'direct'),
        makeRouteEntry('router-3', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-3', '10.0.0.0/24', '172.17.0.1'),
        makeRouteEntry('router-3', '0.0.0.0/0', '172.17.0.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
            { id: 'eth2', name: 'eth2', ipAddress: '172.17.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:02' },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: -120 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 30, macAddress: '00:00:00:02:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
          ],
        },
      },
      {
        id: 'router-3',
        type: 'router',
        position: { x: 400, y: 120 },
        data: {
          label: 'R-3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '172.17.0.2', prefixLength: 30, macAddress: '00:00:00:03:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.2', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-1', target: 'router-3' },
      { id: 'e4', source: 'router-2', target: 'server-1' },
      { id: 'e5', source: 'router-3', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- nat-router -- e2 -- isp-router -- e3 -- server-1 */
function natTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'nat-router',
      [
        makeRouteEntry('nat-router', '192.168.1.0/24', 'direct'),
        makeRouteEntry('nat-router', '203.0.113.0/30', 'direct'),
        makeRouteEntry('nat-router', '0.0.0.0/0', '203.0.113.2'),
      ],
    ],
    [
      'isp-router',
      [
        makeRouteEntry('isp-router', '203.0.113.0/30', 'direct'),
        makeRouteEntry('isp-router', '198.51.100.0/24', 'direct'),
        makeRouteEntry('isp-router', '192.168.1.0/24', '203.0.113.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '192.168.1.10', mac: CLIENT_MAC },
      },
      {
        id: 'nat-router',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-NAT',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '192.168.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:11:00:00',
              nat: 'inside',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 30,
              macAddress: '00:00:00:11:00:01',
              nat: 'outside',
            },
          ],
          portForwardingRules: [
            { proto: 'tcp', externalPort: 8080, internalIp: '192.168.1.10', internalPort: 80 },
          ],
        },
      },
      {
        id: 'isp-router',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-ISP',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '203.0.113.2', prefixLength: 30, macAddress: '00:00:00:12:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '198.51.100.1', prefixLength: 24, macAddress: '00:00:00:12:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '198.51.100.10', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'nat-router' },
      { id: 'e2', source: 'nat-router', target: 'isp-router' },
      { id: 'e3', source: 'isp-router', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

function aclTopology(options: {
  stateful?: boolean;
  lanInboundAcl?: RouterInterface['inboundAcl'];
  wanInboundAcl?: RouterInterface['inboundAcl'];
} = {}): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.1.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.1.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-FW',
          role: 'router',
          layerId: 'l3',
          statefulFirewall: options.stateful === true,
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:10:00',
              inboundAcl: options.lanInboundAcl,
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:10:01',
              inboundAcl: options.wanInboundAcl,
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.50', mac: SERVER_MAC },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

function makeEngine(topology: NetworkTopology) {
  return new SimulationEngine(topology, new HookEngine());
}

async function packetAtStep(
  engine: SimulationEngine,
  packet: InFlightPacket,
  step: number,
): Promise<InFlightPacket> {
  await engine.send(packet);
  engine.selectHop(step);
  const selectedPacket = engine.getState().selectedPacket;

  if (!selectedPacket) {
    throw new Error(`No packet snapshot available for step ${step}`);
  }

  return selectedPacket;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SimulationEngine.precompute', () => {
  it('delivers directly to adjacent server', async () => {
    const engine = makeEngine(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(2);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[0].nodeId).toBe('client-1');
    expect(trace.hops[0].toNodeId).toBe('server-1');
    expect(trace.hops[1].event).toBe('deliver');
    expect(trace.hops[1].nodeId).toBe('server-1');
  });

  it('routes through a single router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[0].nodeId).toBe('client-1');
    expect(trace.hops[1].event).toBe('forward');
    expect(trace.hops[1].nodeId).toBe('router-1');
    expect(trace.hops[2].event).toBe('deliver');
    expect(trace.hops[2].nodeId).toBe('server-1');
  });

  it('does not inject ARP hops when endpoint and interface MACs are explicitly configured', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p-explicit', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.some((hop) => hop.event === 'arp-request' || hop.event === 'arp-reply')).toBe(false);
  });

  it('injects host-side ARP request/reply hops before the first forward when the destination MAC is unknown', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-host', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'forward',
      'deliver',
    ]);

    const arpRequest = trace.hops[1];
    const arpReply = trace.hops[2];
    expect(arpRequest.nodeId).toBe('client-1');
    expect(arpRequest.arpFrame?.payload.operation).toBe('request');
    expect(arpRequest.arpFrame?.dstMac).toBe('ff:ff:ff:ff:ff:ff');
    expect(arpReply.nodeId).toBe('server-1');
    expect(arpReply.arpFrame?.payload.operation).toBe('reply');
    expect(arpReply.arpFrame?.payload.senderMac).toBe(deriveDeterministicMac('server-1'));
  });

  it('injects router-side ARP request/reply hops before a directly connected forward when the destination MAC is unknown', async () => {
    const engine = makeEngine(singleRouterTopologyWithoutServerMac());
    const packet = makePacket('p-arp-router', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'forward',
      'deliver',
    ]);

    expect(trace.hops[1].nodeId).toBe('router-1');
    expect(trace.hops[2].nodeId).toBe('server-1');
    expect(trace.hops[3].nodeId).toBe('router-1');
  });

  it('populates nodeArpTables for both the requester and the responder when ARP is simulated', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(
      makePacket('p-arp-state', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.getState().nodeArpTables['client-1']?.['203.0.113.10']).toBe(
      deriveDeterministicMac('server-1'),
    );
    expect(engine.getState().nodeArpTables['server-1']?.['10.0.0.10']).toBe(CLIENT_MAC);
  });

  it('assigns contiguous step numbers when ARP hops are injected', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-steps', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.step)).toEqual([0, 1, 2, 3, 4]);
  });

  it('resets the in-run ARP cache between precompute calls', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-reset', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    const firstTrace = await engine.precompute(packet);
    const secondTrace = await engine.precompute({ ...packet, id: 'p-arp-reset-2' });

    expect(firstTrace.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
    expect(secondTrace.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
  });

  it('annotates router ingress and egress interfaces on direct forwarding hops', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops[1].ingressInterfaceId).toBe('eth0');
    expect(trace.hops[1].ingressInterfaceName).toBe('eth0');
    expect(trace.hops[1].egressInterfaceId).toBe('eth1');
    expect(trace.hops[1].egressInterfaceName).toBe('eth1');
  });

  it('materializes identification, IPv4 checksum, and FCS before the create hop snapshot', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const createSnapshot = await packetAtStep(engine, packet, 0);
    const expectedChecksum = computeIpv4Checksum(
      buildIpv4HeaderBytes(createSnapshot.frame.payload, { checksumOverride: 0 }),
    );
    const expectedFcs = computeFcs(
      buildEthernetFrameBytes(
        { ...createSnapshot.frame, fcs: 0 },
        { includePreamble: false, includeFcs: false },
      ),
    );

    expect(createSnapshot.frame.payload.identification).toBeDefined();
    expect(createSnapshot.frame.payload.headerChecksum).toBe(expectedChecksum);
    expect(createSnapshot.frame.fcs).toBe(expectedFcs);
    expect(createSnapshot.frame.srcMac).toBe(CLIENT_MAC);
    expect(createSnapshot.frame.dstMac).toBe('00:00:00:01:00:00');
  });

  it('rewrites router-hop source and destination MAC addresses to the egress segment', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const routerSnapshot = await packetAtStep(engine, packet, 1);

    expect(routerSnapshot.frame.srcMac).toBe('00:00:00:01:00:01');
    expect(routerSnapshot.frame.dstMac).toBe(SERVER_MAC);
    expect(routerSnapshot.frame.fcs).toBe(
      computeFcs(
        buildEthernetFrameBytes(
          { ...routerSnapshot.frame, fcs: 0 },
          { includePreamble: false, includeFcs: false },
        ),
      ),
    );
  });

  it('decrements TTL at each router hop', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    // hop[1] = router-1: arriving TTL is 64 (pre-decrement)
    expect(trace.hops[1].ttl).toBe(64);
    // hop[2] = server-1: forwarded packet has TTL=63
    expect(trace.hops[2].ttl).toBe(63);
  });

  it('drops packet when TTL reaches 1 at router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('ttl-exceeded');
    expect(dropHop!.nodeId).toBe('router-1');
  });

  it('drops packet when no route exists', async () => {
    const topology = singleRouterTopology();
    // Remove all routes from router-1
    topology.routeTables.set('router-1', []);
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('no-route');
    expect(dropHop!.ingressInterfaceId).toBe('eth0');
    expect(dropHop!.ingressInterfaceName).toBe('eth0');
  });

  it('marks router-hop field mutations for UI diff highlighting', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.hops[1].changedFields).toEqual([
      'TTL',
      'Header Checksum',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]);
    expect(trace.hops[0].changedFields).toBeUndefined();
  });

  it('traverses through a switch', async () => {
    const engine = makeEngine(switchPassthroughTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(trace.hops[1].nodeId).toBe('switch-1');
    expect(trace.hops[1].event).toBe('forward');
    expect(trace.hops[1].activeEdgeId).toBe('e2');
  });

  it('annotates switch ingress and egress ports when edge handles are present', async () => {
    const engine = makeEngine(switchPassthroughTopologyWithHandles());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops[1].nodeId).toBe('switch-1');
    expect(trace.hops[1].ingressInterfaceId).toBe('p0');
    expect(trace.hops[1].ingressInterfaceName).toBe('fa0/0');
    expect(trace.hops[1].egressInterfaceId).toBe('p1');
    expect(trace.hops[1].egressInterfaceName).toBe('fa0/1');
  });

  it('keeps MAC addresses stable on client-to-switch hops with no L3 boundary', async () => {
    const engine = makeEngine(switchPassthroughTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    await engine.send(packet);

    engine.selectHop(0);
    const createSnapshot = engine.getState().selectedPacket!;
    engine.selectHop(1);
    const switchSnapshot = engine.getState().selectedPacket!;

    expect(createSnapshot.frame.srcMac).toBe(CLIENT_MAC);
    expect(createSnapshot.frame.dstMac).toBe(SERVER_MAC);
    expect(switchSnapshot.frame.srcMac).toBe(createSnapshot.frame.srcMac);
    expect(switchSnapshot.frame.dstMac).toBe(createSnapshot.frame.dstMac);
  });

  it('resolves router destination MAC through transparent switches to the host MAC', async () => {
    const engine = makeEngine(routerSwitchHostTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const routerSnapshot = await packetAtStep(engine, packet, 1);

    expect(routerSnapshot.frame.srcMac).toBe('00:00:00:01:00:01');
    expect(routerSnapshot.frame.dstMac).toBe(SERVER_TWO_MAC);
  });

  it('routes through two routers', async () => {
    const engine = makeEngine(multiHopTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(4);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[1].nodeId).toBe('router-1');
    expect(trace.hops[2].nodeId).toBe('router-2');
    expect(trace.hops[3].event).toBe('deliver');
  });

  it('tracks sender IP across router hops to resolve downstream ingress interfaces', async () => {
    const engine = makeEngine(multiHopTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.hops[1].egressInterfaceId).toBe('eth1');
    expect(trace.hops[2].ingressInterfaceId).toBe('eth0');
    expect(trace.hops[2].ingressInterfaceName).toBe('eth0');
    expect(trace.hops[2].egressInterfaceId).toBe('eth1');
  });

  it('stops with routing-loop when a node is revisited (triangle cycle)', async () => {
    // Triangle: client-1 → R1 → R2 → R3 → R1 (R1 is revisited, triggering loop detection)
    // R1 and R3 share an edge so R3 can forward back to R1 without backtracking through R2.
    const routeTables = new Map<string, RouteEntry[]>([
      ['router-1', [makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2')]],
      ['router-2', [makeRouteEntry('router-2', '203.0.113.0/24', '192.168.1.2')]],
      ['router-3', [makeRouteEntry('router-3', '203.0.113.0/24', '10.0.0.1')]],
    ]);
    const topology: NetworkTopology = {
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
          position: { x: 200, y: 0 },
          data: {
            label: 'R-1',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
              { id: 'eth2', name: 'eth2', ipAddress: '192.168.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:02' },
            ],
          },
        },
        {
          id: 'router-2',
          type: 'router',
          position: { x: 400, y: 0 },
          data: {
            label: 'R-2',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '192.168.1.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
            ],
          },
        },
        {
          id: 'router-3',
          type: 'router',
          position: { x: 200, y: 200 },
          data: {
            label: 'R-3',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '192.168.1.2', prefixLength: 24, macAddress: '00:00:00:03:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '192.168.0.2', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
            ],
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'router-1' },
        { id: 'e2', source: 'router-1', target: 'router-2' },
        { id: 'e3', source: 'router-2', target: 'router-3' },
        { id: 'e4', source: 'router-3', target: 'router-1' }, // closes the triangle
      ],
      areas: [],
      routeTables,
    };
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops[trace.hops.length - 1];
    expect(dropHop.event).toBe('drop');
    expect(dropHop.reason).toBe('routing-loop');
  });

  it('populates activeEdgeId on forward hops', async () => {
    const topology = singleRouterTopology();
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    const edgeIds = topology.edges.map((e) => e.id);
    const forwardHops = trace.hops.filter((h) => h.event === 'create' || h.event === 'forward');
    for (const hop of forwardHops) {
      expect(hop.activeEdgeId).toBeDefined();
      expect(edgeIds).toContain(hop.activeEdgeId);
    }
  });
});

describe('SimulationEngine.step', () => {
  async function loadedEngine() {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    return engine;
  }

  it('starts with currentStep -1 after send', async () => {
    const engine = await loadedEngine();
    expect(engine.getState().currentStep).toBe(-1);
    expect(engine.getState().status).toBe('paused');
  });

  it('advances currentStep on each call', async () => {
    const engine = await loadedEngine();
    engine.step();
    expect(engine.getState().currentStep).toBe(0);
    engine.step();
    expect(engine.getState().currentStep).toBe(1);
  });

  it('sets status to done at last hop', async () => {
    const engine = await loadedEngine();
    // singleRouterTopology has 3 hops (0, 1, 2)
    engine.step();
    engine.step();
    engine.step();
    expect(engine.getState().status).toBe('done');
  });

  it('does not advance beyond last hop', async () => {
    const engine = await loadedEngine();
    engine.step();
    engine.step();
    engine.step();
    engine.step(); // extra step
    expect(engine.getState().currentStep).toBe(2); // stays at last
  });

  it('updates activeEdgeIds from hop', async () => {
    const engine = await loadedEngine();
    engine.step(); // step 0: client-1 create, activeEdgeId = 'e1'
    expect(engine.getState().activeEdgeIds).toEqual(['e1']);
  });

  it('clears activeEdgeIds on deliver hop', async () => {
    const engine = await loadedEngine();
    engine.step();
    engine.step();
    engine.step(); // deliver hop
    expect(engine.getState().activeEdgeIds).toEqual([]);
  });
});

describe('SimulationEngine.play / pause', () => {
  it('auto-advances to done with zero interval', async () => {
    vi.useFakeTimers();
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.play(0);
    expect(engine.getState().status).toBe('running');

    await vi.runAllTimersAsync();
    expect(engine.getState().status).toBe('done');
    vi.useRealTimers();
  });

  it('pauses mid-play', async () => {
    vi.useFakeTimers();
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.play(100);
    await vi.advanceTimersByTimeAsync(100); // advance one step
    engine.pause();

    expect(engine.getState().status).toBe('paused');
    const stepAfterPause = engine.getState().currentStep;
    await vi.advanceTimersByTimeAsync(500); // would advance more if not paused
    expect(engine.getState().currentStep).toBe(stepAfterPause);
    vi.useRealTimers();
  });
});

describe('SimulationEngine.reset', () => {
  it('resets playback position without clearing traces', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    engine.step();
    engine.step();
    engine.reset();

    const state = engine.getState();
    expect(state.currentStep).toBe(-1);
    expect(state.activeEdgeIds).toEqual([]);
    expect(state.selectedHop).toBeNull();
    expect(state.traces).toHaveLength(1); // trace still present
    expect(state.status).toBe('paused');
  });
});

describe('SimulationEngine.exportPcap', () => {
  it('returns a 24-byte header-only export when no trace exists', () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.exportPcap()).toHaveLength(24);
  });

  it('returns a valid PCAP whose record count matches the hop count', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('pcap-basic', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const state = engine.getState();
    const trace = state.traces.find((candidate) => candidate.packetId === 'pcap-basic');
    const bytes = engine.exportPcap('pcap-basic');

    expect(trace).toBeDefined();
    expect(countPcapRecords(bytes)).toBe(trace?.hops.length);
  });

  it('defaults to the currentTraceId when no trace id is provided', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('pcap-current', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    expect(Array.from(engine.exportPcap())).toEqual(Array.from(engine.exportPcap('pcap-current')));
  });

  it('returns a 24-byte header-only export when the requested trace id is missing', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('pcap-known', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    expect(engine.exportPcap('missing-trace')).toHaveLength(24);
  });

  it('uses arpFrame bytes for ARP hops instead of packet snapshots', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(makePacket('pcap-arp', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'pcap-arp');
    const arpHopIndex = trace?.hops.findIndex((hop) => hop.event === 'arp-request') ?? -1;
    const arpFrame = arpHopIndex >= 0 ? trace?.hops[arpHopIndex].arpFrame : undefined;
    const bytes = engine.exportPcap('pcap-arp');
    const expectedFrameBytes = arpFrame
      ? serializeArpFrame(arpFrame).bytes.slice(0, serializeArpFrame(arpFrame).bytes.length - 4)
      : null;

    expect(arpHopIndex).toBeGreaterThanOrEqual(0);
    expect(expectedFrameBytes).not.toBeNull();
    expect(Array.from(pcapRecordBytes(bytes, arpHopIndex))).toEqual(Array.from(expectedFrameBytes!));
  });

  it('uses the stored packet snapshot bytes for drop hops', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('pcap-drop', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1));

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'pcap-drop');
    const dropHopIndex = trace?.hops.findIndex((hop) => hop.event === 'drop') ?? -1;
    expect(dropHopIndex).toBeGreaterThanOrEqual(0);

    engine.selectTrace('pcap-drop');
    engine.selectHop(dropHopIndex);
    const snapshot = engine.getState().selectedPacket;
    const expectedFrameBytes = snapshot
      ? Uint8Array.from(
          buildEthernetFrameBytes(snapshot.frame, { includePreamble: false, includeFcs: false }),
        )
      : null;
    const bytes = engine.exportPcap('pcap-drop');

    expect(expectedFrameBytes).not.toBeNull();
    expect(Array.from(pcapRecordBytes(bytes, dropHopIndex))).toEqual(Array.from(expectedFrameBytes!));
  });
});

describe('SimulationEngine NAT', () => {
  it('annotates SNAT hops and exposes live NAT table state', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-snat',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-snat');
    const natHop = trace?.hops.find((hop) => hop.nodeId === 'nat-router');
    const natTable = engine.getState().natTables.find((table) => table.routerId === 'nat-router');

    expect(trace?.status).toBe('delivered');
    expect(natHop?.natTranslation).toEqual({
      type: 'snat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 54321,
      postSrcIp: '203.0.113.1',
      postSrcPort: 1024,
      preDstIp: '198.51.100.10',
      preDstPort: 80,
      postDstIp: '198.51.100.10',
      postDstPort: 80,
    });
    expect(natHop?.changedFields).toEqual(expect.arrayContaining([
      'TTL',
      'Header Checksum',
      'Src IP',
      'Src Port',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]));
    expect(natTable?.entries).toHaveLength(1);
    expect(natTable?.entries[0]?.insideGlobalIp).toBe('203.0.113.1');
    expect(natTable?.entries[0]?.insideGlobalPort).toBe(1024);
  });

  it('reverse-translates return traffic for an existing SNAT session', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-snat',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );

    const mappedPort = engine.getState().natTables[0]?.entries[0]?.insideGlobalPort;
    expect(mappedPort).toBe(1024);

    await engine.send(
      makePacket(
        'nat-return',
        'server-1',
        'client-1',
        '198.51.100.10',
        '203.0.113.1',
        64,
        80,
        mappedPort ?? 0,
      ),
    );

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-return');
    const natHop = trace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(trace?.status).toBe('delivered');
    expect(natHop?.natTranslation).toEqual({
      type: 'snat',
      preSrcIp: '198.51.100.10',
      preSrcPort: 80,
      postSrcIp: '198.51.100.10',
      postSrcPort: 80,
      preDstIp: '203.0.113.1',
      preDstPort: 1024,
      postDstIp: '192.168.1.10',
      postDstPort: 54321,
    });
    expect(natHop?.changedFields).toEqual(expect.arrayContaining([
      'TTL',
      'Header Checksum',
      'Dst IP',
      'Dst Port',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]));
  });

  it('applies DNAT for port forwarding and reuses that mapping on the response', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-dnat-in',
        'server-1',
        'client-1',
        '198.51.100.10',
        '203.0.113.1',
        64,
        55000,
        8080,
      ),
    );

    const inboundTrace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-dnat-in');
    const inboundNatHop = inboundTrace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(inboundTrace?.status).toBe('delivered');
    expect(inboundNatHop?.natTranslation).toEqual({
      type: 'dnat',
      preSrcIp: '198.51.100.10',
      preSrcPort: 55000,
      postSrcIp: '198.51.100.10',
      postSrcPort: 55000,
      preDstIp: '203.0.113.1',
      preDstPort: 8080,
      postDstIp: '192.168.1.10',
      postDstPort: 80,
    });
    expect(inboundNatHop?.changedFields).toEqual(expect.arrayContaining([
      'TTL',
      'Header Checksum',
      'Dst IP',
      'Dst Port',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]));

    await engine.send(
      makePacket(
        'nat-dnat-out',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        80,
        55000,
      ),
    );

    const outboundTrace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-dnat-out');
    const outboundNatHop = outboundTrace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(outboundTrace?.status).toBe('delivered');
    expect(outboundNatHop?.natTranslation).toEqual({
      type: 'dnat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 80,
      postSrcIp: '203.0.113.1',
      postSrcPort: 8080,
      preDstIp: '198.51.100.10',
      preDstPort: 55000,
      postDstIp: '198.51.100.10',
      postDstPort: 55000,
    });
    expect(outboundNatHop?.changedFields).toEqual(expect.arrayContaining([
      'TTL',
      'Header Checksum',
      'Src IP',
      'Src Port',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]));
  });

  it('reset clears NAT tables and restarts PAT port allocation', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-before-reset',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );
    expect(engine.getState().natTables[0]?.entries[0]?.insideGlobalPort).toBe(1024);

    engine.reset();
    expect(engine.getState().natTables).toEqual([]);

    await engine.send(
      makePacket(
        'nat-after-reset',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );
    expect(engine.getState().natTables[0]?.entries[0]?.insideGlobalPort).toBe(1024);
  });
});

describe('SimulationEngine ACL', () => {
  it('drops on an explicit ACL deny rule and terminates the trace at the router', async () => {
    const engine = makeEngine(aclTopology({
      lanInboundAcl: [
        {
          id: 'deny-ssh',
          priority: 10,
          action: 'deny',
          protocol: 'tcp',
          dstPort: 22,
        },
      ],
    }));

    const trace = await engine.precompute(
      makePacket('acl-deny-explicit', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 41000, 22),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(trace.status).toBe('dropped');
    expect(trace.hops).toHaveLength(2);
    expect(dropHop?.nodeId).toBe('router-1');
    expect(dropHop?.reason).toBe('acl-deny');
    expect(dropHop?.aclMatch?.action).toBe('deny');
    expect(dropHop?.aclMatch?.matchedRule?.id).toBe('deny-ssh');
  });

  it('annotates permitted router hops with the matching ACL rule', async () => {
    const engine = makeEngine(aclTopology({
      lanInboundAcl: [
        {
          id: 'allow-http',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          srcIp: '10.0.1.0/24',
          dstPort: 80,
        },
      ],
    }));

    const trace = await engine.precompute(
      makePacket('acl-permit', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1' && hop.event === 'forward');
    expect(trace.status).toBe('delivered');
    expect(routerHop?.aclMatch?.action).toBe('permit');
    expect(routerHop?.aclMatch?.matchedRule?.id).toBe('allow-http');
    expect(routerHop?.aclMatch?.direction).toBe('inbound');
  });

  it('applies implicit default deny when no rule matches', async () => {
    const engine = makeEngine(aclTopology({
      lanInboundAcl: [
        {
          id: 'allow-https',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          dstPort: 443,
        },
      ],
    }));

    const trace = await engine.precompute(
      makePacket('acl-default-deny', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 41000, 22),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(trace.status).toBe('dropped');
    expect(dropHop?.reason).toBe('acl-deny');
    expect(dropHop?.aclMatch?.matchedRule).toBeNull();
    expect(dropHop?.aclMatch?.byConnTrack).toBe(false);
  });

  it('auto-permits return traffic via conn-track and exposes the live table', async () => {
    const engine = makeEngine(aclTopology({
      stateful: true,
      lanInboundAcl: [
        {
          id: 'allow-http',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          dstPort: 80,
        },
      ],
      wanInboundAcl: [],
    }));

    await engine.precompute(
      makePacket('acl-stateful-out', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );

    const returnTrace = await engine.precompute(
      makePacket('acl-stateful-return', 'server-1', 'client-1', '203.0.113.50', '10.0.1.10', 64, 80, 40000),
    );

    const routerHop = returnTrace.hops.find((hop) => hop.nodeId === 'router-1' && hop.event === 'forward');
    const connTrackTable = engine.getState().connTrackTables.find((table) => table.routerId === 'router-1');

    expect(returnTrace.status).toBe('delivered');
    expect(routerHop?.aclMatch?.action).toBe('permit');
    expect(routerHop?.aclMatch?.byConnTrack).toBe(true);
    expect(connTrackTable?.entries).toHaveLength(1);
    expect(connTrackTable?.entries[0]?.srcIp).toBe('10.0.1.10');
    expect(connTrackTable?.entries[0]?.dstIp).toBe('203.0.113.50');
  });

  it('reset clears conn-track entries and repeated forward flows reuse the same entry', async () => {
    const engine = makeEngine(aclTopology({
      stateful: true,
      lanInboundAcl: [
        {
          id: 'allow-http',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          dstPort: 80,
        },
      ],
      wanInboundAcl: [],
    }));

    await engine.precompute(
      makePacket('acl-reuse-1', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );
    await engine.precompute(
      makePacket('acl-reuse-2', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );

    expect(engine.getState().connTrackTables[0]?.entries).toHaveLength(1);

    engine.reset();

    expect(engine.getState().connTrackTables).toEqual([]);
  });
});

describe('SimulationEngine.subscribe', () => {
  it('calls listener on step', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const listener = vi.fn();
    engine.subscribe(listener);
    engine.step();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not call listener after unsubscribe', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const listener = vi.fn();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.step();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SimulationEngine hook emission', () => {
  it('emits packet:forward when stepping through a forward hop', async () => {
    const hookEngine = new HookEngine();
    const topology = singleRouterTopology();
    const engine = new SimulationEngine(topology, hookEngine);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const forwardSpy = vi.fn(async (_ctx, next) => { await next(); });
    hookEngine.on('packet:forward', forwardSpy);

    engine.step(); // step 0: create
    engine.step(); // step 1: forward at router-1

    // Allow async hook emission to complete
    await Promise.resolve();

    expect(forwardSpy).toHaveBeenCalledOnce();
    const ctx = forwardSpy.mock.calls[0][0];
    expect(ctx.fromNodeId).toBe('client-1');
    expect(ctx.toNodeId).toBe('server-1');
  });

  it('emits packet:deliver on the deliver hop', async () => {
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(singleRouterTopology(), hookEngine);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const deliverSpy = vi.fn(async (_ctx, next) => { await next(); });
    hookEngine.on('packet:deliver', deliverSpy);

    engine.step();
    engine.step();
    engine.step(); // deliver

    await Promise.resolve();
    expect(deliverSpy).toHaveBeenCalledOnce();
    expect(deliverSpy.mock.calls[0][0].destinationNodeId).toBe('server-1');
  });
});

describe('SimulationEngine.selectHop', () => {
  it('updates selectedHop and activeEdgeIds without advancing currentStep', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.selectHop(1); // router-1 forward hop
    const state = engine.getState();
    expect(state.selectedHop?.nodeId).toBe('router-1');
    expect(state.currentStep).toBe(-1); // not advanced
    expect(state.activeEdgeIds).toEqual(['e2']);
  });
});

describe('SimulationEngine.routingDecision', () => {
  it('router hop has routingDecision defined', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop).toBeDefined();
    expect(routerHop!.routingDecision).toBeDefined();
  });

  it('client and server hops do NOT have routingDecision', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const clientHop = trace.hops.find((h) => h.nodeId === 'client-1');
    const serverHop = trace.hops.find((h) => h.nodeId === 'server-1');
    expect(clientHop!.routingDecision).toBeUndefined();
    expect(serverHop!.routingDecision).toBeUndefined();
  });

  it('winner is non-null on successful forward', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop!.routingDecision!.winner).not.toBeNull();
  });

  it('winner is null on no-route drop', async () => {
    const topology = singleRouterTopology();
    topology.routeTables.set('router-1', []);
    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop).toBeDefined();
    expect(routerHop!.routingDecision).toBeDefined();
    expect(routerHop!.routingDecision!.winner).toBeNull();
  });

  it('TTL-exceeded drop has no routingDecision', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1),
    );

    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('ttl-exceeded');
    expect(dropHop!.routingDecision).toBeUndefined();
  });

  it('candidates count matches router route table size', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    // singleRouterTopology has 2 routes for router-1
    expect(routerHop!.routingDecision!.candidates).toHaveLength(2);
  });

  it('exactly one candidate has selectedByLpm true', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    const lpmWinners = routerHop!.routingDecision!.candidates.filter((c) => c.selectedByLpm);
    expect(lpmWinners).toHaveLength(1);
  });

  it('explanation is a non-empty string', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(typeof routerHop!.routingDecision!.explanation).toBe('string');
    expect(routerHop!.routingDecision!.explanation.length).toBeGreaterThan(0);
  });
});

describe('SimulationEngine ICMP helpers', () => {
  it('ping sends an echo request and appends the echo reply path on success', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '203.0.113.10');

    expect(trace.status).toBe('delivered');

    const serverDeliverIndex = trace.hops.findIndex(
      (hop) => hop.nodeId === 'server-1' && hop.event === 'deliver',
    );
    const clientDeliverIndex = trace.hops.findIndex(
      (hop) => hop.nodeId === 'client-1' && hop.event === 'deliver' && hop.fromNodeId === 'router-1',
    );

    expect(serverDeliverIndex).toBeGreaterThan(-1);
    expect(clientDeliverIndex).toBeGreaterThan(serverDeliverIndex);
    expect(trace.hops[0]?.protocol).toBe('ICMP');
  });

  it('ping drops with no-route when the destination IP is unreachable', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '198.51.100.10');

    expect(trace.status).toBe('dropped');
    expect(trace.hops.some((hop) => hop.event === 'drop' && hop.reason === 'no-route')).toBe(true);
  });

  it('ping with TTL=1 marks the router drop hop and appends the generated ICMP response', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '203.0.113.10', { ttl: 1 });

    expect(trace.status).toBe('dropped');

    const ttlDropHop = trace.hops.find(
      (hop) => hop.nodeId === 'router-1' && hop.event === 'drop' && hop.reason === 'ttl-exceeded',
    );

    expect(ttlDropHop?.icmpGenerated).toBe(true);
    expect(
      trace.hops.some((hop) => hop.nodeId === 'client-1' && hop.event === 'deliver'),
    ).toBe(true);
  });

  it('traceroute stops after the destination is reached', async () => {
    const engine = makeEngine(multiHopTopology());

    const traces = await engine.traceroute('client-1', '203.0.113.10');

    expect(traces).toHaveLength(3);
    expect(
      traces[0]?.hops.some((hop) => hop.nodeId === 'router-1' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[1]?.hops.some((hop) => hop.nodeId === 'router-2' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[2]?.hops.some((hop) => hop.nodeId === 'server-1' && hop.event === 'deliver'),
    ).toBe(true);
  });
});

describe('SimulationEngine failure-aware routing fallback', () => {
  it('uses the forwarder hint route without re-running reachable route selection when the path is up', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const selectReachableRouteSpy = vi.spyOn(engine as any, 'selectReachableRoute');

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('delivered');
    expect(selectReachableRouteSpy).not.toHaveBeenCalled();

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-2');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('203.0.113.0/24');
  });

  it('reroutes through the fallback route when the primary edge is down', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('delivered');

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-3');
    expect(routerHop?.activeEdgeId).toBe('e3');
    expect(routerHop?.egressInterfaceId).toBe('eth2');

    const decision = routerHop?.routingDecision;
    expect(decision?.winner?.destination).toBe('0.0.0.0/0');
    expect(decision?.winner?.nextHop).toBe('172.17.0.2');
    expect(decision?.explanation).toContain('Fallback via 0.0.0.0/0 (172.17.0.2)');

    const primaryCandidate = decision?.candidates.find((candidate) => candidate.destination === '203.0.113.0/24');
    const fallbackCandidate = decision?.candidates.find((candidate) => candidate.destination === '0.0.0.0/0');
    expect(primaryCandidate?.selectedByLpm).toBe(true);
    expect(primaryCandidate?.selectedByFailover).not.toBe(true);
    expect(fallbackCandidate?.selectedByLpm).toBe(false);
    expect(fallbackCandidate?.selectedByFailover).toBe(true);
  });

  it('falls back to reachable-route selection when the forwarder hint route is unavailable', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const selectReachableRouteSpy = vi.spyOn(engine as any, 'selectReachableRoute');
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('delivered');
    expect(selectReachableRouteSpy).toHaveBeenCalled();

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-3');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('0.0.0.0/0');
  });

  it('keeps selectedByFailover unset on the normal primary path', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('delivered');

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-2');
    expect(routerHop?.egressInterfaceId).toBe('eth1');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('203.0.113.0/24');
    expect(
      routerHop?.routingDecision?.candidates.some((candidate) => candidate.selectedByFailover),
    ).toBe(false);
  });

  it('reports no reachable winner when both primary and fallback edges are down', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2', 'e3']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('dropped');

    const dropHop = trace.hops.find((hop) => hop.event === 'drop' && hop.nodeId === 'router-1');
    expect(dropHop?.reason).toBe('no-route');
    expect(dropHop?.routingDecision?.winner).toBeNull();
    expect(dropHop?.routingDecision?.explanation).toContain('No reachable route');

    const primaryCandidate = dropHop?.routingDecision?.candidates.find(
      (candidate) => candidate.destination === '203.0.113.0/24',
    );
    expect(primaryCandidate?.selectedByLpm).toBe(true);
    expect(
      dropHop?.routingDecision?.candidates.some((candidate) => candidate.selectedByFailover),
    ).toBe(false);
  });

  it('uses the failover route subnet for interface-down checks', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth2')]),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('dropped');

    const dropHop = trace.hops.find((hop) => hop.event === 'drop' && hop.nodeId === 'router-1');
    expect(dropHop?.reason).toBe('interface-down');
    expect(dropHop?.egressInterfaceId).toBe('eth2');
    expect(dropHop?.routingDecision?.winner?.nextHop).toBe('172.17.0.2');
  });
});

// ── Failure simulation ────────────────────────────────────────────────────────

describe('SimulationEngine failure simulation', () => {
  function makeEngine(topology: NetworkTopology): SimulationEngine {
    return new SimulationEngine(topology, new HookEngine());
  }

  it('EMPTY_FAILURE_STATE has no effect — packet is delivered normally', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      EMPTY_FAILURE_STATE,
    );
    expect(trace.status).toBe('delivered');
  });

  it('down node drops packet with reason node-down', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['router-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('node-down');
    expect(dropHop?.nodeId).toBe('router-1');
  });

  it('down source node drops packet at step 0 with reason node-down', async () => {
    const engine = makeEngine(directTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['client-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    expect(trace.hops[0].event).toBe('drop');
    expect(trace.hops[0].reason).toBe('node-down');
    expect(trace.hops[0].nodeId).toBe('client-1');
  });

  it('down edge causes no-route drop at the router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']), // router-1 → server-1
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('no-route');
    expect(dropHop?.nodeId).toBe('router-1');
  });

  it('down edge not on the path does not affect delivery', async () => {
    // e1 is client-1 → router-1 (on path), e2 is router-1 → server-1 (on path)
    // singleRouterTopology only has two edges; put a non-existent edge id down
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e-nonexistent']),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('delivered');
  });

  it('send() forwards failureState to precompute — drop result is persisted in engine state', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['router-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    await engine.send(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    const trace = engine.getState().traces.find((t) => t.packetId === 'p1');
    expect(trace?.status).toBe('dropped');
    const dropHop = trace?.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('node-down');
  });

  describe('interface-down failure', () => {
    it('drops packet at a router when the resolved egress interface is down', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-1');
      expect(dropHop?.reason).toBe('interface-down');
      expect(dropHop?.egressInterfaceId).toBe('eth1');
      expect(dropHop?.egressInterfaceName).toBe('eth1');
    });

    it('keeps delivery working when only the ingress interface on the next router is down', async () => {
      const engine = makeEngine(multiHopTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-2', 'eth0')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('delivered');
      expect(trace.hops[2].nodeId).toBe('router-2');
      expect(trace.hops[2].ingressInterfaceId).toBe('eth0');
      expect(trace.hops[2].egressInterfaceId).toBe('eth1');
    });

    it('prefers interface-down over normal forwarding when the router itself is still up', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
      expect(routerHop?.event).toBe('drop');
      expect(routerHop?.reason).toBe('interface-down');
    });

    it('keeps edge-down precedence over interface-down when no next hop is available', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-1');
      expect(dropHop?.reason).toBe('no-route');
    });
  });
});
