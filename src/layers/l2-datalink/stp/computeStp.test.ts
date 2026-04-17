import { describe, expect, it } from 'vitest';
import type { NetlabEdge, NetlabNode, NetworkTopology, SwitchPort } from '../../../types/topology';
import { computeStp } from './computeStp';

function makeSwitch(
  id: string,
  ports: SwitchPort[],
  priority?: number,
  disabledPortIds?: string[],
): NetlabNode {
  return {
    id,
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'switch',
      layerId: 'l2',
      ports,
      stpConfig:
        priority === undefined && !disabledPortIds?.length
          ? undefined
          : {
              priority,
              disabledPortIds,
            },
    },
  };
}

function makeLeaf(id: string, role: 'client' | 'server' | 'router'): NetlabNode {
  return {
    id,
    type: role,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role,
      layerId: role === 'router' ? 'l3' : 'l7',
      ip: '10.0.0.1',
      mac: '02:00:00:ff:ff:ff',
      interfaces: role === 'router'
        ? [{
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '02:00:00:ff:ff:fe',
          }]
        : undefined,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): NetlabEdge {
  return { id, source, target, sourceHandle, targetHandle };
}

function makeTopology(nodes: NetlabNode[], edges: NetlabEdge[]): NetworkTopology {
  return {
    nodes,
    edges,
    areas: [],
    routeTables: new Map(),
  };
}

function getPort(result: ReturnType<typeof computeStp>, switchNodeId: string, portId: string) {
  const port = result.ports.get(`${switchNodeId}:${portId}`);
  expect(port).toBeDefined();
  if (!port) {
    throw new Error(`missing STP port runtime for ${switchNodeId}:${portId}`);
  }

  return port;
}

function countPortsByRole(result: ReturnType<typeof computeStp>, role: string) {
  return [...result.ports.values()].filter((port) => port.role === role).length;
}

function makeTriangleTopology(options?: {
  priorities?: Partial<Record<'switch-a' | 'switch-b' | 'switch-c', number>>;
  disabledPortIds?: Partial<Record<'switch-a' | 'switch-b' | 'switch-c', string[]>>;
}): NetworkTopology {
  const priorities = options?.priorities ?? {};
  const disabledPortIds = options?.disabledPortIds ?? {};

  return makeTopology(
    [
      makeLeaf('host-a', 'client'),
      makeLeaf('host-b', 'client'),
      makeLeaf('host-c', 'client'),
      makeSwitch(
        'switch-a',
        [
          { id: 'ab', name: 'fa0/1', macAddress: '02:00:00:0a:00:01' },
          { id: 'ac', name: 'fa0/2', macAddress: '02:00:00:0a:00:02' },
          { id: 'ah', name: 'fa0/3', macAddress: '02:00:00:0a:00:03' },
        ],
        priorities['switch-a'],
        disabledPortIds['switch-a'],
      ),
      makeSwitch(
        'switch-b',
        [
          { id: 'ba', name: 'fa0/1', macAddress: '02:00:00:0b:00:01' },
          { id: 'bc', name: 'fa0/2', macAddress: '02:00:00:0b:00:02' },
          { id: 'bh', name: 'fa0/3', macAddress: '02:00:00:0b:00:03' },
        ],
        priorities['switch-b'],
        disabledPortIds['switch-b'],
      ),
      makeSwitch(
        'switch-c',
        [
          { id: 'ca', name: 'fa0/1', macAddress: '02:00:00:0c:00:01' },
          { id: 'cb', name: 'fa0/2', macAddress: '02:00:00:0c:00:02' },
          { id: 'ch', name: 'fa0/3', macAddress: '02:00:00:0c:00:03' },
        ],
        priorities['switch-c'],
        disabledPortIds['switch-c'],
      ),
    ],
    [
      makeEdge('e-ab', 'switch-a', 'switch-b', 'ab', 'ba'),
      makeEdge('e-ac', 'switch-a', 'switch-c', 'ac', 'ca'),
      makeEdge('e-bc', 'switch-b', 'switch-c', 'bc', 'cb'),
      makeEdge('e-ah', 'host-a', 'switch-a', undefined, 'ah'),
      makeEdge('e-bh', 'host-b', 'switch-b', undefined, 'bh'),
      makeEdge('e-ch', 'host-c', 'switch-c', undefined, 'ch'),
    ],
  );
}

describe('computeStp', () => {
  describe('topology without loops', () => {
    it('no switches → root is null, ports map is empty', () => {
      const result = computeStp(makeTopology([
        makeLeaf('client-1', 'client'),
        makeLeaf('server-1', 'server'),
      ], [
        makeEdge('e1', 'client-1', 'server-1'),
      ]));

      expect(result.root).toBeNull();
      expect(result.ports.size).toBe(0);
    });

    it('single switch → every port is DESIGNATED / FORWARDING (no loop possible)', () => {
      const result = computeStp(makeTopology(
        [
          makeSwitch('switch-1', [
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
            { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
            { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
          ], 4096),
        ],
        [],
      ));

      expect(result.root).toEqual({ priority: 4096, mac: '02:00:00:10:00:01' });
      expect([...result.ports.values()].every((port) =>
        port.role === 'DESIGNATED' && port.state === 'FORWARDING'
      )).toBe(true);
    });

    it('linear chain of switches → every port is ROOT or DESIGNATED; zero BLOCKED', () => {
      const result = computeStp(makeTopology(
        [
          makeSwitch('switch-a', [
            { id: 'ab', name: 'fa0/1', macAddress: '02:00:00:0a:00:01' },
          ], 4096),
          makeSwitch('switch-b', [
            { id: 'ba', name: 'fa0/1', macAddress: '02:00:00:0b:00:01' },
            { id: 'bc', name: 'fa0/2', macAddress: '02:00:00:0b:00:02' },
          ]),
          makeSwitch('switch-c', [
            { id: 'cb', name: 'fa0/1', macAddress: '02:00:00:0c:00:01' },
          ]),
        ],
        [
          makeEdge('e-ab', 'switch-a', 'switch-b', 'ab', 'ba'),
          makeEdge('e-bc', 'switch-b', 'switch-c', 'bc', 'cb'),
        ],
      ));

      expect(countPortsByRole(result, 'BLOCKED')).toBe(0);
      expect(getPort(result, 'switch-a', 'ab').role).toBe('DESIGNATED');
      expect(getPort(result, 'switch-b', 'ba').role).toBe('ROOT');
      expect(getPort(result, 'switch-b', 'bc').role).toBe('DESIGNATED');
      expect(getPort(result, 'switch-c', 'cb').role).toBe('ROOT');
    });

    it('star topology (one switch + leaves) → all ports DESIGNATED', () => {
      const result = computeStp(makeTopology(
        [
          makeLeaf('client-1', 'client'),
          makeLeaf('client-2', 'client'),
          makeLeaf('router-1', 'router'),
          makeSwitch('switch-1', [
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
            { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
            { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
          ], 4096),
        ],
        [
          makeEdge('e1', 'client-1', 'switch-1', undefined, 'p1'),
          makeEdge('e2', 'client-2', 'switch-1', undefined, 'p2'),
          makeEdge('e3', 'switch-1', 'router-1', 'p3', 'eth0'),
        ],
      ));

      expect([...result.ports.values()].every((port) => port.role === 'DESIGNATED')).toBe(true);
    });
  });

  describe('topology with a loop (triangle of switches)', () => {
    it('elects the lowest-BridgeId switch as root', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096 },
      }));

      expect(result.root).toEqual({ priority: 4096, mac: '02:00:00:0a:00:01' });
    });

    it('produces exactly one BLOCKED port on the triangle', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096 },
      }));

      expect(countPortsByRole(result, 'BLOCKED')).toBe(1);
    });

    it('the BLOCKED port is on the bridge with the higher BridgeId on the contested segment', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096 },
      }));

      expect(getPort(result, 'switch-b', 'bc').role).toBe('DESIGNATED');
      expect(getPort(result, 'switch-c', 'cb').role).toBe('BLOCKED');
      expect(getPort(result, 'switch-c', 'cb').state).toBe('BLOCKING');
    });

    it('respects stpConfig.priority overrides (forcing a different root changes which port blocks)', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096, 'switch-c': 0 },
      }));

      expect(result.root).toEqual({ priority: 0, mac: '02:00:00:0c:00:01' });
      expect(getPort(result, 'switch-b', 'ba').role).toBe('BLOCKED');
      expect(getPort(result, 'switch-c', 'cb').role).toBe('DESIGNATED');
    });
  });

  describe('port roles on mixed switch-to-leaf links', () => {
    it('switch port connected to a router is DESIGNATED (never BLOCKED)', () => {
      const result = computeStp(makeTopology(
        [
          makeLeaf('router-1', 'router'),
          makeSwitch('switch-1', [
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
          ], 4096),
        ],
        [
          makeEdge('e1', 'switch-1', 'router-1', 'p1', 'eth0'),
        ],
      ));

      expect(getPort(result, 'switch-1', 'p1').role).toBe('DESIGNATED');
    });

    it('switch port connected to a host is DESIGNATED', () => {
      const result = computeStp(makeTopology(
        [
          makeLeaf('client-1', 'client'),
          makeSwitch('switch-1', [
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
          ], 4096),
        ],
        [
          makeEdge('e1', 'client-1', 'switch-1', undefined, 'p1'),
        ],
      ));

      expect(getPort(result, 'switch-1', 'p1').role).toBe('DESIGNATED');
    });
  });

  describe('disabled ports', () => {
    it('ports listed in stpConfig.disabledPortIds are DISABLED / DISABLED', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096 },
        disabledPortIds: { 'switch-b': ['ba'] },
      }));

      expect(getPort(result, 'switch-b', 'ba').role).toBe('DISABLED');
      expect(getPort(result, 'switch-b', 'ba').state).toBe('DISABLED');
    });

    it('disabled ports do not participate in root-path calculation', () => {
      const result = computeStp(makeTriangleTopology({
        priorities: { 'switch-a': 4096 },
        disabledPortIds: { 'switch-b': ['ba'] },
      }));

      expect(getPort(result, 'switch-b', 'bc').role).toBe('ROOT');
      expect(getPort(result, 'switch-b', 'bc').rootPathCost).toBe(38);
    });
  });

  describe('regression: looproot topologies', () => {
    it('a topology equivalent to demo/basic/MinimalDemo.tsx produces zero BLOCKED ports', () => {
      const result = computeStp(makeTopology(
        [
          {
            id: 'client-1',
            type: 'client',
            position: { x: 0, y: 0 },
            data: {
              label: 'Client',
              role: 'client',
              layerId: 'l7',
              ip: '10.0.0.1',
            },
          },
          {
            id: 'server-1',
            type: 'server',
            position: { x: 0, y: 0 },
            data: {
              label: 'Server',
              role: 'server',
              layerId: 'l7',
              ip: '10.0.0.2',
            },
          },
        ],
        [
          makeEdge('e1', 'client-1', 'server-1'),
        ],
      ));

      expect(countPortsByRole(result, 'BLOCKED')).toBe(0);
    });
  });
});
