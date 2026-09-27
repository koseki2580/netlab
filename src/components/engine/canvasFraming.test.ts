import { describe, expect, it } from 'vitest';
import { clearRegion } from './canvasFraming';

const CANVAS = { width: 1000, height: 600 };
const WIDE_DRAWING = { width: 900, height: 120 };

describe('clearRegion', () => {
  it('offers the whole canvas when nothing sits on it', () => {
    expect(clearRegion(CANVAS, [], WIDE_DRAWING, 20)).toEqual({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
    });
  });

  it('frames a wide drawing below a panel in the top-right corner', () => {
    const panel = { left: 700, top: 10, right: 990, bottom: 260 };
    expect(clearRegion(CANVAS, [panel], WIDE_DRAWING, 20)).toEqual({
      left: 0,
      top: 260,
      right: 1000,
      bottom: 600,
    });
  });

  it('frames a tall drawing beside a card in the top-left corner', () => {
    const card = { left: 10, top: 10, right: 380, bottom: 560 };
    const tall = { width: 200, height: 500 };
    expect(clearRegion(CANVAS, [card], tall, 20)).toEqual({
      left: 380,
      top: 0,
      right: 1000,
      bottom: 600,
    });
  });

  it('keeps clear of panels in two corners at once', () => {
    const card = { left: 10, top: 10, right: 380, bottom: 200 };
    const panel = { left: 700, top: 10, right: 990, bottom: 260 };
    const region = clearRegion(CANVAS, [card, panel], WIDE_DRAWING, 20);
    expect(region).toEqual({ left: 0, top: 260, right: 1000, bottom: 600 });
  });

  it('ignores overlays outside the canvas', () => {
    const outside = { left: 1100, top: 0, right: 1400, bottom: 600 };
    expect(clearRegion(CANVAS, [outside], WIDE_DRAWING, 20)).toEqual({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
    });
  });

  it('offers nothing when the only clear space is a sliver', () => {
    const cover = { left: 0, top: 0, right: 1000, bottom: 500 };
    expect(clearRegion(CANVAS, [cover], WIDE_DRAWING, 20)).toBeNull();
  });
});
