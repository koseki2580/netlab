import { NetlabError } from '../errors';
import { hookEngine } from '../hooks/HookEngine';
import type { InFlightPacket, TcpFlags } from '../types/packets';
import type { AclRule as RuntimeAclRule } from '../types/acl';
import type { LacpConfig } from '../types/lacp';
import type { LinkQosConfig, LinkShaperConfig } from '../types/link';
import type { NetflowConfig, SflowConfig } from '../types/observability';
import type { PortForwardingRule, StaticRouteConfig } from '../types/routing';
import type { PacketHop, PacketTrace, SimulationState } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import type { VrrpConfig } from '../types/vrrp';
import type { WifiConfig, WirelessLinkConfig } from '../types/wireless';
import type { GreTunnelConfig, VrfConfig, VtepConfig } from '../types/tunneling';
import { isTraceAnnotation, isTraceAnnotationEdit } from './annotations/edits';
import { reduceAnnotation } from './annotations/reducer';
import type { TraceAnnotationEdit } from './annotations/types';
import { cloneSnapshot } from './SimulationSnapshot';
import { isSnapshotEdit } from './snapshots/edits';
import { reduceSnapshotEdit } from './snapshots/reducer';
import type { SnapshotEdit } from './snapshots/types';
import { getSandboxEditSpec, isRegisteredPluginEdit } from './plugin/registry';
import type { PluginEdit } from './plugin/types';
import type {
  EdgeRef,
  InterfaceRef,
  NatRule,
  NodeRef,
  PacketRef,
  PacketFieldPath,
  ParameterKey,
  SandboxAclRule,
  SimulationSnapshot,
  StaticRoute,
  TrafficFlow,
} from './types';
import {
  isAclRule,
  isEdgeRef,
  isInterfaceRef,
  isNatRule,
  isNodeRef,
  isPacketRef,
  isPacketFieldPath,
  isParameterKey,
  isStaticRoute,
  isTrafficFlow,
} from './types';

export type LinkState = 'up' | 'down';

export type Edit =
  | { readonly kind: 'noop' }
  | {
      readonly kind: 'packet.header';
      readonly target: PacketRef;
      readonly fieldPath: PacketFieldPath;
      readonly before: string | number;
      readonly after: string | number;
    }
  | {
      readonly kind: 'packet.flags.tcp';
      readonly target: PacketRef;
      readonly before: TcpFlags;
      readonly after: TcpFlags;
    }
  | {
      readonly kind: 'packet.payload';
      readonly target: PacketRef;
      readonly before: string;
      readonly after: string;
    }
  | { readonly kind: 'packet.compose'; readonly packet: InFlightPacket }
  | {
      readonly kind: 'param.set';
      readonly key: ParameterKey;
      readonly before: number;
      readonly after: number;
    }
  | { readonly kind: 'traffic.launch'; readonly flow: TrafficFlow }
  | { readonly kind: 'node.route.add'; readonly target: NodeRef; readonly route: StaticRoute }
  | { readonly kind: 'node.route.remove'; readonly target: NodeRef; readonly routeId: string }
  | {
      readonly kind: 'node.route.edit';
      readonly target: NodeRef;
      readonly routeId: string;
      readonly before: StaticRoute;
      readonly after: StaticRoute;
    }
  | {
      readonly kind: 'interface.mtu';
      readonly target: InterfaceRef;
      readonly before: number;
      readonly after: number;
    }
  | {
      readonly kind: 'link.state';
      readonly target: EdgeRef;
      readonly before: LinkState;
      readonly after: LinkState;
    }
  | {
      readonly kind: 'link.qos';
      readonly target: EdgeRef;
      readonly before: LinkQosConfig | null;
      readonly after: LinkQosConfig;
    }
  | {
      readonly kind: 'link.shaper';
      readonly target: EdgeRef;
      readonly before: LinkShaperConfig | null;
      readonly after: LinkShaperConfig | null;
    }
  | {
      readonly kind: 'link.lacp';
      readonly target: NodeRef;
      readonly portId: string;
      readonly before: LacpConfig | null;
      readonly after: LacpConfig | null;
    }
  | {
      readonly kind: 'node.vrrp';
      readonly target: InterfaceRef;
      readonly before: VrrpConfig | null;
      readonly after: VrrpConfig | null;
    }
  | {
      readonly kind: 'link.wireless';
      readonly target: EdgeRef;
      readonly before: WirelessLinkConfig | null;
      readonly after: WirelessLinkConfig | null;
    }
  | {
      readonly kind: 'node.wifi';
      readonly target: NodeRef;
      readonly before: WifiConfig | null;
      readonly after: WifiConfig | null;
    }
  | {
      readonly kind: 'node.gre';
      readonly target: InterfaceRef;
      readonly before: GreTunnelConfig | null;
      readonly after: GreTunnelConfig | null;
    }
  | {
      readonly kind: 'node.mpls-vrf';
      readonly target: NodeRef;
      readonly before: VrfConfig | null;
      readonly after: VrfConfig | null;
    }
  | {
      readonly kind: 'node.vxlan-vni';
      readonly target: NodeRef;
      readonly before: VtepConfig | null;
      readonly after: VtepConfig | null;
    }
  | {
      readonly kind: 'node.netflow';
      readonly target: NodeRef;
      readonly before: NetflowConfig | null;
      readonly after: NetflowConfig | null;
    }
  | {
      readonly kind: 'node.sflow';
      readonly target: NodeRef;
      readonly before: SflowConfig | null;
      readonly after: SflowConfig | null;
    }
  | { readonly kind: 'node.nat.add'; readonly target: NodeRef; readonly rule: NatRule }
  | { readonly kind: 'node.nat.remove'; readonly target: NodeRef; readonly ruleId: string }
  | {
      readonly kind: 'node.nat.edit';
      readonly target: NodeRef;
      readonly ruleId: string;
      readonly before: NatRule;
      readonly after: NatRule;
    }
  | { readonly kind: 'node.acl.add'; readonly target: NodeRef; readonly rule: SandboxAclRule }
  | { readonly kind: 'node.acl.remove'; readonly target: NodeRef; readonly ruleId: string }
  | {
      readonly kind: 'node.acl.edit';
      readonly target: NodeRef;
      readonly ruleId: string;
      readonly before: SandboxAclRule;
      readonly after: SandboxAclRule;
    }
  | SnapshotEdit
  | TraceAnnotationEdit
  | PluginEdit;

