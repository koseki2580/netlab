import type { PacketHop, PacketTrace } from '../types/simulation';

export interface EditorRunSummary {
  readonly total: number;
  readonly delivered: number;
  readonly dropped: number;
  readonly inFlight: number;
  /** Hops in the longest delivered path — what a learner reads as "how far it went". */
  readonly longestPath: number;
}

/**
 * What the Results pane states after a run.
 *
 * Counting is by trace, not by hop: a learner asks "did it get there", and one
 * packet that crossed six routers is still one delivery.
 */
export function summarizeTraces(traces: readonly PacketTrace[]): EditorRunSummary {
  let delivered = 0;
  let dropped = 0;
  let inFlight = 0;
  let longestPath = 0;
  for (const trace of traces) {
    if (trace.status === 'delivered') delivered += 1;
    else if (trace.status === 'dropped') dropped += 1;
    else inFlight += 1;
    if (trace.status === 'delivered' && trace.hops.length > longestPath) {
      longestPath = trace.hops.length;
    }
  }
  return { total: traces.length, delivered, dropped, inFlight, longestPath };
}

/**
 * The edge a hop travelled over, or null for the hops that did not cross a link
 * (the packet's creation, and a drop at the node that was holding it).
 *
 * Selecting a history row highlights this edge, which is what connects the
 * textual history back to the picture.
 */
export function hopEdgeId(hop: PacketHop): string | null {
  return hop.activeEdgeId ?? null;
}

/** Flatten every trace's hops for a single chronological history list. */
export function historyRows(
  traces: readonly PacketTrace[],
): { trace: PacketTrace; hop: PacketHop }[] {
  return traces.flatMap((trace) => trace.hops.map((hop) => ({ trace, hop })));
}

/** What one Run did, in the terms the outcome line states it. */
export type RunOutcome =
  | { readonly kind: 'delivered' }
  | { readonly kind: 'dropped'; readonly nodeLabel: string; readonly reason: string | null }
  | { readonly kind: 'not-sent' };

/**
 * The outcome of a run's trace. A trace that never finished counts as not
 * arriving at the last device it reached — to a learner that is what it is.
 */
export function runOutcome(trace: PacketTrace | undefined): RunOutcome {
  if (!trace || trace.hops.length === 0) return { kind: 'not-sent' };
  if (trace.status === 'delivered') return { kind: 'delivered' };
  const drop = [...trace.hops].reverse().find((hop) => hop.event === 'drop');
  const last = drop ?? trace.hops[trace.hops.length - 1]!;
  return { kind: 'dropped', nodeLabel: last.nodeLabel, reason: drop?.reason ?? null };
}

/** Drop reasons the editor explains in words; the rest say so. */
const EXPLAINED_DROP_REASONS: ReadonlySet<string> = new Set([
  'no-route',
  'ttl-exceeded',
  'ttl-expired',
  'routing-loop',
  'node-down',
  'link-failed',
  'interface-down',
  'node-not-found',
  'no-egress-in-vlan',
  'stp-port-blocked',
  'queue-full',
  'loss',
]);

/**
 * Catalogue key for the plain-language explanation shown beside a drop code.
 * The code itself is hyphenated (`no-route`); a key segment is camelCase.
 */
export function dropReasonKey(reason: string): string {
  return EXPLAINED_DROP_REASONS.has(reason)
    ? `editor.dropReason.${reason.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`
    : 'editor.dropReason.unknown';
}
