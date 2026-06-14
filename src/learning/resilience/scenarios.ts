import type { PacketTrace } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { EMPTY_FAILURE_STATE, type FailureState } from '../../types/failure';
import { JOURNEY_FLOWS, type JourneyFlow } from '../packet-journey/journey';

function flow(id: string): JourneyFlow {
  const found = JOURNEY_FLOWS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`unknown journey flow ${id}`);
  return found;
}

function failure(over: Partial<{ edges: string[]; nodes: string[] }>): FailureState {
  return {
    downNodeIds: new Set(over.nodes ?? []),
    downEdgeIds: new Set(over.edges ?? []),
    downInterfaceIds: new Set<string>(),
  };
}

/** One "what breaks, and does the packet survive?" challenge. */
export interface ResilienceScenario {
  readonly id: string;
  readonly flow: JourneyFlow;
  readonly failure: FailureState;
  /** i18n key naming what fails (e.g. "the R1–R2 link"). */
  readonly failureKey: string;
  /** i18n key for the one-line takeaway shown after the reveal. */
  readonly lessonKey: string;
}

/**
 * Three failures over {@link buildResilienceTopology}, each teaching a distinct
 * truth about redundancy:
 *
 * 1. a redundant link lets the packet reroute and **survive**;
 * 2. the server's only attachment router dies — redundancy elsewhere can't help;
 * 3. the redundant link exists but no route uses it from R1 — useless backup.
 */
export const RESILIENCE_SCENARIOS: readonly ResilienceScenario[] = [
  {
    id: 'reroute-survives',
    flow: flow('via-lpm'),
    failure: failure({ edges: ['e-r1-r2'] }),
    failureKey: 'learning.resilience.fail.r1r2Link',
    lessonKey: 'learning.resilience.lesson.reroute',
  },
  {
    id: 'server-router-down',
    flow: flow('via-lpm'),
    failure: failure({ nodes: ['r2'] }),
    failureKey: 'learning.resilience.fail.r2Node',
    lessonKey: 'learning.resilience.lesson.lastHop',
  },
  {
    id: 'no-usable-backup',
    flow: flow('via-default'),
    failure: failure({ edges: ['e-r1-r3'] }),
    failureKey: 'learning.resilience.fail.r1r3Link',
    lessonKey: 'learning.resilience.lesson.uselessBackup',
  },
];

export const HEALTHY = EMPTY_FAILURE_STATE;

export interface ResilienceOutcome {
  readonly outcome: 'survived' | 'dropped';
  /** Node where the packet ended (delivered to, or dropped at). */
  readonly endNodeId: string;
  readonly dropReason: string | null;
  /** Edge ids the packet actually traversed — for lighting up the real path. */
  readonly traversedEdgeIds: readonly string[];
}

function edgeBetween(topology: NetworkTopology, a: string, b: string): string | undefined {
  return topology.edges.find(
    (edge) => (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a),
  )?.id;
}

/** Reduce a real engine trace into the outcome and the path it took. */
export function resilienceOutcome(
  trace: PacketTrace,
  topology: NetworkTopology,
): ResilienceOutcome {
  const traversed: string[] = [];
  for (const hop of trace.hops) {
    if (hop.toNodeId) {
      const id = edgeBetween(topology, hop.nodeId, hop.toNodeId);
      if (id) traversed.push(id);
    }
  }
  const last = trace.hops[trace.hops.length - 1];
  return {
    outcome: trace.status === 'delivered' ? 'survived' : 'dropped',
    endNodeId: last?.nodeId ?? '',
    dropReason: trace.hops.find((hop) => hop.event === 'drop')?.reason ?? null,
    traversedEdgeIds: traversed,
  };
}

/**
 * Canvas view for a scenario: down edges show as red dashed; once the outcome
 * is revealed, the path the packet actually took glows green and animates.
 */
export function resilienceTopologyView(
  topology: NetworkTopology,
  scenario: ResilienceScenario,
  revealed: ResilienceOutcome | null,
): NetworkTopology {
  const traversed = new Set(revealed?.traversedEdgeIds ?? []);
  return {
    ...topology,
    edges: topology.edges.map((edge) => {
      if (revealed && traversed.has(edge.id)) {
        return {
          ...edge,
          animated: true,
          style: { stroke: 'var(--netlab-accent-green)', strokeWidth: 2.5 },
        };
      }
      if (scenario.failure.downEdgeIds.has(edge.id)) {
        return {
          ...edge,
          style: {
            stroke: 'var(--netlab-accent-red)',
            strokeWidth: 2,
            strokeDasharray: '6 4',
          },
        };
      }
      return edge;
    }),
  };
}
