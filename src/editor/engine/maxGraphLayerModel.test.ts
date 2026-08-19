/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

/**
 * The per-layer display feature rests on maxGraph's own layer model rather than
 * on us filtering arrays, so these assertions are about the library. They are
 * worth keeping: `@maxgraph/core` is pinned exactly, and this is what an upgrade
 * would have to preserve. It also records that maxGraph runs under jsdom at all,
 * which was an open risk before it was measured.
 */
describe('maxGraph layer model (the capability the editor depends on)', () => {
  it('treats a direct child of the root as a layer, and hides everything under it', async () => {
    const { Graph, Cell } = await import('@maxgraph/core');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const graph = new Graph(el);
    const model = graph.getDataModel();
    const root = model.getRoot()!;

    const l2 = new Cell();
    const l3 = new Cell();
    model.beginUpdate();
    try {
      model.add(root, l2);
      model.add(root, l3);
      graph.insertVertex({ parent: l2, value: 'sw1', position: [10, 10], size: [80, 30] });
      graph.insertVertex({ parent: l3, value: 'r1', position: [10, 80], size: [80, 30] });
    } finally {
      model.endUpdate();
    }

    expect(model.isLayer(l2)).toBe(true);
    expect(model.isLayer(l3)).toBe(true);

    model.beginUpdate();
    try {
      model.setVisible(l2, false);
    } finally {
      model.endUpdate();
    }

    // Hiding one layer must leave the others alone — that is the whole point of
    // "show me L3 only".
    expect(l2.isVisible()).toBe(false);
    expect(l3.isVisible()).toBe(true);

    model.beginUpdate();
    try {
      model.setVisible(l2, true);
    } finally {
      model.endUpdate();
    }
    expect(l2.isVisible()).toBe(true);
  });
});
