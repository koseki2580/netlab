import { describe, expect, it } from 'vitest';
import type { LayerId } from '../../types/layers';
import { GRAPH_LAYER_ORDER, layerIndex, layerVisibility } from './maxGraphLayers';

describe('maxGraph layer mapping', () => {
  it('paints bottom-up, so a higher layer draws over a lower one', () => {
    // The literal order is the teaching order and the paint order at once.
    expect(GRAPH_LAYER_ORDER).toEqual(['l1', 'l2', 'l3', 'l4', 'l7']);
    expect(layerIndex('l1')).toBeLessThan(layerIndex('l2'));
    expect(layerIndex('l3')).toBeLessThan(layerIndex('l7'));
  });

  it('puts an unknown layer on top rather than dropping its nodes', () => {
    // A LayerId added later must not make nodes silently vanish from the canvas.
    expect(layerIndex('l9' as LayerId)).toBe(GRAPH_LAYER_ORDER.length);
  });

  it('maps the sidebar selection onto one visibility flag per graph layer', () => {
    const flags = layerVisibility(new Set<LayerId>(['l2', 'l7']));
    // l1 l2 l3 l4 l7 + the overflow slot
    expect(flags).toEqual([false, true, false, false, true, true]);
  });

  it('treats "no selection given" as everything visible, not nothing', () => {
    expect(layerVisibility()).toEqual([true, true, true, true, true, true]);
  });

  it('keeps the overflow layer visible even when every known layer is hidden', () => {
    // Otherwise a node on an unknown layer would be unreachable with no way back.
    const flags = layerVisibility(new Set<LayerId>());
    expect(flags.slice(0, GRAPH_LAYER_ORDER.length)).toEqual([false, false, false, false, false]);
    expect(flags[GRAPH_LAYER_ORDER.length]).toBe(true);
  });

  it('returns one flag per layer plus the overflow slot', () => {
    expect(layerVisibility(new Set<LayerId>(['l3']))).toHaveLength(GRAPH_LAYER_ORDER.length + 1);
  });
});