export type EditKind = Edit['kind'];
export type SandboxReducer<K extends EditKind = EditKind> = (
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { readonly kind: K }>,
) => SimulationSnapshot;

type ReducerMap = Map<EditKind, SandboxReducer>;

const reducers: ReducerMap = new Map();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

function isLinkState(value: unknown): value is LinkState {
  return value === 'up' || value === 'down';
}

function isLinkQosConfig(value: unknown): value is LinkQosConfig {
  if (!isRecord(value)) return false;
  const optionalNumber = (key: string) => value[key] === undefined || hasNumber(value, key);
  return (
    optionalNumber('bandwidthBps') &&
    optionalNumber('propagationDelayMs') &&
    optionalNumber('lossPct') &&
    optionalNumber('queueDepthSegments') &&
    optionalNumber('lossSeed') &&
    (value.shaper === undefined || isLinkShaperConfig(value.shaper))
  );
}

function isLinkShaperConfig(value: unknown): value is LinkShaperConfig {
  return (
    isRecord(value) &&
    Array.isArray(value.classes) &&
    value.classes.every(
      (klass) =>
        isRecord(klass) &&
        typeof klass.id === 'string' &&
        Array.isArray(klass.dscp) &&
        klass.dscp.every((dscp) => typeof dscp === 'number') &&
        typeof klass.weightPct === 'number' &&
        typeof klass.queueDepthSegments === 'number' &&
        (klass.default === undefined || typeof klass.default === 'boolean'),
    )
  );
}

function isNetflowConfig(value: unknown): value is NetflowConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    (value.inactiveTimeoutMs === undefined || hasNumber(value, 'inactiveTimeoutMs')) &&
    (value.activeTimeoutMs === undefined || hasNumber(value, 'activeTimeoutMs')) &&
    (value.maxCacheEntries === undefined || hasNumber(value, 'maxCacheEntries'))
  );
}

function isSflowConfig(value: unknown): value is SflowConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    hasNumber(value, 'rate') &&
    (value.headerCaptureBytes === undefined || hasNumber(value, 'headerCaptureBytes')) &&
    (value.samplingSeed === undefined || hasNumber(value, 'samplingSeed'))
  );
}

function isLacpConfig(value: unknown): value is LacpConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'key') &&
    typeof value.systemId === 'string' &&
    (value.mode === 'active' || value.mode === 'passive') &&
    (value.fastTimer === undefined || typeof value.fastTimer === 'boolean') &&
    (value.channelId === undefined || typeof value.channelId === 'string')
  );
}

function isVrrpConfig(value: unknown): value is VrrpConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'vrid') &&
    typeof value.virtualIp === 'string' &&
    hasNumber(value, 'priority') &&
    (value.advertIntervalMs === undefined || hasNumber(value, 'advertIntervalMs')) &&
    (value.preempt === undefined || typeof value.preempt === 'boolean') &&
    (value.hsrpMode === undefined || typeof value.hsrpMode === 'boolean')
  );
}

function isWirelessLinkConfig(value: unknown): value is WirelessLinkConfig {
  return (
    isRecord(value) &&
    typeof value.ssid === 'string' &&
    hasNumber(value, 'channel') &&
    hasNumber(value, 'bandMhz') &&
    hasNumber(value, 'txPowerDbm') &&
    (value.antennaGainDbi === undefined || hasNumber(value, 'antennaGainDbi')) &&
    (value.lossSeed === undefined || hasNumber(value, 'lossSeed'))
  );
}

function isWifiConfig(value: unknown): value is WifiConfig {
  return (
    isRecord(value) &&
    (value.role === 'access-point' || value.role === 'station') &&
    typeof value.ssid === 'string' &&
    (value.psk === undefined || typeof value.psk === 'string') &&
    (value.apId === undefined || typeof value.apId === 'string')
  );
}

function isGreTunnelConfig(value: unknown): value is GreTunnelConfig {
  return (
    isRecord(value) &&
    hasString(value, 'sourceIp') &&
    hasString(value, 'destinationIp') &&
    (value.key === undefined || hasNumber(value, 'key')) &&
    (value.sequence === undefined || hasNumber(value, 'sequence'))
  );
}

