// @vitest-environment node
/**
 * The settings a learner may change: applying them, reading them back, and
 * telling which ones differ from the start. TC ids are allocated by the spec
 * lane (see the plan); none exist yet.
 */

import { describe, expect, it } from 'vitest';
import type { AclRule } from '../../../src/types/acl';
import type { TopologySnapshot } from '../../../src/types/topology';
import {
  DIAMOND_NETS,
  lanBehindRouter,
  ospfDiamond,
  routerChain,
  switchTriangle,
  trunkedSwitches,
  vlanSwitch,
  withInterface,
  withLinkState,
  withNodeData,
} from '../templates/shared/build';
import {
  applyChanges,
  applyChangesReporting,
  differsOutside,
  diffSettings,
  isAllowed,
  readSetting,
} from './settings';
import type { SettingChange, SettingRef } from './types';

const permitAll: AclRule = { id: 'all', priority: 10, action: 'permit', protocol: 'any' };
const denyPing: AclRule = { id: 'no-ping', priority: 5, action: 'deny', protocol: 'icmp' };

const nodeData = (topology: TopologySnapshot, nodeId: string) =>
  topology.nodes.find((node) => node.id === nodeId)?.data;
const ifaceOf = (topology: TopologySnapshot, nodeId: string, ifaceId: string) =>
  nodeData(topology, nodeId)?.interfaces?.find((entry) => entry.id === ifaceId);
const portOf = (topology: TopologySnapshot, nodeId: string, portId: string) =>
  nodeData(topology, nodeId)?.ports?.find((entry) => entry.id === portId);

