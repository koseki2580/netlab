import { hookEngine } from '../hooks/HookEngine';
import type { InFlightPacket, TcpFlags } from '../types/packets';
import type { AclRule as RuntimeAclRule } from '../types/acl';
import type { PortForwardingRule, StaticRouteConfig } from '../types/routing';
import type { PacketHop, PacketTrace, SimulationState } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { cloneSnapshot } from './SimulationSnapshot';
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
    };

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

function emitRejected(edit: unknown): void {
  void hookEngine.emit('sandbox:edit-rejected', {
    edit,
    reason: 'unknown-kind',
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
    default:
      return false;
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
  if (!reducer || !isEdit(edit)) {
    emitRejected(edit);
    return snapshot;
  }

  return reducer(snapshot, edit as never);
}