function isRouteDistinguisher(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.type === 0 || value.type === 1 || value.type === 2) &&
    typeof value.value === 'string'
  );
}

function isRouteTarget(value: unknown): boolean {
  return isRecord(value) && value.type === 0x0002 && typeof value.value === 'string';
}

function isVrfConfig(value: unknown): value is VrfConfig {
  return (
    isRecord(value) &&
    hasString(value, 'name') &&
    isRouteDistinguisher(value.rd) &&
    Array.isArray(value.importRts) &&
    value.importRts.every(isRouteTarget) &&
    Array.isArray(value.exportRts) &&
    value.exportRts.every(isRouteTarget) &&
    Array.isArray(value.attachedInterfaces) &&
    value.attachedInterfaces.every((iface) => typeof iface === 'string')
  );
}

function isVtepConfig(value: unknown): value is VtepConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'vni') &&
    hasString(value, 'sourceVtepIp') &&
    Array.isArray(value.peerVtepIps) &&
    value.peerVtepIps.every((peer) => typeof peer === 'string') &&
    (value.arpSuppression === undefined || typeof value.arpSuppression === 'boolean')
  );
}

function isTcpFlags(value: unknown): value is TcpFlags {
  return (
    isRecord(value) &&
    typeof value.syn === 'boolean' &&
    typeof value.ack === 'boolean' &&
    typeof value.fin === 'boolean' &&
    typeof value.rst === 'boolean' &&
    typeof value.psh === 'boolean' &&
    typeof value.urg === 'boolean'
  );
}

function emitRejected(
  edit: unknown,
  reason: 'unknown-kind' | 'not-paused' | 'validation-failed' | 'plugin-error' = 'unknown-kind',
): void {
  void hookEngine.emit('sandbox:edit-rejected', {
    edit,
    reason,
  });
}

export function registerReducer<K extends EditKind>(kind: K, reducer: SandboxReducer<K>): void {
  if (reducers.has(kind)) {
    throw new Error(`duplicate registration for sandbox edit reducer: ${kind}`);
  }

  reducers.set(kind, reducer as unknown as SandboxReducer);
}

export function getReducer(kind: string): SandboxReducer | null {
  return reducers.get(kind as EditKind) ?? null;
}

export function registeredKinds(): EditKind[] {
  return Array.from(reducers.keys()).sort();
}

export function isEditWithKind<K extends EditKind>(
  kind: K,
): (value: unknown) => value is Extract<Edit, { readonly kind: K }> {
  return (value: unknown): value is Extract<Edit, { readonly kind: K }> =>
    isRecord(value) && value.kind === kind;
}

function hasTarget(value: Record<string, unknown>, guard: (target: unknown) => boolean): boolean {
  return guard(value.target);
}

export function isEdit(value: unknown): value is Edit {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }

  switch (value.kind) {
    case 'noop':
      return true;
    case 'packet.header':
      return (
        isPacketRef(value.target) &&
        isPacketFieldPath(value.fieldPath) &&
        (typeof value.before === 'string' || typeof value.before === 'number') &&
        (typeof value.after === 'string' || typeof value.after === 'number')
      );
    case 'packet.flags.tcp':
      return isPacketRef(value.target) && isTcpFlags(value.before) && isTcpFlags(value.after);
    case 'packet.payload':
      return (
        isPacketRef(value.target) &&
        typeof value.before === 'string' &&
        typeof value.after === 'string'
      );
    case 'packet.compose':
      return isRecord(value.packet);
    case 'param.set':
      return isParameterKey(value.key) && hasNumber(value, 'before') && hasNumber(value, 'after');
    case 'traffic.launch':
      return isTrafficFlow(value.flow);
    case 'node.route.add':
      return hasTarget(value, isNodeRef) && isStaticRoute(value.route);
    case 'node.route.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'routeId');
    case 'node.route.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'routeId') &&
        isStaticRoute(value.before) &&
        isStaticRoute(value.after)
      );
    case 'interface.mtu':
      return (
        hasTarget(value, isInterfaceRef) && hasNumber(value, 'before') && hasNumber(value, 'after')
      );
    case 'link.state':
      return hasTarget(value, isEdgeRef) && isLinkState(value.before) && isLinkState(value.after);
    case 'link.qos':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isLinkQosConfig(value.before)) &&
        isLinkQosConfig(value.after)
      );
    case 'link.shaper':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isLinkShaperConfig(value.before)) &&
        (value.after === null || isLinkShaperConfig(value.after))
      );
    case 'link.lacp':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'portId') &&
        (value.before === null || isLacpConfig(value.before)) &&
        (value.after === null || isLacpConfig(value.after))
      );
    case 'node.vrrp':
      return (
        hasTarget(value, isInterfaceRef) &&
        (value.before === null || isVrrpConfig(value.before)) &&
        (value.after === null || isVrrpConfig(value.after))
      );
    case 'link.wireless':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isWirelessLinkConfig(value.before)) &&
        (value.after === null || isWirelessLinkConfig(value.after))
      );
    case 'node.wifi':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isWifiConfig(value.before)) &&
        (value.after === null || isWifiConfig(value.after))
      );
    case 'node.gre':
      return (
        hasTarget(value, isInterfaceRef) &&
        (value.before === null || isGreTunnelConfig(value.before)) &&
        (value.after === null || isGreTunnelConfig(value.after))
      );
    case 'node.mpls-vrf':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isVrfConfig(value.before)) &&
        (value.after === null || isVrfConfig(value.after))
      );
    case 'node.vxlan-vni':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isVtepConfig(value.before)) &&
        (value.after === null || isVtepConfig(value.after))
      );
    case 'node.netflow':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isNetflowConfig(value.before)) &&
        (value.after === null || isNetflowConfig(value.after))
      );
    case 'node.sflow':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isSflowConfig(value.before)) &&
        (value.after === null || isSflowConfig(value.after))
      );
    case 'node.nat.add':
      return hasTarget(value, isNodeRef) && isNatRule(value.rule);
    case 'node.nat.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'ruleId');
    case 'node.nat.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'ruleId') &&
        isNatRule(value.before) &&
        isNatRule(value.after)
      );
    case 'node.acl.add':
      return hasTarget(value, isNodeRef) && isAclRule(value.rule);
    case 'node.acl.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'ruleId');
    case 'node.acl.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'ruleId') &&
        isAclRule(value.before) &&
        isAclRule(value.after)
      );
    case 'trace.annotate.add':
      return isTraceAnnotation(value.annotation);
    case 'trace.annotate.edit':
      return isTraceAnnotationEdit(value);
    case 'trace.annotate.remove':
      return isTraceAnnotationEdit(value);
    case 'snapshot.create':
    case 'snapshot.rename':
    case 'snapshot.delete':
      return isSnapshotEdit(value);
    default:
      return isRegisteredPluginEdit(value);
  }
}

