import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import {
  ResizableSidebar,
  type ResizableSidebarProps,
} from '../../src/components/ResizableSidebar';
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

/** The row that holds a `LessonCanvas` and a `LessonPanel`. `style` is the wide row's own. */
export function LessonSplit({
  style = SPLIT_STYLE,
  children,
}: {
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { isNarrow } = useViewport();
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
  if (!isNarrow) {
    return (
      <div style={style}>
        {canvas}
        {children}
      </div>
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
  if (!isNarrow) return <ResizableSidebar {...props} />;
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
