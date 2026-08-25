/**
 * Stacking order for the things that float over a canvas.
 *
 * Written down because it was not: the route table and packet viewer sat at
 * 120 while the device panel a learner opens by clicking sat at 31, so the
 * passive overlays covered the panel's own close button and the panel could
 * not be dismissed by clicking it.
 *
 * The rule the numbers encode: something the learner opened on purpose sits
 * above something the lesson put there for reference.
 */
export const CANVAS_LAYER = {
  /** Viewport controls and the overview, drawn on the canvas itself. */
  canvasChrome: 2,
  /** Reference panels the lesson shows: route table, packet viewer. */
  referenceOverlay: 120,
  /** The scrim behind an overlay-mode device panel. */
  panelScrim: 200,
  /** The device or link panel itself, and its resize handle. */
  devicePanel: 201,
  /**
   * The sandbox edit popover. Above the panels because opening it is the more
   * recent, more deliberate act: right-clicking a link both selects the link,
   * which opens its panel, and opens this over it. At 30 against the panel's
   * 31 the popover lost, and its buttons sat under the panel's own sections.
   */
  editPopover: 300,
} as const;
