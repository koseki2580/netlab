import type { Graph } from '@maxgraph/core';
import { AREA_CLUSTER_NODE_TYPE } from '../../areas/areaLod';
import { clearRegion, fitScale, overlaps, type Box } from './canvasFraming';

/**
 * How much room to leave around the drawing when framing it.
 *
 * `fitViewPadding` is a fraction of the canvas, the way React Flow read it —
 * passing it as pixels padded a 1350px canvas by ten of them and left the last
 * device of a wide topology clipped. Capped, because on a tall canvas the
 * fraction zooms out far enough to drop a readable topology below the level of
 * detail threshold, and a lesson that opens fully collapsed is a different
 * lesson.
 */
function fitMargin(host: HTMLElement, padding: number): number {
  const smaller = Math.min(host.clientWidth, host.clientHeight);
  // Never a large share of the container: maxGraph subtracts twice the margin
  // from the container before dividing by it, and a margin that eats the canvas
  // takes the arithmetic negative and then to NaN, which it throws on.
  return Math.round(Math.max(0, Math.min(padding * smaller, 48, smaller / 6)));
}

/** maxGraph blows a small topology up eight times over; React Flow stopped at 2. */
const MAX_FIT_SCALE = 2;

/**
 * Every element marked `data-canvas-overlay` that sits over this canvas, in the
 * canvas's own coordinates.
 *
 * Looked for across the whole page, not only among the canvas's children: a
 * lesson lays its own panels and cards over the canvas as siblings of it, and
 * any of them that marks itself is kept clear of the same way.
 */
function overlaysOver(host: HTMLElement): Box[] {
  const hostBox = host.getBoundingClientRect();
  const canvas: Box = {
    left: hostBox.left,
    top: hostBox.top,
    right: hostBox.right,
    bottom: hostBox.bottom,
  };
  return Array.from(document.querySelectorAll<HTMLElement>('[data-canvas-overlay]'))
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0 && overlaps(box, canvas))
    .map((box) => ({
      left: box.left - hostBox.left,
      top: box.top - hostBox.top,
      right: box.right - hostBox.left,
      bottom: box.bottom - hostBox.top,
    }));
}

/**
 * Frame the drawing, keeping it clear of what sits over the canvas.
 *
 * The zoom overview and link-state key sit in the bottom-right corner, a
 * lesson's panels in the top-right, its explanation card perhaps top-left.
 * Framed as if they were not there, a device ended up under one of them. The
 * drawing is framed once over the whole canvas; only when that lands it under
 * one of them is it framed again, in the clear rectangle where it is drawn
 * largest.
 */
export function frameDrawing(graph: Graph, host: HTMLElement, padding: number): void {
  const view = graph.getView();
  const margin = fitMargin(host, padding);
  const place = (region: Box): boolean => {
    const bounds = graph.getGraphBounds();
    const scale = view.scale;
    if (!(bounds.width > 0 && bounds.height > 0) || !(scale > 0)) return false;
    const drawing = { width: bounds.width / scale, height: bounds.height / scale };
    const next = Math.min(MAX_FIT_SCALE, fitScale(region, drawing, margin));
    if (!(next > 0) || !Number.isFinite(next)) return false;
    const originX = bounds.x / scale - view.translate.x;
    const originY = bounds.y / scale - view.translate.y;
    view.scaleAndTranslate(
      next,
      (region.left + (region.right - region.left - drawing.width * next) / 2) / next - originX,
      (region.top + (region.bottom - region.top - drawing.height * next) / 2) / next - originY,
    );
    return true;
  };

  const canvas = { width: host.clientWidth, height: host.clientHeight };
  if (!place({ left: 0, top: 0, right: canvas.width, bottom: canvas.height })) return;
  const overlays = overlaysOver(host);
  const drawn = graph.getGraphBounds();
  const drawing: Box = {
    left: drawn.x,
    top: drawn.y,
    right: drawn.x + drawn.width,
    bottom: drawn.y + drawn.height,
  };
  if (!overlays.some((box) => overlaps(drawing, box))) return;
  const scale = view.scale;
  const region = clearRegion(
    canvas,
    overlays,
    { width: drawn.width / scale, height: drawn.height / scale },
    margin,
    MAX_FIT_SCALE,
  );
  if (region) place(region);
}

/** Area backdrops sit under devices; an overlay on one covers nothing a learner needs. */
export const AREA_BACKDROP_TYPES = new Set(['netlab-area', AREA_CLUSTER_NODE_TYPE]);

/** Whether a marked overlay sits on any of the drawn devices. */
export function devicesCovered(graph: Graph, host: HTMLElement, ids: readonly string[]): boolean {
  const overlays = overlaysOver(host);
  if (overlays.length === 0) return false;
  return ids.some((id) => {
    const cell = graph.getDataModel().getCell(id);
    const state = cell ? graph.getView().getState(cell) : null;
    if (!state) return false;
    const device: Box = {
      left: state.x,
      top: state.y,
      right: state.x + state.width,
      bottom: state.y + state.height,
    };
    return overlays.some((box) => overlaps(device, box));
  });
}
