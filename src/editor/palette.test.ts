import { describe, expect, it } from 'vitest';
import { NODE_GLYPHS } from '../components/NodeGlyph';
import { PALETTE_ITEMS, PALETTE_LAYER_ORDER, isLayerAllowed, paletteByLayer } from './palette';

describe('editor palette', () => {
  it('groups elements bottom-up through the stack', () => {
    // The literal order is the teaching order; deriving it from the data would
    // pass even if the constant were reversed.
    expect(PALETTE_LAYER_ORDER).toEqual(['l1', 'l2', 'l3', 'l4', 'l7']);
    expect(paletteByLayer().map((group) => group.layerId)).toEqual(['l2', 'l3', 'l7']);
  });

  it('drops layers that have nothing to place instead of rendering them empty', () => {
    // l1 and l4 are in the order but carry no element yet.
    const groups = paletteByLayer();
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    expect(groups.map((group) => group.layerId)).not.toContain('l4');
  });

  it('scopes the palette to the requested layers', () => {
    const l3Only = paletteByLayer(['l3']);
    expect(l3Only).toHaveLength(1);
    expect(l3Only[0]!.items.map((item) => item.id)).toEqual(['router']);

    // A host asking for a transport-only exercise gets an empty palette today
    // rather than every other layer's elements.
    expect(paletteByLayer(['l4'])).toEqual([]);
  });

  it('every element declares the layer its factory actually builds', () => {
    // A mismatch would file an element under one layer and create a node the
    // canvas paints in another.
    for (const item of PALETTE_ITEMS) {
      const node = item.create({ x: 0, y: 0 });
      expect(node.data.layerId, item.id).toBe(item.layerId);
      expect(node.type, item.id).toBe(item.id);
    }
  });

  it('every element shows the glyph the canvas will paint for it', () => {
    // A palette icon that differs from the node on the canvas teaches the wrong
    // association; the glyph is also what carries the meaning without colour.
    for (const item of PALETTE_ITEMS) {
      expect(NODE_GLYPHS[item.glyph], item.id).toBeDefined();
      // The node type IS the glyph kind for these elements — a rename of either
      // side without the other must fail here.
      expect(item.glyph, item.id).toBe(item.create({ x: 0, y: 0 }).type);
    }
  });

  it('each factory call produces a distinct node id', () => {
    const router = PALETTE_ITEMS.find((item) => item.id === 'router')!;
    const ids = new Set([router.create({ x: 0, y: 0 }).id, router.create({ x: 1, y: 1 }).id]);
    expect(ids.size).toBe(2);
  });

  it('placing the node honours the drop position', () => {
    for (const item of PALETTE_ITEMS) {
      expect(item.create({ x: 42, y: 99 }).position, item.id).toEqual({ x: 42, y: 99 });
    }
  });

  it('isLayerAllowed defaults to unrestricted and rejects out-of-scope layers', () => {
    expect(isLayerAllowed('l3')).toBe(true);
    expect(isLayerAllowed('l3', ['l3', 'l7'])).toBe(true);
    expect(isLayerAllowed('l2', ['l3', 'l7'])).toBe(false);
  });
});
