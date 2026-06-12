import type { NetworkTopology } from '../../types/topology';
import type { RouteProblem } from './types';

/** Node id the drill treats as "the router making the decision". */
export const DECIDING_ROUTER_ID = 'r-deciding';

/** Node id for the neighbor that owns a given next-hop address. */
export function nextHopNodeId(nextHop: string): string {
  return `hop-${nextHop}`;
}

/** Reverse of {@link nextHopNodeId}; `null` for non-neighbor node ids. */
export function nextHopFromNodeId(nodeId: string): string | null {
  return nodeId.startsWith('hop-') ? nodeId.slice('hop-'.length) : null;
}

/** Post-answer canvas feedback: color the LPM winner (and a wrong pick). */
export interface RouteHighlight {
  /** Next-hop of the longest-prefix-match winner — its edge turns green and animates. */
  readonly winner: string;
  /** A wrongly chosen next-hop — its edge turns red. */
  readonly wrongChoice?: string;
}

/**
 * Render a {@link RouteProblem} as a small star topology: the deciding router
 * in the middle and one neighbor router per unique next-hop around it. Clicking
 * a neighbor on the canvas is then a routing answer — the visual counterpart of
 * typing the next-hop address. Pass `highlight` after grading so the feedback
 * is visible on the network itself, not only in text.
 */
export function routeProblemTopology(
  problem: RouteProblem,
  highlight?: RouteHighlight,
): NetworkTopology {
  const nextHops = [...new Set(problem.routes.map((route) => route.nextHop))];
  const radius = 190;
  const center = { x: 260, y: 200 };

  const neighborNodes = nextHops.map((nextHop, index) => {
    const angle = (2 * Math.PI * index) / nextHops.length - Math.PI / 2;
    return {
      id: nextHopNodeId(nextHop),
      type: 'router' as const,
      position: {
        x: Math.round(center.x + radius * Math.cos(angle)),
        y: Math.round(center.y + radius * Math.sin(angle)),
      },
      data: {
        label: nextHop,
        role: 'router' as const,
        layerId: 'l3' as const,
      },
    };
  });

  return {
    nodes: [
      {
        id: DECIDING_ROUTER_ID,
        type: 'router',
        position: center,
        data: { label: 'R1', role: 'router', layerId: 'l3' },
      },
      ...neighborNodes,
    ],
    edges: nextHops.map((nextHop) => {
      const isWinner = highlight?.winner === nextHop;
      const isWrong = !isWinner && highlight?.wrongChoice === nextHop;
      return {
        id: `e-${DECIDING_ROUTER_ID}-${nextHopNodeId(nextHop)}`,
        source: DECIDING_ROUTER_ID,
        target: nextHopNodeId(nextHop),
        type: 'smoothstep',
        ...(isWinner
          ? { animated: true, style: { stroke: 'var(--netlab-accent-green)', strokeWidth: 2.5 } }
          : {}),
        ...(isWrong ? { style: { stroke: 'var(--netlab-accent-red)', strokeWidth: 2.5 } } : {}),
      };
    }),
    areas: [],
    routeTables: new Map(),
  };
}
