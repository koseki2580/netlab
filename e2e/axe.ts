import type AxeBuilder from '@axe-core/playwright';
import { CANVAS_A11Y_EXCLUSIONS } from './selectors';

/**
 * Drop the graph engine's own DOM from an accessibility scan.
 *
 * Every demo page embeds a canvas, and every canvas scan needs the same
 * exclusions; going through one function keeps them identical and keeps the
 * engine named in exactly one place.
 */
export function excludingCanvasInternals(builder: AxeBuilder): AxeBuilder {
  for (const selector of CANVAS_A11Y_EXCLUSIONS) {
    builder.exclude(selector);
  }
  return builder;
}
