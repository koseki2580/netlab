import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { NetlabCanvas } from '../../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../../src/components/NetlabProvider';
import { useNetlabUI } from '../../../src/components/NetlabUIContext';
import { extractPathEdgeIds } from '../../../src/simulation/extractPathEdgeIds';
import { SimulationProvider, useSimulation } from '../../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../../src/types/simulation';
import type { NetworkTopology, TopologySnapshot } from '../../../src/types/topology';
import { diagramLegendLines, diagramNotesCss, diagramNotesLines } from './diagramNotes';

/** A trace the grader produced, to be shown on the diagram. `run` tells two presses apart. */
export interface DiagramReplay {
  readonly trace: PacketTrace;
  readonly run: number;
}

/** Slower than the library's own autoplay: a beginner has to be able to follow the dot. */
const REPLAY_STEP_MS = 700;

const SCOPE = '[data-exercise-diagram]';
const NODE = '[data-testid="topology-node"]';

/**
 * Plays the grader's own trace on the canvas. Nothing is sent again: the trace
 * is loaded into the page's engine as its current trace and stepped through,
 * so what the learner watches is exactly what was graded.
 */
function ReplayDriver({ replay }: { replay: DiagramReplay | null }) {
  const { engine } = useSimulation();
  useEffect(() => {
    if (!replay) return undefined;
    engine.setState({
      ...engine.getState(),
      status: 'paused',
      traces: [replay.trace],
      currentTraceId: replay.trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      activePathEdgeIds: extractPathEdgeIds(replay.trace),
      selectedHop: null,
      selectedPacket: null,
    });
    engine.play(REPLAY_STEP_MS);
    return () => engine.pause();
  }, [engine, replay]);
  return null;
}

/** What the learner pressed on the diagram. */
export type DiagramPick =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'link'; readonly id: string };

/**
 * Keeps the library's detail panels shut. A press on a device or a cable
 * selects it in the canvas, and the canvas answers a selection with its expert
 * panel (MTU, QoS, DSCP), which covered the picture and shifted the page. Here
 * the selection is taken back before it is painted, and the page is told what
 * was pressed instead.
 */
function SelectionGuard({ onPick }: { onPick: ((pick: DiagramPick) => void) | undefined }) {
  const { selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId } = useNetlabUI();
  const report = useRef(onPick);
  report.current = onPick;
  useLayoutEffect(() => {
    if (selectedNodeId !== null) {
      setSelectedNodeId(null);
      report.current?.({ kind: 'node', id: selectedNodeId });
    }
  }, [selectedNodeId, setSelectedNodeId]);
  useLayoutEffect(() => {
    if (selectedEdgeId !== null && selectedEdgeId !== undefined) {
      setSelectedEdgeId?.(null);
      report.current?.({ kind: 'link', id: selectedEdgeId });
    }
  }, [selectedEdgeId, setSelectedEdgeId]);
  return null;
}

/** Half the width of the band around a cable in which a press counts as a press on it. */
const CABLE_REACH_PX = 14;
/** A finger that moved further than this was scrolling, not pressing. */
const TAP_SLOP_PX = 10;

/** The cable nearest to a point on the screen, within reach; null when none is. */
function cableNear(root: HTMLElement, x: number, y: number): string | null {
  let best: { id: string; distance: number } | null = null;
  for (const group of root.querySelectorAll<SVGGElement>('g.netlab-edge[data-edge-id]')) {
    const id = group.getAttribute('data-edge-id');
    const path = group.querySelector('path');
    const matrix = path?.getScreenCTM?.();
    if (!id || !path || !matrix || typeof path.getTotalLength !== 'function') continue;
    const length = path.getTotalLength();
    const steps = Math.max(1, Math.ceil(length / 3));
    for (let step = 0; step <= steps; step += 1) {
      const point = path.getPointAtLength((length * step) / steps);
      const px = point.x * matrix.a + point.y * matrix.c + matrix.e;
      const py = point.x * matrix.b + point.y * matrix.d + matrix.f;
      const distance = Math.hypot(px - x, py - y);
      if (distance <= CABLE_REACH_PX && (best === null || distance < best.distance)) {
        best = { id, distance };
      }
    }
  }
  return best?.id ?? null;
}