export const PLACEHOLDER_EDIT_KINDS = Object.freeze([] satisfies readonly EditKind[]);

type RuntimeStaticRoute = StaticRouteConfig & {
  readonly id?: string;
  readonly outInterface?: string;
};

type SandboxNodeData = NetlabNode['data'] & {
  readonly sandboxNatRules?: readonly NatRule[];
  readonly sandboxAclRules?: readonly SandboxAclRule[];
};

function replaceNode(
  topology: NetworkTopology,
  nodeId: string,
  mapNode: (node: NetlabNode) => NetlabNode,
): NetworkTopology | null {
  let changed = false;
  const nodes = topology.nodes.map((node) => {
    if (node.id !== nodeId) return node;
    changed = true;
    return mapNode(node);
  });

  return changed ? { ...topology, nodes } : null;
}

function withTopology(snapshot: SimulationSnapshot, topology: NetworkTopology): SimulationSnapshot {
  return cloneSnapshot({ ...snapshot, topology });
}

function withState(snapshot: SimulationSnapshot, state: SimulationState): SimulationSnapshot {
  return cloneSnapshot({ ...snapshot, state });
}

function routeId(route: RuntimeStaticRoute): string | null {
  return typeof route.id === 'string' ? route.id : null;
}

function toRuntimeRoute(route: StaticRoute): RuntimeStaticRoute {
  return {
    id: route.id,
    destination: route.prefix,
    nextHop: route.nextHop,
    outInterface: route.outInterface,
    metric: route.metric,
  };
}

