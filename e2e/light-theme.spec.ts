import AxeBuilder from '@axe-core/playwright';
import { CATEGORIES, expect, test } from './fixtures/harness';
import { excludingCanvasInternals, undecidedContrastFailures } from './axe';
import type { GalleryPage } from './pages/GalleryPage';
import { SEL } from './selectors';

/**
 * TC-041 — every lesson is readable in the light theme.
 *
 * The Light setting existed, and until it started reaching the lessons nobody
 * had opened one in it. The first scan found 66 contrast failures across 22
 * lessons: the light palette's amber read 3.04:1 as label text, its faint text
 * 2.08:1, and dozens of panels were painted in fixed slate that never changed
 * with the theme at all.
 *
 * Dark has always been scanned by `a11y.spec.ts`. This is the other half.
 */
async function chooseLightThenOpen(
  page: import('@playwright/test').Page,
  galleryPage: GalleryPage,
  path: string,
) {
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  // Dark first: the gallery opens light, and a setting is only remembered once
  // it changes, so choosing Light alone would leave nothing stored.
  await galleryPage.chooseTheme('dark');
  await galleryPage.chooseTheme('light');
  await page.goto(`/#${path}`);
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
}

test.use({ viewportPreset: 'wide' });

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(
      `light a11y: ${category.id}/${demo.title}`,
      // One demo of the loop is enough for the smoke run.
      { tag: demo === CATEGORIES[0]?.demos[0] ? '@smoke' : [] },
      async ({ page, galleryPage }) => {
        await chooseLightThenOpen(page, galleryPage, demo.path);

        const results = await excludingCanvasInternals(
          new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']),
        ).analyze();
        expect(results.violations).toEqual([]);
        // TC-161 — and nothing axe could not decide falls short either.
        expect(await undecidedContrastFailures(page, results)).toEqual([]);
      },
    );
  }
}

/**
 * WCAG contrast of an element's text against what it is actually drawn on: the
 * first ancestor (or itself) with a mostly opaque background, with the text
 * faded by every ancestor's opacity, since a faded label is what was failing.
 */
async function textContrast(locator: import('@playwright/test').Locator): Promise<number> {
  return locator.evaluate((element) => {
    const channels = (value: string): number[] => {
      const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
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
    let background = [255, 255, 255];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const candidate = channels(getComputedStyle(node).backgroundColor);
      if (candidate.length >= 3 && (candidate[3] === undefined || candidate[3] > 0.5)) {
        background = candidate;
        break;
      }
    }
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    const raw = channels(getComputedStyle(element).color);
    const alpha = (raw[3] ?? 1) * opacity;
    const foreground = [0, 1, 2].map((i) => raw[i]! * alpha + background[i]! * (1 - alpha));
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test.describe('REQ-424 — faded and muted text stays readable in the light theme', () => {
  test('TC-2332: the learning path’s Locked badge reaches 4.5:1', async ({ page, galleryPage }) => {
    await chooseLightThenOpen(page, galleryPage, '/path');
    const stage = page.getByTestId('path-stage-2');
    await expect(stage).toHaveAttribute('data-state', 'locked');
    const badge = page.getByTestId('path-stage-2-badge');
    await expect(badge).toContainText('Locked');
    expect(await textContrast(badge)).toBeGreaterThanOrEqual(4.5);
  });

  test('TC-2333: every option of an answered concept check reaches 4.5:1', async ({
    page,
    galleryPage,
  }) => {
    await chooseLightThenOpen(page, galleryPage, '/learning/protocols');
    await page.getByTestId('concept-check-deck-dns').click();
    await page.getByTestId('concept-check-option-0').click();
    await expect(page.getByTestId('concept-check-next')).toBeVisible();
    const options = page.locator('[data-testid^="concept-check-option-"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
    for (let index = 0; index < count; index += 1) {
      const option = options.nth(index);
      expect(await textContrast(option), await option.innerText()).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('TC-2334: a lesson’s disabled reveal button reaches 4.5:1 before a prediction', async ({
    page,
    galleryPage,
  }) => {
    await chooseLightThenOpen(page, galleryPage, '/networking/l4s');
    const reveal = page.getByTestId('l4s-reveal-button');
    await expect(reveal).toBeDisabled();
    await expect(reveal).toHaveText('Predict first');
    expect(await textContrast(reveal)).toBeGreaterThanOrEqual(4.5);
  });
});
