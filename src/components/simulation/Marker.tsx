import type React from 'react';

/** The six distinct marker shapes used for redundant (non-color-only) encoding (M6). */
export type MarkerShape =
  | 'circle'
  | 'diamond'
  | 'triangle-up'
  | 'triangle-down'
  | 'diamond-open'
  | 'ring';

export const MARKER_SHAPES: readonly MarkerShape[] = [
  'circle',
  'diamond',
  'triangle-up',
  'triangle-down',
  'diamond-open',
  'ring',
];

export interface MarkerProps {
  shape: MarkerShape;
  /** Fill/stroke color — defaults to the muted text token. */
  color?: string;
  /** Accessible label; also the tooltip when `title` is omitted. */
  label?: string;
  title?: string;
  size?: number;
}

/**
 * M6 — a small shape marker. Shape carries the meaning so the encoding never
 * relies on color alone (used by the timeline and the {@link LegendPanel}).
 */
export function Marker({
  shape,
  color = 'var(--netlab-text-muted)',
  label,
  title,
  size = 12,
}: MarkerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      role="img"
      aria-label={label ?? shape}
      data-marker-shape={shape}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      {(title ?? label) ? <title>{title ?? label}</title> : null}
      {renderShape(shape, color)}
    </svg>
  );
}

function renderShape(shape: MarkerShape, color: string): React.ReactNode {
  switch (shape) {
    case 'circle':
      return <circle cx="5" cy="5" r="4" fill={color} />;
    case 'diamond':
      return <polygon points="5,1 9,5 5,9 1,5" fill={color} />;
    case 'triangle-up':
      return <polygon points="5,1 9,9 1,9" fill={color} />;
    case 'triangle-down':
      return <polygon points="1,1 9,1 5,9" fill={color} />;
    case 'diamond-open':
      return <polygon points="5,1 9,5 5,9 1,5" fill="none" stroke={color} strokeWidth="1.4" />;
    case 'ring':
      return (
        <>
          <circle cx="5" cy="5" r="4" fill="none" stroke={color} strokeWidth="1.3" />
          <circle cx="5" cy="5" r="1.4" fill={color} />
        </>
      );
  }
}