/** One case per setting kind: a start, a change, and a second change that puts the start value back. */
const CASES: readonly {
  readonly name: string;
  readonly start: () => TopologySnapshot;
  readonly change: SettingChange;
  readonly undo: SettingChange;
}[] = [
  {
    name: 'host-ip',
    start: lanBehindRouter,
    change: { kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.50' },
    undo: { kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.10' },
  },
  {
    name: 'host-ip cleared',
    start: lanBehindRouter,
    change: { kind: 'host-ip', nodeId: 'pc1', ip: null },
    undo: { kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.10' },
  },
  {
    name: 'iface-address',
    start: lanBehindRouter,
    change: {
      kind: 'iface-address',
      nodeId: 'r1',
      ifaceId: 'lan',
      ipAddress: '192.168.9.1',
      prefixLength: 25,
    },
    undo: {
      kind: 'iface-address',
      nodeId: 'r1',
      ifaceId: 'lan',
      ipAddress: '192.168.1.1',
      prefixLength: 24,
    },
  },
  {
    name: 'static-routes',
    start: routerChain,
    change: {
      kind: 'static-routes',
      nodeId: 'r1',
      routes: [{ destination: '10.0.2.0/24', nextHop: '10.0.12.2' }],
    },
    undo: { kind: 'static-routes', nodeId: 'r1', routes: [] },
  },
  {
    name: 'port-vlan (access)',
    start: vlanSwitch,
    change: { kind: 'port-vlan', nodeId: 'sw1', portId: 'p3', vlanMode: 'access', accessVlan: 10 },
    undo: { kind: 'port-vlan', nodeId: 'sw1', portId: 'p3', vlanMode: 'access', accessVlan: 20 },
  },
  {
    name: 'port-vlan (trunk)',
    start: trunkedSwitches,
    change: {
      kind: 'port-vlan',
      nodeId: 'sw1',
      portId: 't',
      vlanMode: 'trunk',
      trunkAllowedVlans: [10],
    },
    undo: {
      kind: 'port-vlan',
      nodeId: 'sw1',
      portId: 't',
      vlanMode: 'trunk',
      trunkAllowedVlans: [20, 10],
    },
  },
  {
    name: 'stp-priority',
    start: switchTriangle,
    change: { kind: 'stp-priority', nodeId: 'swc', priority: 0 },
    undo: { kind: 'stp-priority', nodeId: 'swc', priority: 32768 },
  },
  {
    name: 'stp-port',
    start: switchTriangle,
    change: { kind: 'stp-port', nodeId: 'swa', portId: 'to-swb', enabled: false },
    undo: { kind: 'stp-port', nodeId: 'swa', portId: 'to-swb', enabled: true },
  },
  {
    name: 'link-state',
    start: lanBehindRouter,
    change: { kind: 'link-state', edgeId: 'e-up', state: 'down' },
    undo: { kind: 'link-state', edgeId: 'e-up', state: 'up' },
  },
  {
    name: 'ospf-cost',
    start: ospfDiamond,
    change: { kind: 'ospf-cost', nodeId: 'r1', network: DIAMOND_NETS.top1, cost: 50 },
    undo: { kind: 'ospf-cost', nodeId: 'r1', network: DIAMOND_NETS.top1, cost: 1 },
  },
  {
    name: 'iface-acl',
    start: lanBehindRouter,
    change: {
      kind: 'iface-acl',
      nodeId: 'r1',
      ifaceId: 'lan',
      direction: 'inbound',
      rules: [denyPing, permitAll],
    },
    undo: { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'lan', direction: 'inbound', rules: [] },
  },
  {
    name: 'iface-nat',
    start: lanBehindRouter,
    change: { kind: 'iface-nat', nodeId: 'r1', ifaceId: 'lan', nat: 'inside' },
    undo: { kind: 'iface-nat', nodeId: 'r1', ifaceId: 'lan', nat: null },
  },
];

describe.each(CASES)('$name', ({ start, change, undo }) => {
  const allowed: SettingRef[] = [change];

  it('applies and reads back the value it was given', () => {
    const changed = applyChanges(start(), [change]);
    expect(readSetting(changed, change)).toEqual(change);
  });

  it('does not mutate the start topology', () => {
    const topology = start();
    const before = JSON.stringify(topology);
    applyChanges(topology, [change, undo]);
    expect(JSON.stringify(topology)).toBe(before);
  });

  it('is reported by diffSettings, and undoing it counts as no change', () => {
    const topology = start();
    expect(diffSettings(topology, topology, allowed)).toEqual([]);
    expect(diffSettings(topology, applyChanges(topology, [change]), allowed)).toEqual(allowed);
    expect(diffSettings(topology, applyChanges(topology, [change, undo]), allowed)).toEqual([]);
  });

  it('is inside the allow-list when listed and outside it when not', () => {
    const topology = start();
    const changed = applyChanges(topology, [change]);
    expect(isAllowed(change, allowed)).toBe(true);
    expect(isAllowed(change, [])).toBe(false);
    expect(differsOutside(topology, changed, allowed)).toBe(false);
    expect(differsOutside(topology, changed, [])).toBe(true);
    expect(differsOutside(topology, applyChanges(topology, [change, undo]), allowed)).toBe(false);
  });
});

describe('what applyChanges writes', () => {
  it('an empty ACL rule list deletes the property (an empty array would deny everything)', () => {
    const filtered = withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl: [denyPing] });
    const cleared = applyChanges(filtered, [
      { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'lan', direction: 'inbound', rules: [] },
    ]);
    expect(ifaceOf(cleared, 'r1', 'lan')).not.toHaveProperty('inboundAcl');

    const outbound = applyChanges(lanBehindRouter(), [
      { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'wan', direction: 'outbound', rules: [denyPing] },
    ]);
    expect(ifaceOf(outbound, 'r1', 'wan')?.outboundAcl).toEqual([denyPing]);
    expect(ifaceOf(outbound, 'r1', 'wan')).not.toHaveProperty('inboundAcl');
  });

  it('host-ip null removes the address; iface-nat null removes the marking', () => {
    const cleared = applyChanges(withInterface(lanBehindRouter(), 'r1', 'lan', { nat: 'inside' }), [
      { kind: 'host-ip', nodeId: 'pc1', ip: null },
      { kind: 'iface-nat', nodeId: 'r1', ifaceId: 'lan', nat: null },
    ]);
    expect(nodeData(cleared, 'pc1')).not.toHaveProperty('ip');
    expect(ifaceOf(cleared, 'r1', 'lan')).not.toHaveProperty('nat');
  });

  it('stp-port toggles membership of disabledPortIds and keeps the priority', () => {
    const shut = applyChanges(switchTriangle(), [
      { kind: 'stp-port', nodeId: 'swa', portId: 'to-swb', enabled: false },
      { kind: 'stp-port', nodeId: 'swa', portId: 'to-swb', enabled: false },
    ]);
    expect(nodeData(shut, 'swa')?.stpConfig).toEqual({
      priority: 4096,
      disabledPortIds: ['to-swb'],
    });
    const open = applyChanges(shut, [
      { kind: 'stp-port', nodeId: 'swa', portId: 'to-swb', enabled: true },
    ]);
    expect(nodeData(open, 'swa')?.stpConfig).toEqual({ priority: 4096 });
  });

  it('a trunk change replaces the access VLAN, and an access change replaces the allowed list', () => {
    const trunk = applyChanges(vlanSwitch(), [
      {
        kind: 'port-vlan',
        nodeId: 'sw1',
        portId: 'p1',
        vlanMode: 'trunk',
        trunkAllowedVlans: [10],
      },
    ]);
    expect(portOf(trunk, 'sw1', 'p1')).toMatchObject({
      vlanMode: 'trunk',
      trunkAllowedVlans: [10],
    });
    expect(portOf(trunk, 'sw1', 'p1')).not.toHaveProperty('accessVlan');

    const access = applyChanges(trunkedSwitches(), [
      { kind: 'port-vlan', nodeId: 'sw1', portId: 't', vlanMode: 'access', accessVlan: 10 },
    ]);
    expect(portOf(access, 'sw1', 't')).toMatchObject({ vlanMode: 'access', accessVlan: 10 });
    expect(portOf(access, 'sw1', 't')).not.toHaveProperty('trunkAllowedVlans');
  });

  it('an OSPF cost on a network that shares an entry gets an entry of its own', () => {
    const shared = withNodeData(ospfDiamond(), 'r1', {
      ospfConfig: {
        routerId: '1.1.1.1',
        areas: [
          {
            areaId: '0.0.0.0',
            networks: [DIAMOND_NETS.left, DIAMOND_NETS.top1, DIAMOND_NETS.bottom1],
          },
        ],
      },
    });
    const raised = applyChanges(shared, [
      { kind: 'ospf-cost', nodeId: 'r1', network: DIAMOND_NETS.top1, cost: 50 },
    ]);
    expect(nodeData(raised, 'r1')?.ospfConfig?.areas).toEqual([
      { areaId: '0.0.0.0', networks: [DIAMOND_NETS.top1], cost: 50 },
      { areaId: '0.0.0.0', networks: [DIAMOND_NETS.left, DIAMOND_NETS.bottom1] },
    ]);
    const bottom: SettingRef = { kind: 'ospf-cost', nodeId: 'r1', network: DIAMOND_NETS.bottom1 };
    expect(readSetting(raised, bottom)).toMatchObject({ cost: 1 });
    expect(diffSettings(shared, raised, [bottom])).toEqual([]);
  });

  it('static-routes replaces the whole list', () => {
    const first = applyChanges(routerChain(), [
      {
        kind: 'static-routes',
        nodeId: 'r1',
        routes: [{ destination: '10.0.2.0/24', nextHop: '10.0.12.2' }],
      },
      {
        kind: 'static-routes',
        nodeId: 'r1',
        routes: [{ destination: '0.0.0.0/0', nextHop: '10.0.12.2' }],
      },
    ]);
    expect(nodeData(first, 'r1')?.staticRoutes).toEqual([
      { destination: '0.0.0.0/0', nextHop: '10.0.12.2' },
    ]);
  });
});

describe('targets that do not exist', () => {
  const MISSING: readonly SettingChange[] = [
    { kind: 'host-ip', nodeId: 'nobody', ip: '10.0.0.1' },
    {
      kind: 'iface-address',
      nodeId: 'r1',
      ifaceId: 'nope',
      ipAddress: '10.0.0.1',
      prefixLength: 24,
    },
    { kind: 'static-routes', nodeId: 'nobody', routes: [] },
    { kind: 'port-vlan', nodeId: 'sw1', portId: 'nope', vlanMode: 'access', accessVlan: 10 },
    { kind: 'stp-priority', nodeId: 'pc1', priority: 0 },
    { kind: 'stp-port', nodeId: 'sw1', portId: 'nope', enabled: false },
    { kind: 'link-state', edgeId: 'nope', state: 'down' },
    { kind: 'ospf-cost', nodeId: 'r1', network: '10.9.9.0/24', cost: 5 },
    { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'nope', direction: 'inbound', rules: [permitAll] },
    { kind: 'iface-nat', nodeId: 'pc1', ifaceId: 'lan', nat: 'inside' },
  ];

  it('are ignored and reported, never thrown, and the rest still applies', () => {
    const start = lanBehindRouter();
    const good: SettingChange = { kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.50' };
    const result = applyChangesReporting(start, [...MISSING, good]);
    expect(result.ignored).toEqual(MISSING);
    expect(result.topology).toEqual(applyChanges(start, [good]));
    expect(nodeData(result.topology, 'pc1')?.ip).toBe('192.168.1.50');
  });

  it('read as null', () => {
    for (const change of MISSING) expect(readSetting(lanBehindRouter(), change)).toBeNull();
  });
});

describe('diffSettings compares values, not representations', () => {
  it('the order of allowed VLANs and of static routes has no meaning', () => {
    const trunk: SettingRef = { kind: 'port-vlan', nodeId: 'sw1', portId: 't' };
    expect(diffSettings(trunkedSwitches([10, 20]), trunkedSwitches([20, 10]), [trunk])).toEqual([]);

    const routes: SettingRef = { kind: 'static-routes', nodeId: 'r1' };
    const a = { destination: '10.0.2.0/24', nextHop: '10.0.12.2' };
    const b = { destination: '0.0.0.0/0', nextHop: '10.0.12.2', metric: 5 };
    expect(
      diffSettings(
        withNodeData(routerChain(), 'r1', { staticRoutes: [a, b] }),
        withNodeData(routerChain(), 'r1', { staticRoutes: [b, a] }),
        [routes],
      ),
    ).toEqual([]);
  });

  it('the order of ACL rules matters', () => {
    const acl: SettingRef = {
      kind: 'iface-acl',
      nodeId: 'r1',
      ifaceId: 'lan',
      direction: 'inbound',
    };
    expect(
      diffSettings(
        withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl: [denyPing, permitAll] }),
        withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl: [permitAll, denyPing] }),
        [acl],
      ),
    ).toEqual([acl]);
  });

  it('an untagged port equals an access port in VLAN 1; an absent priority equals 32768', () => {
    const port: SettingRef = { kind: 'port-vlan', nodeId: 'sw1', portId: 'p1' };
    const start = lanBehindRouter();
    const explicit = applyChanges(start, [{ ...port, vlanMode: 'access', accessVlan: 1 }]);
    expect(diffSettings(start, explicit, [port])).toEqual([]);

    const priority: SettingRef = { kind: 'stp-priority', nodeId: 'sw1' };
    const same = applyChanges(start, [{ ...priority, priority: 32768 }]);
    expect(diffSettings(start, same, [priority])).toEqual([]);
    expect(differsOutside(start, same, [priority])).toBe(false);
  });

  it('only allowed settings are reported', () => {
    const start = lanBehindRouter();
    const changed = applyChanges(start, [
      { kind: 'host-ip', nodeId: 'pc1', ip: '192.168.1.50' },
      { kind: 'host-ip', nodeId: 'pc2', ip: '192.168.1.51' },
    ]);
    expect(diffSettings(start, changed, [{ kind: 'host-ip', nodeId: 'pc1' }])).toEqual([
      { kind: 'host-ip', nodeId: 'pc1' },
    ]);
  });
});

