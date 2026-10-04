/**
 * The settings a learner may change, as pure functions over a topology.
 *
 * The page keeps a list of `SettingChange`s and the topology on screen is
 * always `applyChanges(exercise.start, changes)`. Nothing here mutates its
 * input, and nothing throws: a change whose target does not exist is ignored
 * and reported by `applyChangesReporting`.
 */

import type { RouterInterface } from '../../../src/types/routing';
import type {
  NetlabNodeData,
  StpConfig,
  SwitchPort,
  TopologySnapshot,
} from '../../../src/types/topology';
import type { SettingChange, SettingRef } from './types';

/** What the engine assumes when the field is absent. */
const DEFAULT_ACCESS_VLAN = 1;
const DEFAULT_STP_PRIORITY = 32768;
const DEFAULT_OSPF_COST = 1;

// --- Applying ----------------------------------------------------------------

type Edit<T> = (value: T) => T | null;

/** `null` when the node is missing or `edit` finds nothing to change. */
function editNode(
  topology: TopologySnapshot,
  nodeId: string,
  edit: Edit<NetlabNodeData>,
): TopologySnapshot | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const data = node ? edit(node.data) : null;
  if (!node || data === null) return null;
  return {
    ...topology,
    nodes: topology.nodes.map((candidate) => (candidate === node ? { ...node, data } : candidate)),
  };
}

/** `null` when no item has that id. */
function editItem<T extends { id: string }>(
  items: readonly T[] | undefined,
  id: string,
  edit: (item: T) => T,
): T[] | null {
  if (!items?.some((item) => item.id === id)) return null;
  return items.map((item) => (item.id === id ? edit(item) : item));
}

function editInterface(
  topology: TopologySnapshot,
  nodeId: string,
  ifaceId: string,
  edit: (iface: RouterInterface) => RouterInterface,
): TopologySnapshot | null {
  return editNode(topology, nodeId, (data) => {
    const interfaces = editItem(data.interfaces, ifaceId, edit);
    return interfaces ? { ...data, interfaces } : null;
  });
}

function editPort(
  topology: TopologySnapshot,
  nodeId: string,
  portId: string,
  edit: (port: SwitchPort) => SwitchPort,
): TopologySnapshot | null {
  return editNode(topology, nodeId, (data) => {
    const ports = editItem(data.ports, portId, edit);
    return ports ? { ...data, ports } : null;
  });
}

/** One change applied, or `null` when its target does not exist. */
function applyOne(topology: TopologySnapshot, change: SettingChange): TopologySnapshot | null {
  switch (change.kind) {
    case 'host-ip':
      return editNode(topology, change.nodeId, ({ ip: _ip, ...rest }) =>
        change.ip === null ? { ...rest } : { ...rest, ip: change.ip },
      );

    case 'iface-address':
      return editInterface(topology, change.nodeId, change.ifaceId, (iface) => ({
        ...iface,
        ipAddress: change.ipAddress,
        prefixLength: change.prefixLength,
      }));

    case 'static-routes':
      return editNode(topology, change.nodeId, (data) =>
        data.role === 'router'
          ? { ...data, staticRoutes: change.routes.map((route) => ({ ...route })) }
          : null,
      );

    case 'port-vlan':
      return editPort(
        topology,
        change.nodeId,
        change.portId,
        ({ vlanMode: _mode, accessVlan: _access, trunkAllowedVlans: _trunk, ...rest }) => ({
          ...rest,
          vlanMode: change.vlanMode,
          ...(change.accessVlan !== undefined ? { accessVlan: change.accessVlan } : {}),
          ...(change.trunkAllowedVlans !== undefined
            ? { trunkAllowedVlans: [...change.trunkAllowedVlans] }
            : {}),
        }),
      );

    case 'stp-priority':
      return editNode(topology, change.nodeId, (data) =>
        data.role === 'switch'
          ? { ...data, stpConfig: { ...data.stpConfig, priority: change.priority } }
          : null,
      );

    case 'stp-port':
      return editNode(topology, change.nodeId, ({ stpConfig, ...rest }) => {
        if (!rest.ports?.some((port) => port.id === change.portId)) return null;
        const disabled = (stpConfig?.disabledPortIds ?? []).filter((id) => id !== change.portId);
        if (!change.enabled) disabled.push(change.portId);
        // An empty list and an empty config are written as "absent", so that
        // disabling a port and enabling it again gives back the start.
        const next: StpConfig = {
          ...(stpConfig?.priority !== undefined ? { priority: stpConfig.priority } : {}),
          ...(disabled.length > 0 ? { disabledPortIds: disabled } : {}),
        };
        return Object.keys(next).length > 0 ? { ...rest, stpConfig: next } : { ...rest };
      });

    case 'link-state': {
      if (!topology.edges.some((edge) => edge.id === change.edgeId)) return null;
      return {
        ...topology,
        edges: topology.edges.map((edge) =>
          edge.id === change.edgeId
            ? { ...edge, data: { ...edge.data, state: change.state } }
            : edge,
        ),
      };
    }

    case 'ospf-cost':
      return editNode(topology, change.nodeId, (data) => {
        const config = data.ospfConfig;
        const index = config?.areas.findIndex((area) => area.networks.includes(change.network));
        if (!config || index === undefined || index === -1) return null;
        return {
          ...data,
          ospfConfig: {
            ...config,
            // A network that shares its entry with others moves to an entry of
            // its own (in place), so one cost change does not move other links.
            areas: config.areas.flatMap((area, position) =>
              position !== index
                ? [area]
                : area.networks.length === 1
                  ? [{ ...area, cost: change.cost }]
                  : [
                      { areaId: area.areaId, networks: [change.network], cost: change.cost },
                      {
                        ...area,
                        networks: area.networks.filter((network) => network !== change.network),
                      },
                    ],
            ),
          },
        };
      });

    case 'iface-acl':
      return editInterface(topology, change.nodeId, change.ifaceId, (iface) => {
        const key = change.direction === 'inbound' ? 'inboundAcl' : 'outboundAcl';
        const next = { ...iface };
        if (change.rules.length > 0) next[key] = change.rules.map((rule) => ({ ...rule }));
        // No rules means "no ACL": the engine reads an empty array as deny-everything.
        else delete next[key];
        return next;
      });

    case 'iface-nat':
      return editInterface(topology, change.nodeId, change.ifaceId, ({ nat: _nat, ...rest }) =>
        change.nat === null ? { ...rest } : { ...rest, nat: change.nat },
      );
  }
}