function routeAdd(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.route.add' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    if (existing.some((route) => routeId(route) === edit.route.id)) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        staticRoutes: [...existing, toRuntimeRoute(edit.route)],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function routeRemove(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.route.remove' }>,
) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    const nextRoutes = existing.filter((route) => routeId(route) !== edit.routeId);
    if (nextRoutes.length === existing.length) return node;
    return { ...node, data: { ...node.data, staticRoutes: nextRoutes } };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function routeEdit(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.route.edit' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = (node.data.staticRoutes ?? []) as RuntimeStaticRoute[];
    let changed = false;
    const nextRoutes = existing.map((route) => {
      if (routeId(route) !== edit.routeId) return route;
      changed = true;
      return toRuntimeRoute(edit.after);
    });
    return changed ? { ...node, data: { ...node.data, staticRoutes: nextRoutes } } : node;
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function isValidMtu(value: number): boolean {
  return Number.isInteger(value) && value >= 68 && value <= 9216;
}

function interfaceMtu(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'interface.mtu' }>,
) {
  if (!isValidMtu(edit.after)) return snapshot;

  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const interfaces = node.data.interfaces ?? [];
    let changed = false;
    const nextInterfaces = interfaces.map((iface) => {
      if (iface.id === edit.target.ifaceId) {
        changed = true;
        return { ...iface, mtu: edit.after };
      }

      const subInterfaces = iface.subInterfaces ?? [];
      const nextSubInterfaces = subInterfaces.map((subInterface) => {
        if (subInterface.id !== edit.target.ifaceId) return subInterface;
        changed = true;
        return { ...subInterface, mtu: edit.after };
      });

      return changed && nextSubInterfaces !== subInterfaces
        ? { ...iface, subInterfaces: nextSubInterfaces }
        : iface;
    });

    return changed ? { ...node, data: { ...node.data, interfaces: nextInterfaces } } : node;
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function linkState(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.state' }>) {
  if (edit.before === edit.after) return snapshot;

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        state: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}

function linkQos(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.qos' }>) {
  if ((edit.after.lossPct ?? 0) > 0 && edit.after.lossSeed === undefined) {
    throw new NetlabError({
      code: 'link-qos/missing-seed',
      message: `Link ${edit.target.edgeId} has lossPct but no lossSeed`,
      context: { edgeId: edit.target.edgeId },
    });
  }

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        link: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}

function validateLinkShaper(edgeId: string, config: LinkShaperConfig): void {
  const defaultCount = config.classes.filter((klass) => klass.default === true).length;
  if (defaultCount === 0) {
    throw new NetlabError({
      code: 'link-shaper/no-default',
      message: `Link ${edgeId} shaper has no default class`,
      context: { edgeId },
    });
  }
  if (defaultCount > 1) {
    throw new NetlabError({
      code: 'link-shaper/multiple-defaults',
      message: `Link ${edgeId} shaper has multiple default classes`,
      context: { edgeId },
    });
  }

  const classIds = new Set<string>();
  const dscpValues = new Set<number>();
  let weightSum = 0;

  for (const klass of config.classes) {
    if (classIds.has(klass.id)) {
      throw new NetlabError({
        code: 'link-shaper/duplicate-class-id',
        message: `Link ${edgeId} shaper class ${klass.id} is duplicated`,
        context: { edgeId, classId: klass.id },
      });
    }
    classIds.add(klass.id);

    if (klass.weightPct < 1 || klass.weightPct > 100) {
      throw new NetlabError({
        code: 'link-shaper/weight-out-of-range',
        message: `Link ${edgeId} shaper class ${klass.id} has invalid weight`,
        context: { edgeId, classId: klass.id },
      });
    }
    weightSum += klass.weightPct;

    for (const dscp of klass.dscp) {
      if (!Number.isInteger(dscp) || dscp < 0 || dscp > 63) {
        throw new NetlabError({
          code: 'link-shaper/dscp-out-of-range',
          message: `Link ${edgeId} shaper class ${klass.id} has invalid DSCP ${dscp}`,
          context: { edgeId, classId: klass.id, dscp },
        });
      }
      if (dscpValues.has(dscp)) {
        throw new NetlabError({
          code: 'link-shaper/dscp-overlap',
          message: `Link ${edgeId} shaper has overlapping DSCP ${dscp}`,
          context: { edgeId, dscp },
        });
      }
      dscpValues.add(dscp);
    }
  }

  if (weightSum < 99 || weightSum > 101) {
    throw new NetlabError({
      code: 'link-shaper/weight-sum',
      message: `Link ${edgeId} shaper weights sum to ${weightSum}`,
      context: { edgeId, weightSum },
    });
  }
}

function linkShaper(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.shaper' }>) {
  if (edit.after) {
    validateLinkShaper(edit.target.edgeId, edit.after);
  }

  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    const link = {
      ...(edge.data?.link ?? {}),
      ...(edit.after === null ? {} : { shaper: edit.after }),
    };
    if (edit.after === null) {
      delete link.shaper;
    }
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        link,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}

function linkLacp(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'link.lacp' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ports: (node.data.ports ?? []).map((port) => {
        if (port.id !== edit.portId) return port;
        if (edit.after === null) {
          const { lacp: _lacp, ...restPort } = port;
          return restPort;
        }
        return { ...port, lacp: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeVrrp(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.vrrp' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      interfaces: (node.data.interfaces ?? []).map((iface) => {
        if (iface.id !== edit.target.ifaceId) return iface;
        if (edit.after === null) {
          const { vrrp: _vrrp, ...restIface } = iface;
          return restIface;
        }
        return { ...iface, vrrp: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function linkWireless(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'link.wireless' }>,
) {
  let changed = false;
  const edges = snapshot.topology.edges.map((edge) => {
    if (edge.id !== edit.target.edgeId) return edge;
    changed = true;
    if (edit.after === null) {
      const data = { ...(edge.data ?? {}) };
      delete data.wireless;
      return { ...edge, data };
    }
    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        wireless: edit.after,
      },
    };
  });

  return changed ? withTopology(snapshot, { ...snapshot.topology, edges }) : snapshot;
}

function nodeWifi(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.wifi' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    if (edit.after === null) {
      const data = { ...node.data };
      delete data.wifi;
      return { ...node, data };
    }
    return {
      ...node,
      data: {
        ...node.data,
        wifi: edit.after,
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeGre(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.gre' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      interfaces: (node.data.interfaces ?? []).map((iface) => {
        if (iface.id !== edit.target.ifaceId) return iface;
        if (edit.after === null) {
          const { greTunnel: _greTunnel, ...restIface } = iface;
          return restIface;
        }
        return { ...iface, greTunnel: edit.after };
      }),
    },
  }));

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeMplsVrf(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.mpls-vrf' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = node.data.vrfs ?? [];
    const vrfs =
      edit.after === null
        ? existing.filter((vrf) => edit.before === null || vrf.name !== edit.before.name)
        : [...existing.filter((vrf) => vrf.name !== edit.after!.name), edit.after];
    if (vrfs.length === 0) {
      const { vrfs: _vrfs, ...data } = node.data;
      return { ...node, data };
    }
    return { ...node, data: { ...node.data, vrfs } };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeVxlanVni(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.vxlan-vni' }>,
) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    if (edit.after === null) {
      const data = { ...node.data };
      delete data.vtep;
      return { ...node, data };
    }
    return {
      ...node,
      data: {
        ...node.data,
        vtep: edit.after,
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeNetflow(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.netflow' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ...(edit.after === null ? {} : { netflow: edit.after }),
    },
  }));
  if (!topology) return snapshot;
  if (edit.after === null) {
    const nodes = topology.nodes.map((node) => {
      if (node.id !== edit.target.nodeId) return node;
      const data = { ...node.data };
      delete data.netflow;
      return { ...node, data };
    });
    return withTopology(snapshot, { ...topology, nodes });
  }
  return withTopology(snapshot, topology);
}

