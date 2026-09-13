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

/** A text element whose contrast axe could not decide, measured directly. */
export interface MeasuredContrast {
  readonly text: string;
  readonly ratio: number;
  readonly required: number;
}

/**
 * The contrast axe declined to judge, judged.
 *
 * axe cannot compute a ratio through a `color-mix()` background, so it files
 * those nodes under "incomplete" instead of "violations" — and a scan that only
 * reads violations passes them. That is how seven lessons shipped a panel
 * heading in fixed near-white on a light panel, invisible, while the
 * light-theme sweep stayed green. This resolves each such node's colour against
 * the first ancestor with a mostly opaque background and applies WCAG AA:
 * 4.5:1, or 3:1 for large text.
 */
export async function undecidedContrastFailures(
  page: import('@playwright/test').Page,
  results: { incomplete: { id: string; nodes: { target: unknown[] }[] }[] },
): Promise<MeasuredContrast[]> {
  const selectors = results.incomplete
    .filter((rule) => rule.id === 'color-contrast')
    .flatMap((rule) => rule.nodes.map((node) => String(node.target[0])));
  return page.evaluate((targets: string[]) => {
    const channels = (value: string): number[] => {
      const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
      // color-mix() computes to color(srgb r g b / a), channels in 0..1.
      if (value.startsWith('color(srgb')) {
        return [numbers[0]! * 255, numbers[1]! * 255, numbers[2]! * 255, numbers[3] ?? 1];
      }
      return numbers;
    };
    const luminance = ([r, g, b]: number[]) =>
      [r!, g!, b!]
        .map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);

    const failures: { text: string; ratio: number; required: number }[] = [];
    for (const selector of targets) {
      const element = document.querySelector(selector);
      const text = (element?.textContent ?? '').trim();
      if (!element || !text) continue;
      const style = getComputedStyle(element);
      const foreground = channels(style.color);
      let background = [255, 255, 255];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const candidate = channels(getComputedStyle(node).backgroundColor);
        if (candidate.length >= 3 && (candidate[3] === undefined || candidate[3] > 0.5)) {
          background = candidate;
          break;
        }
      }
      const a = luminance(foreground);
      const b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const required = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < required) {
        failures.push({ text: text.slice(0, 48), ratio: Math.round(ratio * 100) / 100, required });
      }
    }
    return failures;
  }, selectors);
}