export interface ApplyResult {
  readonly topology: TopologySnapshot;
  /** Changes whose target (node, interface, port, edge, OSPF network) does not exist. */
  readonly ignored: readonly SettingChange[];
}

export function applyChangesReporting(
  start: TopologySnapshot,
  changes: readonly SettingChange[],
): ApplyResult {
  let topology = start;
  const ignored: SettingChange[] = [];
  for (const change of changes) {
    const next = applyOne(topology, change);
    if (next === null) ignored.push(change);
    else topology = next;
  }
  return { topology, ignored };
}

/** `start` with every change applied in order. Changes with no target are skipped. */
export function applyChanges(
  start: TopologySnapshot,
  changes: readonly SettingChange[],
): TopologySnapshot {
  return applyChangesReporting(start, changes).topology;
}

// --- Reading -----------------------------------------------------------------

/**
 * The current value of one setting, as the change that would write it.
 *
 * `null` when the target does not exist, and also when the topology holds a
 * state no `SettingChange` can express (an empty ACL array, a `blocked` link):
 * reading those as "no ACL" or "up" would hide a real difference.
 */
export function readSetting(topology: TopologySnapshot, ref: SettingRef): SettingChange | null {
  if (ref.kind === 'link-state') {
    const edge = topology.edges.find((candidate) => candidate.id === ref.edgeId);
    const state = edge?.data?.state ?? 'up';
    return edge && state !== 'blocked' ? { ...ref, state } : null;
  }

  const data = topology.nodes.find((candidate) => candidate.id === ref.nodeId)?.data;
  if (!data) return null;

  switch (ref.kind) {
    case 'host-ip':
      return { ...ref, ip: typeof data.ip === 'string' && data.ip.length > 0 ? data.ip : null };

    case 'iface-address': {
      const iface = data.interfaces?.find((candidate) => candidate.id === ref.ifaceId);
      return iface
        ? { ...ref, ipAddress: iface.ipAddress, prefixLength: iface.prefixLength }
        : null;
    }

    case 'static-routes':
      return data.role === 'router' ? { ...ref, routes: data.staticRoutes ?? [] } : null;

    case 'port-vlan': {
      const port = data.ports?.find((candidate) => candidate.id === ref.portId);
      if (!port) return null;
      if (port.vlanMode === 'trunk') {
        return {
          ...ref,
          vlanMode: 'trunk',
          ...(port.trunkAllowedVlans ? { trunkAllowedVlans: port.trunkAllowedVlans } : {}),
        };
      }
      return { ...ref, vlanMode: 'access', accessVlan: port.accessVlan ?? DEFAULT_ACCESS_VLAN };
    }

    case 'stp-priority':
      return data.role === 'switch'
        ? { ...ref, priority: data.stpConfig?.priority ?? DEFAULT_STP_PRIORITY }
        : null;

    case 'stp-port':
      return data.ports?.some((port) => port.id === ref.portId)
        ? { ...ref, enabled: !(data.stpConfig?.disabledPortIds ?? []).includes(ref.portId) }
        : null;

    case 'ospf-cost': {
      const area = data.ospfConfig?.areas.find((entry) => entry.networks.includes(ref.network));
      return area ? { ...ref, cost: area.cost ?? DEFAULT_OSPF_COST } : null;
    }

    case 'iface-acl': {
      const iface = data.interfaces?.find((candidate) => candidate.id === ref.ifaceId);
      if (!iface) return null;
      const rules = ref.direction === 'inbound' ? iface.inboundAcl : iface.outboundAcl;
      if (rules?.length === 0) return null;
      return { ...ref, rules: rules ?? [] };
    }

    case 'iface-nat': {
      const iface = data.interfaces?.find((candidate) => candidate.id === ref.ifaceId);
      return iface ? { ...ref, nat: iface.nat ?? null } : null;
    }
  }
}

