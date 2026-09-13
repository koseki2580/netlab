import type { InteractionProfile } from '../../editor/engine/types';

/**
 * Whether the canvas offers snapping devices to a grid.
 *
 * Only where devices can be dragged: snapping is about where a dragged device
 * lands, so on a canvas that does not let them move the control would do
 * nothing. The learning panels hide their controls altogether, but a host may
 * mount a presentational canvas and keep them, and this is what keeps a dead
 * button out of that strip.
 */
export function offersGridSnap(profile: InteractionProfile): boolean {
  return profile.nodesDraggable;
}
