import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-038 — the Settings panel means what it says.
 *
 * The gallery offers Light and Dark under Settings, beside locale, audience,
 * palette and density, and writes all of them to storage under the same
 * prefix. A lesson honoured two of the five. A learner who chose Light and then
 * opened a lesson got a dark one, with no way to tell whether the setting had
 * been ignored or forgotten.
 *
 * The pair matters: a lesson opened without choosing anything must stay dark,
 * because that is what the lessons are designed as and a preference nobody
 * expressed is not a preference.
 */
function lessonBackground(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="netlab-root"]');
    return root ? getComputedStyle(root).backgroundColor : '';
  });
}

/** Rough brightness, enough to tell a light surface from a dark one. */
function brightness(colour: string): number {
  const [r = 0, g = 0, b = 0] = (colour.match(/\d+/g) ?? []).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('a lesson opened without choosing a theme stays dark', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  expect(brightness(await lessonBackground(page)), 'the lesson is dark by default').toBeLessThan(
    80,
  );
});

test('a lesson follows the theme chosen in the gallery, either way', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });

  const chooseThenOpen = async (choice: 'light' | 'dark') => {
    await page.goto('/#/');
    await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
    await page.getByTestId(SEL.gallery.themeMode(choice)).click();
    await page.waitForTimeout(300);
    await page.goto('/#/routing/client-server');
    await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
    await page.waitForTimeout(400);
    return brightness(await lessonBackground(page));
  };

  // Dark first: the gallery opens light, so this is the choice that proves the
  // setting is being read rather than the default coinciding with it.
  expect(await chooseThenOpen('dark'), 'choosing Dark gives a dark lesson').toBeLessThan(80);
  expect(await chooseThenOpen('light'), 'choosing Light gives a light lesson').toBeGreaterThan(180);
});
