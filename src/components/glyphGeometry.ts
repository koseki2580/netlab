export type GlyphShape = 'rounded-rect' | 'hexagon' | 'circle' | 'square';

/** One SVG primitive: the tag and the attributes that place it in a 40×40 box. */
export interface GlyphPrimitive {
  readonly tag: 'circle' | 'rect' | 'polygon';
  readonly attrs: Readonly<Record<string, string | number>>;
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

/**
 * The geometry of a device glyph, independent of who draws it.
 *
 * Two canvases render these — the React node components and the maxGraph
 * adapter's HTML labels — and a learner must see the same shape in both, so the
 * numbers live here once instead of in each renderer.
 *
 * `grow` expands the shape outward, used for the selection ring.
 */
export function glyphPrimitive(shape: GlyphShape, grow = 0): GlyphPrimitive {
  switch (shape) {
    case 'circle':
      return { tag: 'circle', attrs: { cx: 20, cy: 20, r: 15 + grow } };
    case 'square':
      return {
        tag: 'rect',
        attrs: { x: 6 - grow, y: 6 - grow, width: 28 + grow * 2, height: 28 + grow * 2, rx: 3 },
      };
    case 'rounded-rect':
      return {
        tag: 'rect',
        attrs: { x: 4 - grow, y: 9 - grow, width: 32 + grow * 2, height: 22 + grow * 2, rx: 7 },
      };
    case 'hexagon':
      return { tag: 'polygon', attrs: { points: hexagonPoints(grow) } };
  }
}
