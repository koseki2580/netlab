import { describe, expect, it } from 'vitest';
import { edgeStyle } from '../components/engine/simulatorGraphModel';
import type { NetlabEdge } from '../types/topology';
import { getTraceColor } from './traceColorPalette';

/**
 * TC-2331 (REQ-424b) — a traced path is drawn in the theme's accents, and a
 * plain link in the strong border. The palette used to mix in fixed dark-theme
 * pastels (#4ade80, #facc15, …) that all but vanished on a white canvas.
 */
describe('TC-2331: trace and link strokes follow the theme', () => {
  it('every trace colour is a theme accent token, never a fixed colour', () => {
    const colours = Array.from({ length: 16 }, (_, i) => getTraceColor(i));
    for (const colour of colours) {
      expect(colour).toMatch(/^var\(--netlab-accent-[a-z]+\)$/);
    }
    // Two traces in a row never share a colour.
    for (let i = 1; i < colours.length; i++) expect(colours[i]).not.toBe(colours[i - 1]);
  });

  it('a link with no computed stroke is drawn in the strong border colour', () => {
    const plain = { id: 'e1', source: 'a', target: 'b' } as NetlabEdge;
    expect(edgeStyle(plain).strokeColor).toBe('var(--netlab-border-strong, var(--netlab-border))');
  });
});
