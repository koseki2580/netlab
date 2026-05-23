import type React from 'react';

/** Node kinds that get a redundant shape + letter + color glyph (M6). */
export type NodeGlyphKind = 'router' | 'switch' | 'client' | 'server';

type GlyphShape = 'rounded-rect' | 'hexagon' | 'circle' | 'square';

interface GlyphMeta {
  letter: string;
  color: string;
  shape: GlyphShape;
}

/**
 * Per-kind glyph metadata. Color is one channel; the shape and letter make the
 * encoding legible without it (e.g. router and server share green but differ in
 * both shape and letter).
 */
export const NODE_GLYPHS: Readonly<Record<NodeGlyphKind, GlyphMeta>> = {
  router: { letter: 'R', color: 'var(--netlab-accent-green)', shape: 'rounded-rect' },
  switch: { letter: 'S', color: 'var(--netlab-accent-blue)', shape: 'hexagon' },
  client: { letter: 'C', color: 'var(--netlab-accent-cyan)', shape: 'circle' },
  server: { letter: 'Sv', color: 'var(--netlab-accent-green)', shape: 'square' },
};

export interface NodeGlyphProps {
  kind: NodeGlyphKind;
  /** Optional label folded into the accessible name (e.g. `'R1'`). */
  label?: string;
  selected?: boolean;
  size?: number;
}

/**
 * M6 — node glyph: a shape + letter + color badge for a device kind. Color is
 * never the sole differentiator; the shape and letter carry the meaning too.
 */
export function NodeGlyph({ kind, label, selected = false, size = 40 }: NodeGlyphProps) {
  const meta = NODE_GLYPHS[kind];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={label ? `${kind} ${label}` : kind}
      data-node-kind={kind}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      {selected && (
        <ShapeOutline shape={meta.shape} fill="none" stroke={meta.color} strokeWidth={1} grow={4} />
      )}
      <ShapeOutline
        shape={meta.shape}
        fill={`color-mix(in srgb, ${meta.color} 18%, transparent)`}
        stroke={meta.color}
        strokeWidth={2}
        grow={0}
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-monospace, monospace"
        fontSize={meta.letter.length > 1 ? 12 : 16}
        fontWeight={700}
        fill={meta.color}
      >
        {meta.letter}
      </text>
    </svg>
  );
}

function ShapeOutline({
  shape,
  fill,
  stroke,
  strokeWidth,
  grow,
}: {
  shape: GlyphShape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Expand the shape outward (px) — used for the selection ring. */
  grow: number;
}): React.ReactElement {
  // Color via `style` (not attributes) so it matches the node-icon idiom and
  // keeps theme tokens visible to style-based assertions.
  const paint: React.CSSProperties = { fill, stroke, strokeWidth };
  switch (shape) {
    case 'circle':
      return <circle cx="20" cy="20" r={15 + grow} style={paint} />;
    case 'square':
      return (
        <rect
          x={6 - grow}
          y={6 - grow}
          width={28 + grow * 2}
          height={28 + grow * 2}
          rx="3"
          style={paint}
        />
      );
    case 'rounded-rect':
      return (
        <rect
          x={4 - grow}
          y={9 - grow}
          width={32 + grow * 2}
          height={22 + grow * 2}
          rx="7"
          style={paint}
        />
      );
    case 'hexagon':
      return <polygon points={hexagonPoints(grow)} style={paint} />;
  }
}

function hexagonPoints(grow: number): string {
  const cx = 20;
  const cy = 20;
  const r = 16 + grow;
  // Flat-top hexagon.
  return [0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const rad = (Math.PI / 180) * deg;
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    })
    .join(' ');
}