// --- Comparing ---------------------------------------------------------------

/** JSON with object keys sorted, so two equal values always give one string. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry !== null && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0,
          ),
        )
      : entry,
  );
}

/**
 * The value of a setting as a string that is equal exactly when the engine
 * would behave the same: allowed VLANs and static routes are sets (the engine
 * orders routes by prefix and metric, not by position), ACL rules keep their order.
 */
function valueOf(topology: TopologySnapshot, ref: SettingRef): string {
  const value = readSetting(topology, ref);
  if (value?.kind === 'port-vlan' && value.trunkAllowedVlans) {
    return stable({
      ...value,
      trunkAllowedVlans: [...value.trunkAllowedVlans].sort((left, right) => left - right),
    });
  }
  if (value?.kind === 'static-routes') {
    return stable(
      value.routes.map((route) => stable({ ...route, metric: route.metric ?? 0 })).sort(),
    );
  }
  return stable(value);
}

function refKey(ref: SettingRef): string {
  switch (ref.kind) {
    case 'link-state':
      return `${ref.kind}|${ref.edgeId}`;
    case 'host-ip':
    case 'static-routes':
    case 'stp-priority':
      return `${ref.kind}|${ref.nodeId}`;
    case 'iface-address':
    case 'iface-nat':
      return `${ref.kind}|${ref.nodeId}|${ref.ifaceId}`;
    case 'port-vlan':
    case 'stp-port':
      return `${ref.kind}|${ref.nodeId}|${ref.portId}`;
    case 'ospf-cost':
      return `${ref.kind}|${ref.nodeId}|${ref.network}`;
    case 'iface-acl':
      return `${ref.kind}|${ref.nodeId}|${ref.ifaceId}|${ref.direction}`;
  }
}

/** Whether a change (or a ref) targets a setting on the allow-list. */
export function isAllowed(change: SettingRef, allowed: readonly SettingRef[]): boolean {
  const key = refKey(change);
  return allowed.some((ref) => refKey(ref) === key);
}

/** The allowed settings whose value differs from the start. A change that was undone is not one. */
export function diffSettings(
  start: TopologySnapshot,
  current: TopologySnapshot,
  allowed: readonly SettingRef[],
): SettingRef[] {
  return allowed.filter((ref) => valueOf(start, ref) !== valueOf(current, ref));
}

/**
 * Whether `current` differs from `start` in anything that is not an allowed setting.
 *
 * How: every allowed setting is read from `current` and written onto BOTH
 * topologies with `applyChanges`; the two results are then compared whole
 * (nodes, edges, areas; key order ignored). Writing onto both sides puts the
 * allowed settings into one form, so whatever still differs was not reachable
 * through the allow-list. A setting that cannot be read (see `readSetting`) is
 * written to neither side, so its difference stays visible.
 */
export function differsOutside(
  start: TopologySnapshot,
  current: TopologySnapshot,
  allowed: readonly SettingRef[],
): boolean {
  const values = allowed.flatMap((ref) => readSetting(current, ref) ?? []);
  return stable(applyChanges(start, values)) !== stable(applyChanges(current, values));
}
