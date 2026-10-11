import {
  createContext,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ResizableSidebar,
  type ResizableSidebarProps,
} from '../../src/components/ResizableSidebar';
import { hopReadout, traceOutcome } from '../../src/components/simulation/traceWords';
import { useI18n } from '../../src/i18n/useI18n';
import { useSimulation } from '../../src/simulation/SimulationContext';
import { useViewport } from '../../src/utils/useViewport';

/**
 * The layout a lesson with a canvas and a side panel shares.
 *
 * On a wide screen the canvas sits beside a panel that can be dragged wider.
 * On a narrow one the panel alone is wider than the screen and the canvas was
 * squeezed to nothing, so the lesson becomes one scrolling column: the notes
 * that float over the canvas, the canvas at a fixed height, then the panel.
 */

// Tall enough to show a lesson's devices, short enough to leave the first
// control of the panel on the first screen.
export const NARROW_CANVAS_HEIGHT = 280;

const SPLIT_STYLE: CSSProperties = { height: '100%' };
const CANVAS_STYLE: CSSProperties = { flex: 1, position: 'relative', minWidth: 0 };

/** What places a note over the canvas; none of it applies once it is in flow. */
const FLOATING = new Set([
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'maxWidth',
  'zIndex',
  'borderRadius',
]);

/**
 * Where a pinned lesson's pieces go on a narrow screen: the actions directly
 * under the diagram, the notes at the top of the panel that scrolls below.
 */
interface PinSlots {
  actions: HTMLElement | null;
  notes: HTMLElement | null;
  setActions: (element: HTMLElement | null) => void;
  setNotes: (element: HTMLElement | null) => void;
}

const PinContext = createContext<PinSlots | null>(null);

/** Share of the lesson's height the pinned diagram keeps, as the course's does. */
const PINNED_CANVAS = '0 0 38%';

const ACTIONS_CSS =
  '[data-lesson-actions]:empty{display:none}' +
  // A thumb's worth of height for everything pressed in the action bar.
  '[data-lesson-actions] button{min-height:44px}';

/**
 * The row that holds a `LessonCanvas` and a `LessonPanel`. `style` is the wide
 * row's own.
 *
 * `pinned` changes the narrow layout only. Without it the lesson is one
 * scrolling column, so the diagram scrolls away from the button that drives
 * it. With it the diagram keeps a fixed share of the height, whatever is
 * wrapped in `LessonPinned` sits in a bar right under it, and only the panel
 * (with the notes at its top) scrolls: the diagram, the action and its status
 * are on screen together, and nothing reaches under the shell's bottom bar
 * because nothing here is taller than the space the shell gives it.
 */
export function LessonSplit({
  style = SPLIT_STYLE,
  pinned = false,
  children,
}: {
  style?: CSSProperties;
  pinned?: boolean;
  children: ReactNode;
}) {
  const { isNarrow } = useViewport();
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [notes, setNotes] = useState<HTMLElement | null>(null);
  const slots = useMemo(() => ({ actions, notes, setActions, setNotes }), [actions, notes]);
  if (isNarrow && pinned) {
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <style>{ACTIONS_CSS}</style>
        <PinContext.Provider value={slots}>{children}</PinContext.Provider>
      </div>
    );
  }
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        ...(isNarrow ? { flexDirection: 'column', overflowY: 'auto' } : {}),
      }}
    >
      {children}
    </div>
  );
}

/**
 * The canvas side. `canvas` is the canvas and whatever must stay on top of it;
 * `children` are the notes (`LessonNote`) that float over it on a wide screen
 * and are read above it (below, when pinned to its bottom) on a narrow one. `style` is the wide canvas box's own.
 */