/**
 * Presses on cables, taken before the canvas sees them.
 *
 * The canvas draws a cable with a 9px line to press, measured in the picture's
 * own units: on a phone that is a few pixels. And a finger on it did not
 * select the cable (a mouse did): the canvas showed its editor's handles on it
 * instead and the red dashes were gone. So a press that lands within reach of
 * a cable, and not on a device, is answered here and never reaches the
 * canvas: `onPick` is told, with a mouse and with a finger alike.
 */
function useCablePresses(
  root: RefObject<HTMLDivElement>,
  onPick: ((pick: DiagramPick) => void) | undefined,
) {
  const report = useRef(onPick);
  report.current = onPick;
  useEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    let pressed: { id: string; x: number; y: number } | null = null;

    const pointOf = (event: Event): { x: number; y: number } | null => {
      const touch = (event as TouchEvent).changedTouches?.[0];
      if (touch) return { x: touch.clientX, y: touch.clientY };
      const { clientX, clientY } = event as MouseEvent;
      return typeof clientX === 'number' ? { x: clientX, y: clientY } : null;
    };
    const down = (event: Event) => {
      const point = pointOf(event);
      const target = event.target as Element | null;
      // The first event of a press decides; the ones that follow it (a touch
      // is followed by pointer and mouse events) only ask whether to pass.
      if (event.type === 'pointerdown' || pressed === null) {
        // "On a device" means inside its box. The notes drawn under a box belong
        // to it too, and they hang over the cables beside it.
        const box = target?.closest?.(NODE)?.getBoundingClientRect();
        const onDevice =
          box !== undefined &&
          point !== null &&
          point.x >= box.left &&
          point.x <= box.right &&
          point.y >= box.top &&
          point.y <= box.bottom;
        const id = point && !onDevice ? cableNear(element, point.x, point.y) : null;
        pressed = id !== null && point ? { id, ...point } : null;
      }
      if (pressed) event.stopPropagation();
    };
    const up = (event: Event) => {
      if (pressed) event.stopPropagation();
    };
    // Told on the click, the last event of a press: telling it earlier moves
    // the page (the cable's card is scrolled into view), and the events still
    // to come would land on whatever is under the finger by then.
    const click = (event: Event) => {
      if (!pressed) return;
      event.stopPropagation();
      const point = pointOf(event);
      const { id, x, y } = pressed;
      pressed = null;
      if (point && Math.hypot(point.x - x, point.y - y) <= TAP_SLOP_PX) {
        report.current?.({ kind: 'link', id });
      }
    };
    const cancel = () => {
      pressed = null;
    };
    const downs = ['pointerdown', 'mousedown', 'touchstart'];
    const ups = ['pointerup', 'mouseup', 'touchend'];
    for (const type of downs) {
      element.addEventListener(type, down, { capture: true, passive: true });
    }
    for (const type of ups) element.addEventListener(type, up, { capture: true, passive: true });
    element.addEventListener('click', click, true);
    element.addEventListener('pointercancel', cancel, true);
    return () => {
      for (const type of downs) element.removeEventListener(type, down, true);
      for (const type of ups) element.removeEventListener(type, up, true);
      element.removeEventListener('click', click, true);
      element.removeEventListener('pointercancel', cancel, true);
    };
  }, [root]);
}

/**
 * The exercise's network as it stands now. It cannot be edited here: the form
 * is the only way to change a setting, so nothing outside the allow-list moves.
 */
