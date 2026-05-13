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
      expect.arrayContaining([
        'node.route.add',
        'interface.mtu',
        'link.state',
        'link.qos',
        'link.shaper',
        'link.lacp',
        'link.wireless',
        'node.wifi',
        'node.gre',
        'node.mpls-vrf',
        'node.vxlan-vni',
        'node.vrrp',
        'node.netflow',
        'node.sflow',
      ]),
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

  it('updates link QoS through edge data', () => {
    const result = apply({
      kind: 'link.qos',
      target: { kind: 'edge', edgeId: 'e1' },
      before: null,
      after: {
        bandwidthBps: 1_000_000,
        propagationDelayMs: 20,
        lossPct: 5,
        queueDepthSegments: 100,
        lossSeed: 42,
      },
    });

    expect(result.topology.edges[0]?.data?.link).toEqual({
      bandwidthBps: 1_000_000,
      propagationDelayMs: 20,
      lossPct: 5,
      queueDepthSegments: 100,
      lossSeed: 42,
    });
  });

  it('rejects lossy link QoS edits without a seed before mutating the snapshot', () => {
    try {
      apply({
        kind: 'link.qos',
        target: { kind: 'edge', edgeId: 'e1' },
        before: null,
        after: { lossPct: 5 },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'link-qos/missing-seed' });
      return;
    }

    throw new Error('expected link.qos edit to throw without lossSeed');
  });

  it('updates link shaper config through edge data', () => {
    const result = apply({
      kind: 'link.shaper',
      target: { kind: 'edge', edgeId: 'e1' },
      before: null,
      after: {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    });

    expect(result.topology.edges[0]?.data?.link?.shaper?.classes[0]?.id).toBe('ef');
  });

  it('rejects link shaper configs without a default class', () => {
    try {
      apply({
        kind: 'link.shaper',
        target: { kind: 'edge', edgeId: 'e1' },
        before: null,
        after: {
          classes: [{ id: 'ef', dscp: [46], weightPct: 100, queueDepthSegments: 8 }],
        },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'link-shaper/no-default' });
      return;
    }

    throw new Error('expected link.shaper edit to throw without a default class');
  });

  it('updates node observability configs through node data', () => {
    const result = EditSession.empty()
      .push({
        kind: 'node.netflow',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: { enabled: true, inactiveTimeoutMs: 15_000 },
      })
      .push({
        kind: 'node.sflow',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: { enabled: true, rate: 4 },
      })
      .apply(fromEngine(new SimulationEngine(makeTopology(), new HookEngine())));

    expect(result.topology.nodes[0]?.data.netflow).toEqual({
      enabled: true,
      inactiveTimeoutMs: 15_000,
    });
    expect(result.topology.nodes[0]?.data.sflow).toEqual({ enabled: true, rate: 4 });
  });

  it('updates interface VRRP config on the target router interface', () => {
    const result = apply({
      kind: 'node.vrrp',
      target: { kind: 'interface', nodeId: 'r1', ifaceId: 'eth0' },
      before: null,
      after: {
        vrid: 10,
        virtualIp: '10.0.0.254',
        priority: 120,
        advertIntervalMs: 1000,
      },
    });

    expect(result.topology.nodes[0]?.data.interfaces?.[0]?.vrrp).toEqual({
      vrid: 10,
      virtualIp: '10.0.0.254',
      priority: 120,
      advertIntervalMs: 1000,
    });
  });

  it('updates LACP config on the target switch port', () => {
    const topology = makeTopology();
    topology.nodes.push({
      id: 'sw1',
      type: 'switch',
      position: { x: 100, y: 0 },
      data: {
        label: 'SW1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          {
            id: 'fa0/1',
            name: 'fa0/1',
            macAddress: '00:00:00:00:10:01',
          },
        ],
      },
    });
    const engine = new SimulationEngine(topology, new HookEngine());
    const snapshot = fromEngine(engine);

    const result = EditSession.empty()
      .push({
        kind: 'link.lacp',
        target: { kind: 'node', nodeId: 'sw1' },
        portId: 'fa0/1',
        before: null,
        after: {
          key: 100,
          systemId: '00:00:00:00:10:ff',
          mode: 'active',
          fastTimer: true,
          channelId: 'po1',
        },
      })
      .apply(snapshot);

    expect(result.topology.nodes[1]?.data.ports?.[0]?.lacp).toEqual({
      key: 100,
      systemId: '00:00:00:00:10:ff',
      mode: 'active',
      fastTimer: true,
      channelId: 'po1',
    });
  });

  it('updates wireless node and link configs', () => {
    const topology = makeTopology();
    topology.nodes[0] = {
      ...topology.nodes[0]!,
      data: { ...topology.nodes[0]!.data, role: 'access-point' },
    };
    const snapshot = fromEngine(new SimulationEngine(topology, new HookEngine()));

    const result = EditSession.empty()
      .push({
        kind: 'node.wifi',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: {
          role: 'access-point',
          ssid: 'netlab-wifi',
          psk: 'correct horse battery staple',
        },
      })
      .push({
        kind: 'link.wireless',
        target: { kind: 'edge', edgeId: 'e1' },
        before: null,
        after: {
          ssid: 'netlab-wifi',
          channel: 6,
          bandMhz: 2437,
          txPowerDbm: 20,
          lossSeed: 12,
        },
      })
      .apply(snapshot);

    expect(result.topology.nodes[0]?.data.wifi).toEqual({
      role: 'access-point',
      ssid: 'netlab-wifi',
      psk: 'correct horse battery staple',
    });
    expect(result.topology.edges[0]?.data?.wireless).toEqual({
      ssid: 'netlab-wifi',
      channel: 6,
      bandMhz: 2437,
      txPowerDbm: 20,
      lossSeed: 12,
    });
  });

  it('updates GRE, MPLS VRF, and VXLAN VNI configs', () => {
    const result = EditSession.empty()
      .push({
        kind: 'node.gre',
        target: { kind: 'interface', nodeId: 'r1', ifaceId: 'eth0' },
        before: null,
        after: { sourceIp: '198.51.100.1', destinationIp: '198.51.100.2', key: 100 },
      })
      .push({
        kind: 'node.mpls-vrf',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: {
          name: 'blue',
          rd: { type: 0, value: '65000:10' },
          importRts: [{ type: 0x0002, value: '65000:10' }],
          exportRts: [{ type: 0x0002, value: '65000:10' }],
          attachedInterfaces: ['eth0'],
        },
      })
      .push({
        kind: 'node.vxlan-vni',
        target: { kind: 'node', nodeId: 'r1' },
        before: null,
        after: {
          vni: 10000,
          sourceVtepIp: '192.0.2.1',
          peerVtepIps: ['192.0.2.2'],
          arpSuppression: true,
        },
      })
      .apply(fromEngine(new SimulationEngine(makeTopology(), new HookEngine())));

    expect(result.topology.nodes[0]?.data.interfaces?.[0]?.greTunnel).toEqual({
      sourceIp: '198.51.100.1',
      destinationIp: '198.51.100.2',
      key: 100,
    });
    expect(result.topology.nodes[0]?.data.vrfs?.[0]?.name).toBe('blue');
    expect(result.topology.nodes[0]?.data.vtep).toEqual({
      vni: 10000,
      sourceVtepIp: '192.0.2.1',
      peerVtepIps: ['192.0.2.2'],
      arpSuppression: true,
    });
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