export function LessonCanvas({
  canvas,
  style = CANVAS_STYLE,
  children,
}: {
  canvas: ReactNode;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { isNarrow } = useViewport();
  const pin = useContext(PinContext);
  if (!isNarrow) {
    return (
      <div style={style}>
        {canvas}
        {children}
      </div>
    );
  }
  if (pin) {
    return (
      <>
        <div
          data-testid="lesson-diagram"
          style={{ flex: PINNED_CANVAS, minHeight: 240, position: 'relative' }}
        >
          {canvas}
        </div>
        <div
          ref={pin.setActions}
          data-testid="lesson-actions"
          data-lesson-actions=""
          style={{
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 12px',
            background: 'var(--netlab-bg-surface)',
            borderTop: '1px solid var(--netlab-border)',
            borderBottom: '1px solid var(--netlab-border)',
          }}
        />
        {pin.notes ? createPortal(children, pin.notes) : null}
      </>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {children}
      <div style={{ height: NARROW_CANVAS_HEIGHT, position: 'relative', flexShrink: 0 }}>
        {canvas}
      </div>
    </div>
  );
}

/**
 * A card or a row of buttons that floats over the canvas. Its `style` says
 * where it floats; on a narrow screen it is laid out in normal flow instead,
 * so it cannot cover the canvas or the panel's controls.
 */
export function LessonNote({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { isNarrow } = useViewport();
  if (!isNarrow) return <div {...rest} {...(style ? { style } : {})} />;
  const inFlow = Object.fromEntries(
    Object.entries(style ?? {}).filter(([property]) => !FLOATING.has(property)),
  );
  // A note pinned to the bottom of the canvas is read after it, the rest before.
  const afterCanvas = style?.bottom !== undefined && style.top === undefined;
  return (
    <div
      {...rest}
      style={{ padding: '8px 12px', ...inFlow, ...(afterCanvas ? { order: 1 } : {}) }}
    />
  );
}

/**
 * The lesson's side panel. Beside the canvas it can be dragged wider; stacked
 * under the canvas on a narrow viewport it simply takes the full width.
 */
export function LessonPanel(props: ResizableSidebarProps) {
  const { isNarrow } = useViewport();
  const pin = useContext(PinContext);
  if (!isNarrow) return <ResizableSidebar {...props} />;
  if (pin) {
    return (
      // The one part of a pinned lesson that scrolls.
      <div
        data-testid="lesson-panel"
        style={{
          ...props.style,
          display: 'block',
          width: '100%',
          flex: '1 1 0',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <div ref={pin.setNotes} style={{ display: 'flex', flexDirection: 'column' }} />
        {props.children}
      </div>
    );
  }
  return (
    // A block, as the sidebar's own content box is: the children keep the
    // height of their content instead of sharing out the panel's. And
    // `flexShrink: 0`: a panel that scrolls by itself would otherwise be
    // squeezed into what is left of the screen under the canvas.
    <div
      data-testid="lesson-panel"
      style={{ ...props.style, display: 'block', width: '100%', flexShrink: 0 }}
    >
      {props.children}
    </div>
  );
}

/**
 * What must stay beside the diagram in a pinned lesson: its start button, its
 * numbered steps. Anywhere else this renders its children where they are
 * written, so the wide layout does not change.
 *
 * `order` is the place in the bar, because pieces arrive there in the order
 * they are mounted, not the order they are written. `half` lets two short
 * actions share a row.
 */
export function LessonPinned({
  order = 0,
  half = false,
  children,
}: {
  order?: number;
  half?: boolean;
  children: ReactNode;
}) {
  const pin = useContext(PinContext);
  if (!pin) return <>{children}</>;
  if (!pin.actions) return null;
  return createPortal(
    <div
      style={{ order, flex: half ? '1 1 40%' : '1 1 100%', display: 'grid', gap: 6, minWidth: 0 }}
    >
      {children}
    </div>,
    pin.actions,
  );
}

/** After every action a lesson pins. */
const STEP_BAR_ORDER = 10;

/**
 * The pinned lesson's "next step" and the one line that says where the packet
 * is, in the action bar. It appears once there is something to step through
 * and only in a pinned lesson: the panel's own step control, with its history,
 * is below the fold there. `step={false}` leaves the status line alone, for a
 * lesson that sends whole packets.
 */
export function LessonStepBar({
  continueAcrossTraces = false,
  step = true,
}: {
  continueAcrossTraces?: boolean;
  step?: boolean;
}) {
  const pin = useContext(PinContext);
  const { t } = useI18n();
  const { engine, state } = useSimulation();
  const { status, currentStep, traces, currentTraceId } = state;
  if (!pin?.actions) return null;
  const index = traces.findIndex((candidate) => candidate.packetId === currentTraceId);
  const trace = index >= 0 ? traces[index] : traces[traces.length - 1];
  if (!trace) return null;
  const next = continueAcrossTraces && index >= 0 ? traces[index + 1] : undefined;
  const disabled = status === 'running' || status === 'idle' || (status === 'done' && !next);
  return (
    <LessonPinned order={STEP_BAR_ORDER}>
      {step ? (
        <button
          type="button"
          data-testid="lesson-step"
          disabled={disabled}
          onClick={() => {
            if (status === 'done' && next) engine.selectTrace(next.packetId);
            engine.step();
          }}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? 'var(--netlab-bg-primary)' : 'var(--netlab-accent-blue)',
            color: disabled ? 'var(--netlab-text-muted)' : '#fff',
          }}
        >
          {t('simulation.steps.next')}
        </button>
      ) : null}
      <div
        data-testid="lesson-step-status"
        aria-live="polite"
        style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'var(--netlab-text-primary)',
        }}
      >
        {currentStep >= 0 ? hopReadout(trace, currentStep, t) : traceOutcome(trace, t)}
      </div>
    </LessonPinned>
  );
}

/** Where a lesson's devices stand on a narrow screen, by device id. */
export type PhonePositions = Readonly<Record<string, { readonly x: number; readonly y: number }>>;

/**
 * A lesson's network arranged for the screen it is on.
 *
 * A row of devices laid out for a wide canvas is fitted to a phone at about a
 * third of its size, with addresses 4 to 6px high. On a narrow screen the
 * devices take the places given here instead (closer together, fewer to a
 * row), so the same fit draws them larger. `layout` changes when the
 * arrangement does: used as the provider's `key`, the lesson starts afresh on
 * the new arrangement.
 */
export function usePhoneTopology<
  Topology extends {
    readonly nodes: readonly { readonly id: string; readonly position: { x: number; y: number } }[];
  },
>(topology: Topology, positions: PhonePositions): { topology: Topology; layout: string } {
  const { isNarrow } = useViewport();
  const arranged = useMemo(
    () =>
      isNarrow
        ? {
            ...topology,
            nodes: topology.nodes.map((node) => {
              const place = positions[node.id];
              return place ? { ...node, position: { x: place.x, y: place.y } } : node;
            }),
          }
        : topology,
    [isNarrow, positions, topology],
  );
  return { topology: arranged, layout: isNarrow ? 'narrow' : 'wide' };
}
