import { describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { NetworkTopology } from '../types/topology';
import { EditSession } from './EditSession';
import { fromEngine } from './SimulationSnapshot';
import type { Edit } from './edits';
import { registeredKinds } from './edits';

function makeTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R1',
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
          staticRoutes: [],
        },
      },
    ],
    edges: [{ id: 'e1', source: 'r1', target: 'host-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

function apply(edit: Edit) {
  const engine = new SimulationEngine(makeTopology(), new HookEngine());
  const snapshot = fromEngine(engine);
  return EditSession.empty().push(edit).apply(snapshot);
}

describe('Axis B sandbox reducers', () => {
  it('registers node, interface, and link edit kinds', () => {
    expect(registeredKinds()).toEqual(
      expect.arrayContaining(['node.route.add', 'interface.mtu', 'link.state']),
    );
  });

  it('adds a static route to the target node topology', () => {
    const result = apply({
      kind: 'node.route.add',
      target: { kind: 'node', nodeId: 'r1' },
      route: {
        id: 'route-1',
        prefix: '203.0.113.0/24',
        nextHop: '10.0.0.254',
        outInterface: 'eth0',
        metric: 10,
      },
    });

    expect(result.topology.nodes[0]?.data.staticRoutes).toContainEqual(
      expect.objectContaining({
        id: 'route-1',
        destination: '203.0.113.0/24',
        nextHop: '10.0.0.254',
        metric: 10,
        outInterface: 'eth0',
      }),
    );
  });

  it('updates an interface MTU on the target router interface', () => {
    const result = apply({
      kind: 'interface.mtu',
      target: { kind: 'interface', nodeId: 'r1', ifaceId: 'eth0' },
      before: 1500,
      after: 900,
    });

    expect(result.topology.nodes[0]?.data.interfaces?.[0]?.mtu).toBe(900);
  });

  it('marks a link down through edge data', () => {
    const result = apply({
      kind: 'link.state',
      target: { kind: 'edge', edgeId: 'e1' },
      before: 'up',
      after: 'down',
    });

    expect(result.topology.edges[0]?.data?.state).toBe('down');
  });

  it('stores sandbox NAT and ACL rules on the target node', () => {
    const result = EditSession.empty()
      .push({
        kind: 'node.nat.add',
        target: { kind: 'node', nodeId: 'r1' },
        rule: {
          id: 'nat-1',
          kind: 'snat',
          matchSrc: '10.0.0.0/24',
          translateTo: '203.0.113.10',
          outInterface: 'eth0',
        },
      })
      .push({
        kind: 'node.acl.add',
        target: { kind: 'node', nodeId: 'r1' },
        rule: {
          id: 'acl-1',
          action: 'deny',
          matchDst: '198.51.100.0/24',
          proto: 'tcp',
          dstPort: 22,
          order: 20,
        },
      })
      .apply(fromEngine(new SimulationEngine(makeTopology(), new HookEngine())));

    expect(result.topology.nodes[0]?.data.sandboxNatRules).toEqual([
      expect.objectContaining({ id: 'nat-1' }),
    ]);
    expect(result.topology.nodes[0]?.data.sandboxAclRules).toEqual([
      expect.objectContaining({ id: 'acl-1' }),
    ]);
  });
});