describe('differsOutside: states a SettingChange cannot express are never hidden', () => {
  const acl: SettingRef = { kind: 'iface-acl', nodeId: 'r1', ifaceId: 'lan', direction: 'inbound' };
  const edge: SettingRef = { kind: 'link-state', edgeId: 'e-up' };

  it('an empty ACL array written by hand is a change, even with the ACL on the allow-list', () => {
    const start = lanBehindRouter();
    const denyAll = withInterface(start, 'r1', 'lan', { inboundAcl: [] });
    expect(readSetting(denyAll, acl)).toBeNull();
    expect(diffSettings(start, denyAll, [acl])).toEqual([acl]);
    expect(differsOutside(start, denyAll, [acl])).toBe(true);
  });

  it('a "blocked" link is not "up"', () => {
    const start = lanBehindRouter();
    const blocked = {
      ...start,
      edges: start.edges.map((entry) =>
        entry.id === 'e-up' ? { ...entry, data: { state: 'blocked' as const } } : entry,
      ),
    };
    expect(differsOutside(start, blocked, [edge])).toBe(true);
    expect(differsOutside(start, withLinkState(start, 'e-up', 'down'), [edge])).toBe(false);
  });

  it('a removed node, a moved cable and a new routing protocol are all outside', () => {
    const start = lanBehindRouter();
    const allowed: SettingRef[] = [{ kind: 'host-ip', nodeId: 'pc1' }];
    expect(
      differsOutside(
        start,
        { ...start, nodes: start.nodes.filter((n) => n.id !== 'pc2') },
        allowed,
      ),
    ).toBe(true);
    expect(differsOutside(start, { ...start, edges: start.edges.slice(1) }, allowed)).toBe(true);
    expect(
      differsOutside(
        start,
        withNodeData(start, 'r1', { ripConfig: { version: 2, networks: ['192.168.1.0/24'] } }),
        allowed,
      ),
    ).toBe(true);
  });
});
