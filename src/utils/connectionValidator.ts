import type { NetlabNode, NetlabEdge } from '../types/topology';
import { isInSameSubnet } from './cidr';

const L7_ROLES = new Set<string>(['client', 'server']);
const IP_REQUIRED_ROLES = new Set<string>(['client', 'server', 'router']);

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: 'self-loop' | 'duplicate-edge' | 'interface-in-use' | 'endpoint-to-endpoint';
  message: string;
}

export interface ValidationWarning {
  code: 'subnet-mismatch' | 'missing-ip';
  message: string;
}

export interface TopologyValidationResult {
  valid: boolean;
  edgeResults: Map<string, ValidationResult>;
  errorCount: number;
  warningCount: number;
}

function findNode(nodes: NetlabNode[], nodeId: string): NetlabNode | undefined {
  return nodes.find((node) => node.id === nodeId);
}

function sameNodePair(edge: NetlabEdge, sourceId: string, targetId: string): boolean {
  return (
    (edge.source === sourceId && edge.target === targetId) ||
    (edge.source === targetId && edge.target === sourceId)
  );
}

function isHandleInUse(edges: NetlabEdge[], nodeId: string, handleId: string): boolean {
  return edges.some(
    (edge) =>
      (edge.source === nodeId && edge.sourceHandle === handleId) ||
      (edge.target === nodeId && edge.targetHandle === handleId),
  );
}

function resolveHandleName(node: NetlabNode | undefined, handleId: string): string {
  if (!node) return handleId;

  const iface = (node.data.interfaces ?? []).find((candidate) => candidate.id === handleId);
  if (iface) return iface.name;

  const port = (node.data.ports ?? []).find((candidate) => candidate.id === handleId);
  if (port) return port.name;

  return handleId;
}

function resolveHandleCidr(node: NetlabNode | undefined, handleId: string): string | null {
  if (!node) return null;

  const iface = (node.data.interfaces ?? []).find((candidate) => candidate.id === handleId);
  if (!iface?.ipAddress) return null;

  return `${iface.ipAddress}/${iface.prefixLength}`;
}

function needsIp(node: NetlabNode | undefined): boolean {
  return Boolean(node && IP_REQUIRED_ROLES.has(node.data.role));
}

function hasIp(node: NetlabNode | undefined): boolean {
  if (!node) return false;

  if (node.data.role === 'router') {
    return (node.data.interfaces ?? []).some((iface) => Boolean(iface.ipAddress));
  }

  if (typeof node.data.ip === 'string' && node.data.ip.length > 0) {
    return true;
  }

  return (node.data.interfaces ?? []).some((iface) => Boolean(iface.ipAddress));
}

/**
 * Returns false if both roles are L7 endpoints (client/server).
 * Undefined roles are treated as valid to avoid false positives on non-device nodes.
 */
export function isValidConnection(
  sourceRole: string | undefined,
  targetRole: string | undefined,
): boolean {
  if (!sourceRole || !targetRole) return true;
  return !(L7_ROLES.has(sourceRole) && L7_ROLES.has(targetRole));
}

export function validateConnection(
  nodes: NetlabNode[],
  edges: NetlabEdge[],
  sourceId: string,
  targetId: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): ValidationResult {
  const sourceNode = findNode(nodes, sourceId);
  const targetNode = findNode(nodes, targetId);
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (sourceId === targetId) {
    errors.push({
      code: 'self-loop',
      message: 'Self-loop: a node cannot connect to itself',
    });
  }

  if (sourceId && targetId && edges.some((edge) => sameNodePair(edge, sourceId, targetId))) {
    errors.push({
      code: 'duplicate-edge',
      message: 'Duplicate edge: nodes are already connected',
    });
  }

  if (sourceId && sourceHandle && isHandleInUse(edges, sourceId, sourceHandle)) {
    errors.push({
      code: 'interface-in-use',
      message: `Interface already in use: ${resolveHandleName(sourceNode, sourceHandle)}`,
    });
  }

  if (targetId && targetHandle && isHandleInUse(edges, targetId, targetHandle)) {
    errors.push({
      code: 'interface-in-use',
      message: `Interface already in use: ${resolveHandleName(targetNode, targetHandle)}`,
    });
  }

  if (!isValidConnection(sourceNode?.data.role, targetNode?.data.role)) {
    errors.push({
      code: 'endpoint-to-endpoint',
      message: 'Endpoint-to-endpoint connections are not allowed',
    });
  }

  if (
    sourceNode?.data.role === 'router' &&
    targetNode?.data.role === 'router' &&
    sourceHandle &&
    targetHandle
  ) {
    const sourceCidr = resolveHandleCidr(sourceNode, sourceHandle);
    const targetCidr = resolveHandleCidr(targetNode, targetHandle);

    if (sourceCidr && targetCidr && !isInSameSubnet(sourceCidr, targetCidr)) {
      warnings.push({
        code: 'subnet-mismatch',
        message: `Subnet mismatch: ${sourceCidr} and ${targetCidr} are in different subnets`,
      });
    }
  }

  const nodesRequiringIp = [sourceNode, targetNode];
  const seenWarningNodes = new Set<string>();
  for (const node of nodesRequiringIp) {
    if (!node || seenWarningNodes.has(node.id) || !needsIp(node) || hasIp(node)) {
      continue;
    }

    seenWarningNodes.add(node.id);
    warnings.push({
      code: 'missing-ip',
      message: `Missing IP configuration on ${node.data.label}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Looks up roles from the nodes array by ID, then delegates to isValidConnection.
 * Returns true if either node is not found (safe default).
 */
export function isValidConnectionBetweenNodes(
  nodes: NetlabNode[],
  sourceId: string | null,
  targetId: string | null,
): boolean {
  const source = nodes.find((n) => n.id === sourceId);
  const target = nodes.find((n) => n.id === targetId);
  return isValidConnection(source?.data?.role, target?.data?.role);
}

/**
 * Convenience wrapper for classifying an existing edge.
 */
export function isValidEdge(nodes: NetlabNode[], edge: NetlabEdge): boolean {
  return isValidConnectionBetweenNodes(nodes, edge.source, edge.target);
}

export function validateTopology(
  nodes: NetlabNode[],
  edges: NetlabEdge[],
): TopologyValidationResult {
  const edgeResults = new Map<string, ValidationResult>();
  let errorCount = 0;
  let warningCount = 0;

  for (const edge of edges) {
    const result = validateConnection(
      nodes,
      edges.filter((candidate) => candidate.id !== edge.id),
      edge.source,
      edge.target,
      edge.sourceHandle,
      edge.targetHandle,
    );

    edgeResults.set(edge.id, result);
    errorCount += result.errors.length;
    warningCount += result.warnings.length;
  }

  return {
    valid: errorCount === 0,
    edgeResults,
    errorCount,
    warningCount,
  };
}
