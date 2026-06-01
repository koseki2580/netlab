import { describe, expect, it } from 'vitest';
import { EDGE_KINDS, NL_EDGE_KINDS, NL_LOD, shouldCollapseArea } from './edgeEncoding';

describe('NL_EDGE_KINDS', () => {
  it('gives every kind a distinct color, dash, and cap (three redundant channels)', () => {
    const styles = EDGE_KINDS.map((kind) => NL_EDGE_KINDS[kind]);
    const colors = new Set(styles.map((s) => s.color));
    const dashes = new Set(styles.map((s) => s.dash));
    const caps = new Set(styles.map((s) => s.cap));
    expect(colors.size).toBe(EDGE_KINDS.length);
    expect(dashes.size).toBe(EDGE_KINDS.length);
    expect(caps.size).toBe(EDGE_KINDS.length);
  });

  it('uses --netlab-* tokens for color, never raw hex', () => {
    for (const kind of EDGE_KINDS) {
      expect(NL_EDGE_KINDS[kind].color).toMatch(/^var\(--netlab-/);
      expect(NL_EDGE_KINDS[kind].color).not.toMatch(/#[0-9a-f]/i);
    }
  });
});

describe('shouldCollapseArea', () => {
  it('collapses when the node count exceeds the threshold', () => {
    expect(shouldCollapseArea(NL_LOD.collapseNodeCount + 1, 1)).toBe(true);
    expect(shouldCollapseArea(NL_LOD.collapseNodeCount, 1)).toBe(false);
  });

  it('collapses when zoomed out below the threshold', () => {
    expect(shouldCollapseArea(2, NL_LOD.collapseZoom - 0.01)).toBe(true);
    expect(shouldCollapseArea(2, NL_LOD.collapseZoom)).toBe(false);
  });

  it('honours a custom LOD config', () => {
    const lod = { collapseNodeCount: 3, collapseZoom: 0.3 };
    expect(shouldCollapseArea(4, 1, lod)).toBe(true);
    expect(shouldCollapseArea(2, 0.2, lod)).toBe(true);
    expect(shouldCollapseArea(2, 0.5, lod)).toBe(false);
  });
});
