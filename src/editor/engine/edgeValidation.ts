import { getValidationMessages } from '../../components/ValidationEdgeLabel';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import { validateConnection, type ValidationResult } from '../../utils/connectionValidator';

export type EdgeTone = 'ok' | 'warning' | 'error';

export interface EdgeVerdict {
  readonly tone: EdgeTone;
  readonly result: ValidationResult;
  /** Human-readable errors and warnings, already prefixed. */
  readonly messages: string[];
}

export const EDGE_TONE_COLOR: Readonly<Record<EdgeTone, string>> = {
  ok: 'var(--netlab-edge-default, var(--netlab-text-secondary))',
  warning: 'var(--netlab-accent-orange, orange)',
  error: 'var(--netlab-accent-red, #ef4444)',
};

/**
 * How a drawn link should read: fine, questionable, or wrong.
 *
 * Shared by both engines. The verdict is what a learner acts on — "this cable
 * is in the wrong place" is the lesson — so it must not depend on which canvas
 * is mounted.
 *
 * The edge under test is excluded from the edge list it is validated against,
 * or every link would collide with itself.
 */
export function edgeVerdict(
  nodes: readonly NetlabNode[],
  edges: readonly NetlabEdge[],
  edge: NetlabEdge,
): EdgeVerdict {
  const result = validateConnection(
    [...nodes],
    edges.filter((candidate) => candidate.id !== edge.id),
    edge.source,
    edge.target,
    edge.sourceHandle,
    edge.targetHandle,
  );
  const tone: EdgeTone = !result.valid ? 'error' : result.warnings.length > 0 ? 'warning' : 'ok';
  return { tone, result, messages: getValidationMessages(result) };
}