function nodeSflow(snapshot: SimulationSnapshot, edit: Extract<Edit, { kind: 'node.sflow' }>) {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => ({
    ...node,
    data: {
      ...node.data,
      ...(edit.after === null ? {} : { sflow: edit.after }),
    },
  }));
  if (!topology) return snapshot;
  if (edit.after === null) {
    const nodes = topology.nodes.map((node) => {
      if (node.id !== edit.target.nodeId) return node;
      const data = { ...node.data };
      delete data.sflow;
      return { ...node, data };
    });
    return withTopology(snapshot, { ...topology, nodes });
  }
  return withTopology(snapshot, topology);
}

function nodeRuleAdd<R extends NatRule | SandboxAclRule>(
  snapshot: SimulationSnapshot,
  nodeId: string,
  key: 'sandboxNatRules' | 'sandboxAclRules',
  rule: R,
) {
  const topology = replaceNode(snapshot.topology, nodeId, (node) => {
    const data = node.data as SandboxNodeData;
    const existing = (data[key] ?? []) as readonly R[];
    if (existing.some((candidate) => candidate.id === rule.id)) return node;

    return {
      ...node,
      data: {
        ...node.data,
        [key]: [...existing, rule],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeRuleRemove(
  snapshot: SimulationSnapshot,
  nodeId: string,
  key: 'sandboxNatRules' | 'sandboxAclRules',
  ruleId: string,
) {
  const topology = replaceNode(snapshot.topology, nodeId, (node) => {
    const data = node.data as SandboxNodeData;
    const existing = data[key] ?? [];
    const nextRules = existing.filter((rule) => rule.id !== ruleId);
    if (nextRules.length === existing.length) return node;

    return { ...node, data: { ...node.data, [key]: nextRules } };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function nodeRuleEdit<R extends NatRule | SandboxAclRule>(
  snapshot: SimulationSnapshot,
  nodeId: string,
  key: 'sandboxNatRules' | 'sandboxAclRules',
  ruleId: string,
  after: R,
) {
  const topology = replaceNode(snapshot.topology, nodeId, (node) => {
    const data = node.data as SandboxNodeData;
    const existing = (data[key] ?? []) as readonly R[];
    let changed = false;
    const nextRules = existing.map((rule) => {
      if (rule.id !== ruleId) return rule;
      changed = true;
      return after;
    });

    return changed ? { ...node, data: { ...node.data, [key]: nextRules } } : node;
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function toRuntimeAcl(rule: SandboxAclRule): RuntimeAclRule {
  return {
    id: rule.id,
    priority: rule.order,
    action: rule.action,
    protocol: rule.proto ?? 'any',
    ...(rule.matchSrc !== undefined ? { srcIp: rule.matchSrc } : {}),
    ...(rule.matchDst !== undefined ? { dstIp: rule.matchDst } : {}),
    ...(rule.dstPort !== undefined ? { dstPort: rule.dstPort } : {}),
  };
}

function applyRuntimeAclToFirstInterface(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.acl.add' }>,
): SimulationSnapshot {
  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const firstInterface = node.data.interfaces?.[0];
    if (!firstInterface) return node;
    const existing = firstInterface.inboundAcl ?? [];
    if (existing.some((rule) => rule.id === edit.rule.id)) return node;

    const [head, ...rest] = node.data.interfaces ?? [];
    if (!head) return node;

    return {
      ...node,
      data: {
        ...node.data,
        interfaces: [{ ...head, inboundAcl: [...existing, toRuntimeAcl(edit.rule)] }, ...rest],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

function applyRuntimeNatPortForward(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'node.nat.add' }>,
): SimulationSnapshot {
  if (edit.rule.kind !== 'dnat') return snapshot;

  const topology = replaceNode(snapshot.topology, edit.target.nodeId, (node) => {
    const existing = node.data.portForwardingRules ?? [];
    const rule: PortForwardingRule = {
      proto: 'tcp',
      externalPort: 80,
      internalIp: edit.rule.translateTo,
      internalPort: 80,
    };
    if (existing.some((candidate) => candidate.internalIp === rule.internalIp)) return node;

    return {
      ...node,
      data: {
        ...node.data,
        portForwardingRules: [...existing, rule],
      },
    };
  });

  return topology ? withTopology(snapshot, topology) : snapshot;
}

registerReducer('noop', (snapshot) => snapshot);

function packetHeader(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.header' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (!hop) return snapshot;

  switch (edit.fieldPath) {
    case 'l2.srcMac':
      if (typeof edit.after === 'string') hop.srcMac = edit.after;
      break;
    case 'l2.dstMac':
      if (typeof edit.after === 'string') hop.dstMac = edit.after;
      break;
    case 'l3.srcIp':
      if (typeof edit.after === 'string') hop.srcIp = edit.after;
      break;
    case 'l3.dstIp':
      if (typeof edit.after === 'string') hop.dstIp = edit.after;
      break;
    case 'l3.ttl':
      if (typeof edit.after === 'number') hop.ttl = edit.after;
      break;
    case 'l3.protocol':
      hop.protocol = String(edit.after);
      break;
    case 'l4.srcPort':
      if (typeof edit.after === 'number') hop.srcPort = edit.after;
      break;
    case 'l4.dstPort':
      if (typeof edit.after === 'number') hop.dstPort = edit.after;
      break;
  }

  if (state.selectedPacket && state.selectedHop?.step === hop.step) {
    state.selectedPacket = patchSelectedPacketHeader(
      state.selectedPacket,
      edit.fieldPath,
      edit.after,
    );
  }

  return withState(snapshot, state);
}

function patchSelectedPacketHeader(
  packet: InFlightPacket,
  fieldPath: PacketFieldPath,
  value: string | number,
): InFlightPacket {
  const next = structuredClone(packet);
  const transport = next.frame.payload.payload;
  switch (fieldPath) {
    case 'l2.srcMac':
      if (typeof value === 'string') next.frame.srcMac = value;
      break;
    case 'l2.dstMac':
      if (typeof value === 'string') next.frame.dstMac = value;
      break;
    case 'l3.srcIp':
      if (typeof value === 'string') next.frame.payload.srcIp = value;
      break;
    case 'l3.dstIp':
      if (typeof value === 'string') next.frame.payload.dstIp = value;
      break;
    case 'l3.ttl':
      if (typeof value === 'number') next.frame.payload.ttl = value;
      break;
    case 'l3.protocol':
      if (typeof value === 'number') next.frame.payload.protocol = value;
      break;
    case 'l4.srcPort':
      if (typeof value === 'number' && 'srcPort' in transport) transport.srcPort = value;
      break;
    case 'l4.dstPort':
      if (typeof value === 'number' && 'dstPort' in transport) transport.dstPort = value;
      break;
  }
  return next;
}

function packetFlags(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.flags.tcp' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  if (state.selectedPacket) {
    const transport = state.selectedPacket.frame.payload.payload;
    if ('flags' in transport) {
      transport.flags = edit.after;
    }
  }
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (hop) {
    const fields = hop.changedFields ?? [];
    hop.changedFields = fields.includes('tcp.flags') ? fields : [...fields, 'tcp.flags'];
  }
  return withState(snapshot, state);
}

function packetPayload(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.payload' }>,
): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  if (state.selectedPacket) {
    const transport = state.selectedPacket.frame.payload.payload;
    if ('payload' in transport && transport.payload.layer === 'raw') {
      transport.payload.data = edit.after;
    }
  }
  const trace = state.traces.find((candidate) => candidate.packetId === edit.target.traceId);
  const hop = trace?.hops[edit.target.hopIndex];
  if (hop) {
    const fields = hop.changedFields ?? [];
    hop.changedFields = fields.includes('payload') ? fields : [...fields, 'payload'];
  }
  return withState(snapshot, state);
}

function nodeIp(topology: NetworkTopology, nodeId: string): string {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  return (
    (typeof node?.data.ip === 'string' ? node.data.ip : undefined) ??
    node?.data.interfaces?.[0]?.ipAddress ??
    '0.0.0.0'
  );
}

function nodeLabel(topology: NetworkTopology, nodeId: string): string {
  return topology.nodes.find((candidate) => candidate.id === nodeId)?.data.label ?? nodeId;
}

function appendTrace(snapshot: SimulationSnapshot, trace: PacketTrace): SimulationSnapshot {
  const state = structuredClone(snapshot.state);
  state.traces = [
    ...state.traces.filter((candidate) => candidate.packetId !== trace.packetId),
    trace,
  ];
  state.currentTraceId = trace.packetId;
  state.currentStep = -1;
  state.status = 'paused';
  state.traceColors = { ...state.traceColors, [trace.packetId]: 'var(--netlab-accent-cyan)' };
  return withState(snapshot, state);
}

function packetCompose(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'packet.compose' }>,
): SimulationSnapshot {
  const packet = edit.packet;
  const trace: PacketTrace = {
    packetId: packet.id,
    label: 'Composed packet',
    srcNodeId: packet.srcNodeId,
    dstNodeId: packet.dstNodeId,
    status: 'delivered',
    hops: [
      {
        step: 0,
        nodeId: packet.srcNodeId,
        nodeLabel: nodeLabel(snapshot.topology, packet.srcNodeId),
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        srcMac: packet.frame.srcMac,
        dstMac: packet.frame.dstMac,
        ttl: packet.frame.payload.ttl,
        protocol: String(packet.frame.payload.protocol),
        event: 'create',
        timestamp: packet.timestamp,
      },
      {
        step: 1,
        nodeId: packet.dstNodeId,
        nodeLabel: nodeLabel(snapshot.topology, packet.dstNodeId),
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: String(packet.frame.payload.protocol),
        event: 'deliver',
        timestamp: packet.timestamp,
      },
    ],
  };

  return appendTrace(snapshot, trace);
}

function parameterSet(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'param.set' }>,
): SimulationSnapshot {
  const parameters = structuredClone(snapshot.parameters);
  const [group, key] = edit.key.split('.') as [keyof typeof parameters, string];
  const bucket = parameters[group] as Record<string, number>;
  bucket[key] = edit.after;
  return cloneSnapshot({ ...snapshot, parameters });
}

function trafficLaunch(
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { kind: 'traffic.launch' }>,
): SimulationSnapshot {
  const flow = edit.flow;
  const srcIp = nodeIp(snapshot.topology, flow.srcNodeId);
  const dstIp = nodeIp(snapshot.topology, flow.dstNodeId);
  const baseHop: Omit<PacketHop, 'step' | 'nodeId' | 'nodeLabel' | 'event'> = {
    srcIp,
    dstIp,
    ttl: flow.ttl ?? snapshot.parameters.engine.maxTtl,
    protocol: flow.protocol.toUpperCase(),
    ...(flow.dstPort !== undefined ? { dstPort: flow.dstPort } : {}),
    timestamp: snapshot.capturedAt,
  };
  const trace: PacketTrace = {
    packetId: flow.id,
    label: `${flow.protocol.toUpperCase()} sandbox traffic`,
    srcNodeId: flow.srcNodeId,
    dstNodeId: flow.dstNodeId,
    status: 'delivered',
    hops: [
      {
        ...baseHop,
        step: 0,
        nodeId: flow.srcNodeId,
        nodeLabel: nodeLabel(snapshot.topology, flow.srcNodeId),
        event: 'create',
      },
      {
        ...baseHop,
        step: 1,
        nodeId: flow.dstNodeId,
        nodeLabel: nodeLabel(snapshot.topology, flow.dstNodeId),
        event: 'deliver',
      },
    ],
  };
  return appendTrace(snapshot, trace);
}

registerReducer('packet.header', packetHeader);
registerReducer('packet.flags.tcp', packetFlags);
registerReducer('packet.payload', packetPayload);
registerReducer('packet.compose', packetCompose);
registerReducer('param.set', parameterSet);
registerReducer('traffic.launch', trafficLaunch);
registerReducer('node.route.add', routeAdd);
registerReducer('node.route.remove', routeRemove);
registerReducer('node.route.edit', routeEdit);
registerReducer('interface.mtu', interfaceMtu);
registerReducer('link.state', linkState);
registerReducer('link.qos', linkQos);
registerReducer('link.shaper', linkShaper);
registerReducer('link.lacp', linkLacp);
registerReducer('node.vrrp', nodeVrrp);
registerReducer('link.wireless', linkWireless);
registerReducer('node.wifi', nodeWifi);
registerReducer('node.gre', nodeGre);
registerReducer('node.mpls-vrf', nodeMplsVrf);
registerReducer('node.vxlan-vni', nodeVxlanVni);
registerReducer('node.netflow', nodeNetflow);
registerReducer('node.sflow', nodeSflow);
registerReducer('node.nat.add', (snapshot, edit) =>
  applyRuntimeNatPortForward(
    nodeRuleAdd(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.rule),
    edit,
  ),
);
registerReducer('node.nat.remove', (snapshot, edit) =>
  nodeRuleRemove(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.ruleId),
);
registerReducer('node.nat.edit', (snapshot, edit) =>
  nodeRuleEdit(snapshot, edit.target.nodeId, 'sandboxNatRules', edit.ruleId, edit.after),
);
registerReducer('node.acl.add', (snapshot, edit) =>
  applyRuntimeAclToFirstInterface(
    nodeRuleAdd(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.rule),
    edit,
  ),
);
registerReducer('node.acl.remove', (snapshot, edit) =>
  nodeRuleRemove(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.ruleId),
);
registerReducer('node.acl.edit', (snapshot, edit) =>
  nodeRuleEdit(snapshot, edit.target.nodeId, 'sandboxAclRules', edit.ruleId, edit.after),
);
registerReducer('trace.annotate.add', reduceAnnotation);
registerReducer('trace.annotate.edit', reduceAnnotation);
registerReducer('trace.annotate.remove', reduceAnnotation);
registerReducer('snapshot.create', reduceSnapshotEdit);
registerReducer('snapshot.rename', reduceSnapshotEdit);
registerReducer('snapshot.delete', reduceSnapshotEdit);

export function reduceEdit(snapshot: SimulationSnapshot, edit: unknown): SimulationSnapshot {
  const kind =
    typeof edit === 'object' && edit !== null && 'kind' in edit
      ? (edit.kind as unknown)
      : undefined;

  if (typeof kind !== 'string') {
    emitRejected(edit);
    return snapshot;
  }

  const reducer = getReducer(kind);
  if (reducer) {
    if (!isEdit(edit)) {
      emitRejected(edit);
      return snapshot;
    }

    return reducer(snapshot, edit as never);
  }

  const pluginSpec = getSandboxEditSpec(kind);
  if (!pluginSpec || !pluginSpec.validator(edit)) {
    emitRejected(edit);
    return snapshot;
  }

  try {
    return pluginSpec.reducer(snapshot, edit);
  } catch {
    emitRejected(edit, 'plugin-error');
    return snapshot;
  }
}
