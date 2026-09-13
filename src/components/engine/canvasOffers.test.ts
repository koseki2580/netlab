import { describe, expect, it } from 'vitest';
import { interactionProfile } from '../../editor/engine/types';
import { offersGridSnap } from './canvasOffers';

describe('what a simulator canvas offers', () => {
  /**
   * TC-151 — snapping to a grid is offered only where devices can be dragged.
   *
   * A snap control on a canvas whose devices cannot move is a button that does
   * nothing. The learning panels hide the whole control strip anyway, so no
   * page exercises this rule on its own: a host can mount a presentational
   * canvas and keep the controls, and then this is the only thing standing
   * between it and a dead button.
   */
  it('offers grid snap on an interactive canvas', () => {
    expect(offersGridSnap(interactionProfile('interactive'))).toBe(true);
  });

  it('does not offer grid snap on a presentational canvas', () => {
    expect(offersGridSnap(interactionProfile('presentational'))).toBe(false);
  });
});
