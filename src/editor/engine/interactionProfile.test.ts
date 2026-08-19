import { describe, expect, it } from 'vitest';
import { interactionProfile } from './types';

describe('interaction profile', () => {
  it('defaults to interactive', () => {
    expect(interactionProfile()).toEqual(interactionProfile('interactive'));
  });

  it('lets a presentational canvas keep the page scrolling', () => {
    // A canvas in the middle of an article must not swallow the wheel: the
    // learner is reading, and the page has to move under them.
    const p = interactionProfile('presentational');
    expect(p.zoomOnScroll).toBe(false);
    expect(p.zoomOnPinch).toBe(false);
    expect(p.preventPageScroll).toBe(false);
  });

  it('keeps an illustration out of the tab order and out of reach of a drag', () => {
    const p = interactionProfile('presentational');
    expect(p.nodesFocusable).toBe(false);
    expect(p.nodesDraggable).toBe(false);
  });

  it('lets a presentational canvas zoom out further than an editable one', () => {
    // A wide topology plus padding has to fit a phone without clipping the edge
    // nodes; the editor keeps the tighter floor.
    expect(interactionProfile('presentational').minZoom).toBeLessThan(
      interactionProfile('interactive').minZoom,
    );
  });

  it('gives an interactive canvas every gesture', () => {
    const p = interactionProfile('interactive');
    expect(p).toMatchObject({
      zoomOnScroll: true,
      zoomOnPinch: true,
      panOnDrag: true,
      preventPageScroll: true,
      nodesDraggable: true,
      nodesFocusable: true,
    });
  });
});
