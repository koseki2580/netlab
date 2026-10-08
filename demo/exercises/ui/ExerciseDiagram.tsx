import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { NetlabCanvas } from '../../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../../src/components/NetlabProvider';
import { useNetlabUI } from '../../../src/components/NetlabUIContext';
import { extractPathEdgeIds } from '../../../src/simulation/extractPathEdgeIds';
import { SimulationProvider, useSimulation } from '../../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../../src/types/simulation';
import type { NetworkTopology, TopologySnapshot } from '../../../src/types/topology';
import { diagramNotesCss, diagramNotesLines } from './diagramNotes';

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
  /** A phone: the boxes are too small to carry the notes, so they are listed over the picture. */
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
      {notes.length > 0 ? (
        <ul
          data-testid="exercise-diagram-notes"
          data-legend={legend ? '' : undefined}
          style={
            legend
              ? {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1,
                  margin: 0,
                  padding: '4px 16px',
                  listStyle: 'none',
                  pointerEvents: 'none',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--netlab-text-primary)',
                  background: 'color-mix(in srgb, var(--netlab-bg-primary) 85%, transparent)',
                }
              : {
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  margin: -1,
                  padding: 0,
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                }
          }
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
