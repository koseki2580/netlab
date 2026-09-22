import type React from 'react';

/** Node kinds that get a redundant shape + letter + color glyph (M6). */
export type NodeGlyphKind = 'router' | 'switch' | 'client' | 'server';

import { glyphPrimitive, type GlyphShape } from './glyphGeometry';

export type { GlyphShape };

interface GlyphMeta {
  letter: string;
  color: string;
  shape: GlyphShape;
}

/**
 * Per-kind glyph metadata. Color is one channel; the shape and letter make the
 * encoding legible without it. Every kind now has a distinct color, so the
 * four glyphs differ across all three encodings (color + shape + letter).
 */
export const NODE_GLYPHS: Readonly<Record<NodeGlyphKind, GlyphMeta>> = {
  router: { letter: 'R', color: 'var(--netlab-accent-green)', shape: 'rounded-rect' },
  switch: { letter: 'Sw', color: 'var(--netlab-accent-blue)', shape: 'hexagon' },
  client: { letter: 'C', color: 'var(--netlab-accent-cyan)', shape: 'circle' },
  server: { letter: 'S', color: 'var(--netlab-accent-purple)', shape: 'square' },
};

/**
 * i18n catalog key for each kind's display name, for callers that have a
 * translator. This component takes the name as a prop rather than reading the
 * catalogue itself: it ships inside every per-layer entry point, and pulling
 * the catalogue in there would put the whole product's text in a bundle that
 * exists to be small.
 */
export const NODE_KIND_LABEL_KEYS: Readonly<Record<NodeGlyphKind, string>> = {
  router: 'simulation.nodeKind.router',
  switch: 'simulation.nodeKind.switch',
  client: 'simulation.nodeKind.client',
  server: 'simulation.nodeKind.server',
};

export interface NodeGlyphProps {
  kind: NodeGlyphKind;
  /** Optional label folded into the accessible name (e.g. `'R1'`). */
  label?: string;
  /** The kind's name for the accessible name. Defaults to the English kind. */
  kindLabel?: string;
  selected?: boolean;
  size?: number;
}

/**
 * M6 — node glyph: a shape + letter + color badge for a device kind. Color is
 * never the sole differentiator; the shape and letter carry the meaning too.
 */
export function NodeGlyph({
  kind,
  label,
  kindLabel = kind,
  selected = false,
  size = 40,
}: NodeGlyphProps) {
  const meta = NODE_GLYPHS[kind];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={label ? `${kindLabel} ${label}` : kindLabel}
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
        fontSize={16}
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
  const { tag, attrs } = glyphPrimitive(shape, grow);
  // The geometry is shared with the maxGraph adapter, so both canvases draw the
  // same shape; only the paint differs between the two call sites here.
  if (tag === 'circle') return <circle {...attrs} style={paint} />;
  if (tag === 'rect') return <rect {...attrs} style={paint} />;
  return <polygon {...attrs} style={paint} />;
}
