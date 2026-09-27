/**
 * Where on the canvas the drawing can be framed without anything sitting on it.
 *
 * Panels and cards float over the canvas — the zoom strip and overview in one
 * corner, a lesson's route table and packet viewer in another, an explanation
 * card in a third. Framed as if they were not there, a device ended up under
 * one of them: the Server of the client-server lesson under its packet panel,
 * the DHCP client under the lesson's card. This picks the free rectangle in
 * which the drawing can be drawn largest.
 *
 * Pure so it can be tested without a browser; the canvas measures the boxes.
 */

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** The scale at which a drawing of this size fits a region, after the margin. */
export function fitScale(
  region: Box,
  drawing: { width: number; height: number },
  margin: number,
): number {
  return Math.min(
    (region.right - region.left - 2 * margin) / drawing.width,
    (region.bottom - region.top - 2 * margin) / drawing.height,
  );
}

/**
 * The rectangle of the canvas, clear of every overlay, in which the drawing is
 * drawn largest — or null when no clear rectangle is worth framing in.
 *
 * `overlays` are in canvas coordinates. Every maximal clear rectangle has each
 * of its sides on the canvas edge or on an overlay's edge, so trying those
 * edges finds the best one; there are only ever a handful of overlays. Past
 * `maxScale` a larger rectangle draws nothing larger, so the roomier one wins.
 * A rectangle narrower or shorter than a third of the canvas is not offered:
 * shrinking the drawing into a sliver hides it as surely as covering it.
 */
export function clearRegion(
  canvas: { width: number; height: number },
  overlays: readonly Box[],
  drawing: { width: number; height: number },
  margin: number,
  maxScale = Number.POSITIVE_INFINITY,
): Box | null {
  const whole: Box = { left: 0, top: 0, right: canvas.width, bottom: canvas.height };
  const inside = overlays
    .map((box) => ({
      left: Math.max(0, box.left),
      top: Math.max(0, box.top),
      right: Math.min(canvas.width, box.right),
      bottom: Math.min(canvas.height, box.bottom),
    }))
    .filter((box) => box.right > box.left && box.bottom > box.top);
  if (inside.length === 0) return whole;

  const lefts = [0, ...inside.map((box) => box.right)];
  const rights = [canvas.width, ...inside.map((box) => box.left)];
  const tops = [0, ...inside.map((box) => box.bottom)];
  const bottoms = [canvas.height, ...inside.map((box) => box.top)];

  let best: Box | null = null;
  let bestScale = 0;
  let bestArea = 0;
  for (const left of lefts) {
    for (const right of rights) {
      if (right - left < canvas.width / 3) continue;
      for (const top of tops) {
        for (const bottom of bottoms) {
          if (bottom - top < canvas.height / 3) continue;
          const region = { left, top, right, bottom };
          if (inside.some((box) => overlaps(region, box))) continue;
          const scale = Math.min(maxScale, fitScale(region, drawing, margin));
          const area = (right - left) * (bottom - top);
          if (
            scale > bestScale + 1e-9 ||
            (Math.abs(scale - bestScale) <= 1e-9 && area > bestArea)
          ) {
            best = region;
            bestScale = scale;
            bestArea = area;
          }
        }
      }
    }
  }
  return best && bestScale > 0 ? best : null;
}