export function ExerciseDiagram({
  topology,
  replay,
  highlightNodeId,
  label,
  locale,
  legend = false,
  onPick,
}: {
  topology: TopologySnapshot;
  replay: DiagramReplay | null;
  /** The device of the setting the learner is working on. */
  highlightNodeId: string | null;
  label: string;
  locale: 'en' | 'ja';
  /** A phone: the page shows `DiagramLegend` under the picture, so the notes are not said twice. */
  legend?: boolean;
  /** A device or a cable was pressed. No panel opens; the page decides what a press means. */
  onPick?: (pick: DiagramPick) => void;
}) {
  // `NetlabProvider` computes the route tables itself; it only needs the Map to exist.
  const runnable = useMemo<NetworkTopology>(
    () => ({ ...topology, routeTables: new Map() }),
    [topology],
  );
  const notes = useMemo(() => diagramNotesLines(topology, locale), [topology, locale]);
  const rootRef = useRef<HTMLDivElement>(null);
  useCablePresses(rootRef, onPick);
  const css = [
    // The library's 14px dot is hard to follow on a phone.
    `${SCOPE} [data-testid="canvas-packet"]{width:20px !important;height:20px !important;margin:-3px 0 0 -3px;}`,
    // The library draws a device's name on one 60px line, and a name such as
    // 「教室のパソコン」 ran out of its box. Here a name gets 70px and a second
    // line; the box gives up the same height in padding, so no device grows and
    // the cables stay where the layout put them (`templates/shared/labelFit.ts`).
    `${SCOPE} ${NODE}{padding-top:5px !important;padding-bottom:5px !important;}`,
    `${SCOPE} ${NODE} > div[style*="font-weight: bold"]{white-space:normal;overflow-wrap:anywhere;line-height:1.25;min-height:2.5em;margin:0 -5px;display:flex;align-items:center;justify-content:center;}`,
    highlightNodeId === null
      ? ''
      : `${SCOPE} [data-id=${JSON.stringify(highlightNodeId)}] ${NODE}{outline:3px solid var(--netlab-accent-cyan);outline-offset:0;border-radius:8px;}`,
    // What the texts point at: each router side's address, each access port's VLAN.
    diagramNotesCss(topology, SCOPE),
  ].join('\n');
  return (
    <div
      ref={rootRef}
      data-testid="exercise-diagram"
      data-exercise-diagram=""
      role="group"
      aria-label={label}
      style={{ position: 'absolute', inset: 0 }}
    >
      <style>{css}</style>
      {/* The notes are generated content, which a screen reader and a test cannot
          read, and on a phone the boxes are drawn too small to read them on:
          there they are a legend over the picture; elsewhere they are said, unseen. */}
      {/* Said, unseen: beside the picture the notes are on the boxes; on a phone
          they are the legend under the picture (`DiagramLegend`). */}
      {notes.length > 0 && !legend ? (
        <ul
          data-testid="exercise-diagram-notes"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            margin: -1,
            padding: 0,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {notes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <NetlabProvider topology={runnable}>
        {/* The main-thread engine: only a replay runs here, and a worker per keystroke would be waste. */}
        <SimulationProvider useMainThread>
          <ReplayDriver replay={replay} />
          {/* A picture, not an editor: devices stay where the exercise put them, and
              a wheel or a finger over the diagram scrolls the page instead of zooming. */}
          <NetlabCanvas
            followTopology
            minimap={false}
            fitViewPadding={0.2}
            interactiveGraph={false}
          >
            <SelectionGuard onPick={onPick} />
          </NetlabCanvas>
        </SimulationProvider>
      </NetlabProvider>
    </div>
  );
}

/**
 * The picture in words, for a phone: every device with its address, in text a
 * person can read (the names and addresses on the picture are 3 to 5 pixels
 * high there). It stands under the picture, in the flow of the page, so it
 * covers no device.
 */
export function DiagramLegend({
  topology,
  locale,
}: {
  topology: TopologySnapshot;
  locale: 'en' | 'ja';
}) {
  const lines = useMemo(() => diagramLegendLines(topology, locale), [topology, locale]);
  if (lines.length === 0) return null;
  return (
    <ul
      data-testid="exercise-diagram-notes"
      data-legend=""
      aria-label={
        locale === 'ja' ? '図の機器とアドレス' : 'The devices on the diagram and their addresses'
      }
      style={{
        margin: 0,
        padding: '6px 16px 8px',
        listStyle: 'none',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        lineHeight: 1.6,
        color: 'var(--netlab-text-primary)',
        background: 'var(--netlab-bg-primary)',
        borderTop: '1px solid var(--netlab-border)',
        overflowWrap: 'anywhere',
      }}
    >
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
