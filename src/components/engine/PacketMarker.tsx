import { useLayoutEffect, useRef, useState } from 'react';
import type { Graph } from '@maxgraph/core';
import type { NetlabEdge } from '../../types/topology';
import type { CanvasPacket } from './canvasEngine';
import type { HopBubbleKind } from './packetStory';

/**
 * The packet itself, drawn on the diagram: a dot that travels along the links
 * to the device the shown hop is at and rests there, and a sentence at the
 * device where something happened.
 *
 * Positions come from maxGraph's own view of the cells, so the dot follows the
 * links as they are routed, and is recomputed whenever the view pans, zooms or
 * redraws (`revision`).
 */

interface Point {
  x: number;
  y: number;
}

const MARKER_SIZE = 14;
/** Time the dot takes over one link when stepping. Shorter than autoplay's 500ms tick. */
const HOP_MS = 420;
/** Time per link when replaying a whole journey, and the most a journey may take. */
const JOURNEY_LINK_MS = 380;
const JOURNEY_MAX_MS = 3200;

const BUBBLE_ACCENT: Record<HopBubbleKind, string> = {
  arpRequest: 'var(--netlab-accent-yellow)',
  arpReply: 'var(--netlab-accent-yellow)',
  nat: 'var(--netlab-accent-purple)',
  drop: 'var(--netlab-accent-red)',
};

function stateOf(graph: Graph, id: string) {
  const cell = graph.getDataModel().getCell(id);
  return cell ? graph.getView().getState(cell) : null;
}

/** Where the dot sits on a device: on the middle of its top edge, clear of its icon. */
function restPoint(graph: Graph, id: string): Point | null {
  const state = stateOf(graph, id);
  if (!state) return null;
  return { x: state.getCenterX(), y: state.y };
}

/** The drawn route of the link between two devices, oriented from `from` to `to`. */
function linkPoints(graph: Graph, edges: readonly NetlabEdge[], from: string, to: string): Point[] {
  const edge = edges.find(
    (candidate) =>
      (candidate.source === from && candidate.target === to) ||
      (candidate.source === to && candidate.target === from),
  );
  const points = (edge ? stateOf(graph, edge.id)?.absolutePoints : null) ?? [];
  const drawn = points.filter((point): point is NonNullable<typeof point> => point != null);
  const oriented = edge?.source === to ? [...drawn].reverse() : drawn;
  return oriented.map((point) => ({ x: point.x, y: point.y }));
}

/** Every point the dot passes through, from the first device of the route to the last. */
export function travelPath(
  graph: Graph,
  edges: readonly NetlabEdge[],
  route: readonly string[],
): Point[] {
  const path: Point[] = [];
  route.forEach((id, index) => {
    const rest = restPoint(graph, id);
    if (!rest) return;
    const previous = route[index - 1];
    if (previous !== undefined) path.push(...linkPoints(graph, edges, previous, id));
    path.push(rest);
  });
  return path;
}

function translate(point: Point): string {
  return `translate(${point.x - MARKER_SIZE / 2}px, ${point.y - MARKER_SIZE / 2}px)`;
}

export function PacketMarker({
  graph,
  edges,
  packet,
  revision,
  label,
  bubbleText,
}: {
  graph: Graph;
  edges: readonly NetlabEdge[];
  packet: CanvasPacket;
  /** Changes whenever the view moves or the cells are redrawn. */
  revision: number;
  label: string;
  bubbleText: string | null;
}) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState(false);
  void revision;

  const rest = restPoint(graph, packet.route[packet.route.length - 1] ?? packet.at);
  const bubbleAt = packet.bubble ? stateOf(graph, packet.bubble.nodeId) : null;
  const hasRest = rest !== null;

  // Play the motion once per showing, not on every pan or redraw.
  useLayoutEffect(() => {
    const element = markerRef.current;
    if (!element || !hasRest) return undefined;
    const path = travelPath(graph, edges, packet.route);
    if (!packet.animate || path.length < 2 || typeof element.animate !== 'function') {
      setMoving(false);
      return undefined;
    }
    const lengths = path.map((point, index) =>
      index === 0 ? 0 : Math.hypot(point.x - path[index - 1]!.x, point.y - path[index - 1]!.y),
    );
    const total = lengths.reduce((sum, length) => sum + length, 0);
    if (!(total > 0)) {
      setMoving(false);
      return undefined;
    }
    let travelled = 0;
    const keyframes = path.map((point, index) => {
      travelled += lengths[index]!;
      return { transform: translate(point), offset: travelled / total };
    });
    const links = packet.route.length - 1;
    const journey = links > 1;
    const animation = element.animate(keyframes, {
      duration: journey ? Math.min(JOURNEY_MAX_MS, links * JOURNEY_LINK_MS) : HOP_MS,
      easing: journey ? 'linear' : 'ease-in-out',
    });
    setMoving(true);
    animation.onfinish = () => setMoving(false);
    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
    // Keyed on the showing; the edges and graph are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packet.id, packet.animate, hasRest]);

  if (!rest) return null;
  return (
    <>
      <div
        ref={markerRef}
        data-testid="canvas-packet"
        data-at={packet.at}
        data-moving={moving ? 'true' : 'false'}
        role="img"
        aria-label={label}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          borderRadius: '50%',
          background: packet.color,
          border: '2px solid var(--netlab-bg-primary)',
          boxShadow: `0 0 0 2px ${packet.color}, 0 0 10px 2px ${packet.color}`,
          boxSizing: 'border-box',
          transform: translate(rest),
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {packet.bubble && bubbleText && bubbleAt && !moving ? (
        <div
          data-testid="canvas-hop-bubble"
          data-kind={packet.bubble.kind}
          data-at={packet.bubble.nodeId}
          role="status"
          style={{
            position: 'absolute',
            left: bubbleAt.getCenterX(),
            top: bubbleAt.y - MARKER_SIZE,
            transform: 'translate(-50%, -100%)',
            width: 'max-content',
            maxWidth: 260,
            padding: '5px 10px',
            borderRadius: 8,
            border: `2px solid ${BUBBLE_ACCENT[packet.bubble.kind]}`,
            background: 'var(--netlab-bg-elevated)',
            color: 'var(--netlab-text-primary)',
            fontSize: 12,
            lineHeight: 1.4,
            fontWeight: 600,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {bubbleText}
        </div>
      ) : null}
    </>
  );
}
