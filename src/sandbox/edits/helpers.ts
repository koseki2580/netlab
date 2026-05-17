import type { PacketTrace, SimulationState } from '../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { cloneSnapshot } from '../SimulationSnapshot';
import type { NatRule, SandboxAclRule, SimulationSnapshot } from '../types';

type SandboxNodeData = NetlabNode['data'] & {
  readonly sandboxNatRules?: readonly NatRule[];
  readonly sandboxAclRules?: readonly SandboxAclRule[];
};

export function replaceNode(
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
export function withTopology(
  snapshot: SimulationSnapshot,
  topology: NetworkTopology,
): SimulationSnapshot {
  return cloneSnapshot({ ...snapshot, topology });
}
export function withState(
  snapshot: SimulationSnapshot,
  state: SimulationState,
): SimulationSnapshot {
  return cloneSnapshot({ ...snapshot, state });
}
export function nodeRuleAdd<R extends NatRule | SandboxAclRule>(
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
export function nodeRuleRemove(
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
export function nodeRuleEdit<R extends NatRule | SandboxAclRule>(
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
export function nodeIp(topology: NetworkTopology, nodeId: string): string {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  return (
    (typeof node?.data.ip === 'string' ? node.data.ip : undefined) ??
    node?.data.interfaces?.[0]?.ipAddress ??
    '0.0.0.0'
  );
}
export function nodeLabel(topology: NetworkTopology, nodeId: string): string {
  return topology.nodes.find((candidate) => candidate.id === nodeId)?.data.label ?? nodeId;
}
export function appendTrace(snapshot: SimulationSnapshot, trace: PacketTrace): SimulationSnapshot {
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
