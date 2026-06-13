import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';
import type { PacketHop, PacketTrace } from '../../types/simulation';

/** One instructive packet to predict, with the lesson it carries. */
export interface JourneyFlow {
  readonly id: string;
  readonly srcNodeId: string;
  /** Node that owns `dstIp` ('' when no node does — the no-route lesson). */
  readonly dstNodeId: string;
  readonly srcIp: string;
  readonly dstIp: string;
  /** Which routing idea this flow demonstrates. */
  readonly lesson: 'lpm' | 'default' | 'no-route';
}

/**
 * The three journeys over {@link buildJourneyTopology}: a specific route wins
 * by longest-prefix match, the default route carries unknown destinations,
 * and a router without a matching route drops the packet.
 */
export const JOURNEY_FLOWS: readonly JourneyFlow[] = [
  {
    id: 'via-lpm',
    srcNodeId: 'c1',
    dstNodeId: 'server-a',
    srcIp: '10.1.0.10',
    dstIp: '10.2.0.20',
    lesson: 'lpm',
  },
  {
    id: 'via-default',
    srcNodeId: 'c1',
    dstNodeId: 'server-b',
    srcIp: '10.1.0.10',
    dstIp: '198.51.100.20',
    lesson: 'default',
  },
  {
    id: 'dropped',
    srcNodeId: 'c1',
    dstNodeId: '',
    srcIp: '10.1.0.10',
    dstIp: '8.8.8.8',
    lesson: 'no-route',
  },
];

/** The probe packet the engine precomputes for a flow (TCP, like a request). */
export function journeyProbe(flow: JourneyFlow): InFlightPacket {
  return {
    id: `journey-${flow.id}`,
    srcNodeId: flow.srcNodeId,
    dstNodeId: flow.dstNodeId,
    currentDeviceId: flow.srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:aa:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: flow.srcIp,
        dstIp: flow.dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 40000,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
  };
}

/** One prediction the learner makes: at `nodeId`, where does the packet go? */
export interface JourneyStep {
  readonly nodeId: string;
  /** Candidate next nodes (the node's neighbors in the topology). */
  readonly options: readonly string[];
  /** The next node the real engine chose. */
  readonly correctNodeId: string;
  /** The engine hop behind this step (carries routingDecision.explanation). */
  readonly hop: PacketHop;
}

export interface PacketJourney {
  readonly flow: JourneyFlow;
  readonly trace: PacketTrace;
  readonly steps: readonly JourneyStep[];
  readonly outcome: 'delivered' | 'dropped';
  readonly dropReason: string | null;
}

function neighborsOf(topology: NetworkTopology, nodeId: string): string[] {
  const ids = new Set<string>();
  for (const edge of topology.edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }
  return [...ids];
}

/**
 * Derive the prediction steps from a real engine trace: one step per hop that
 * forwards the packet onward, asking "where next?" with the node's neighbors
 * as options and the engine's actual choice as the answer key. Steps with a
 * single option are kept — predicting "the only way out" still reinforces
 * reading the topology — and the terminal deliver/drop is reported as the
 * journey outcome rather than a step.
 */
export function buildJourney(
  flow: JourneyFlow,
  trace: PacketTrace,
  topology: NetworkTopology,
): PacketJourney {
  const steps: JourneyStep[] = [];
  for (const hop of trace.hops) {
    if (!hop.toNodeId) continue;
    if (hop.event !== 'create' && hop.event !== 'forward') continue;
    steps.push({
      nodeId: hop.nodeId,
      options: neighborsOf(topology, hop.nodeId),
      correctNodeId: hop.toNodeId,
      hop,
    });
  }

  const dropHop = trace.hops.find((hop) => hop.event === 'drop');
  return {
    flow,
    trace,
    steps,
    outcome: trace.status === 'delivered' ? 'delivered' : 'dropped',
    dropReason: dropHop?.reason ?? null,
  };
}

function edgeBetween(
  topology: NetworkTopology,
  a: string,
  b: string,
): NetworkTopology['edges'][number] | undefined {
  return topology.edges.find(
    (edge) => (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a),
  );
}

/**
 * The canvas view of a journey in progress: edges the packet has already
 * traversed (revealed predictions) glow green and animate; a wrong prediction
 * briefly paints the learner's chosen edge red. Pure — the panel just renders
 * whatever this returns.
 */
export function journeyTopologyView(
  topology: NetworkTopology,
  journey: PacketJourney,
  revealedSteps: number,
  wrongPick?: { fromNodeId: string; toNodeId: string },
): NetworkTopology {
  const traversed = new Set<string>();
  journey.steps.slice(0, revealedSteps).forEach((step) => {
    const edge = edgeBetween(topology, step.nodeId, step.correctNodeId);
    if (edge) traversed.add(edge.id);
  });
  const wrongEdgeId = wrongPick
    ? edgeBetween(topology, wrongPick.fromNodeId, wrongPick.toNodeId)?.id
    : undefined;

  return {
    ...topology,
    edges: topology.edges.map((edge) => {
      if (traversed.has(edge.id)) {
        return {
          ...edge,
          animated: true,
          style: { stroke: 'var(--netlab-accent-green)', strokeWidth: 2.5 },
        };
      }
      if (edge.id === wrongEdgeId) {
        return { ...edge, style: { stroke: 'var(--netlab-accent-red)', strokeWidth: 2.5 } };
      }
      return edge;
    }),
  };
}
