import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { excludingCanvasInternals, undecidedContrastFailures } from './axe';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-528 to TC-530 — the exercise pages for a learner who does not see the
 * screen, or sees it in the light theme.
 *
 * The pages are reached from a card, not from a gallery category, so the
 * sweeps that walk the categories never open them. The exercise is scanned
 * before and after a failed Check, because the result panel — the part a
 * learner reads most — exists only after one.
 */
const X = SEL.exercises;
const EXERCISE = 'l1-host-address~0';

async function violations(page: Page) {
  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  return {
    rules: results.violations.map((rule) => `${rule.id}: ${rule.nodes[0]?.html.slice(0, 120)}`),
    // What axe could not decide through a `color-mix()` background, measured.
    contrast: await undecidedContrastFailures(page, results),
  };
}

const CLEAN = { rules: [], contrast: [] };

async function sweep(page: Page) {
  await page.goto('/#/exercises');
  await expect(page.getByTestId(X.level(1))).toBeVisible();
  expect(await violations(page), 'the hub').toEqual(CLEAN);

  await page.goto('/#/exercises/level/1');
  await expect(page.getByTestId(X.kinds)).toBeVisible();
  expect(await violations(page), 'a level page').toEqual(CLEAN);

  await page.goto(`/#/exercises/do/${EXERCISE}`);
  await expect(page.getByTestId(X.check)).toBeVisible();
  await expect(page.getByTestId(X.diagram).getByTestId(SEL.canvas.node).last()).toBeVisible();
  expect(await violations(page), 'an exercise before Check').toEqual(CLEAN);

  // A failed Check with a hint open: the result, the "not yet" marks and the hint card.
  await page.getByTestId(X.check).click();
  await expect(page.getByTestId(X.result)).toHaveAttribute('data-passed', 'false');
  await page.getByTestId(X.hint).click();
  await expect(page.getByTestId(X.hintText(1))).toBeVisible();
  expect(await violations(page), 'an exercise after a failed Check').toEqual(CLEAN);

  // The level page again, now that it lists what was done and what to look at.
  await page.goto('/#/exercises/level/1');
  await expect(page.getByTestId(X.recent)).toBeVisible();
  expect(await violations(page), 'a level page with a record').toEqual(CLEAN);
}

/** TC-528 — in the dark theme the pages open in. */
test('the exercise pages have no accessibility violations', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await sweep(page);
});

/** TC-529 — and in the light theme, where the contrast failures live. */
test('the exercise pages have no accessibility violations in light', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  // Dark first: the gallery opens light, and a setting is only remembered once
  // it changes, so choosing Light alone would leave nothing stored.
  await page.getByTestId(SEL.gallery.themeMode('dark')).click();
  await page.waitForTimeout(120);
  await page.getByTestId(SEL.gallery.themeMode('light')).click();
  await page.waitForTimeout(220);
  await sweep(page);
});

/**
 * TC-530 — pressing Check is answered where a screen reader is: focus moves to
 * the result, the result is a live status region, and it says in words how
 * many goals are left.
 */
test('after Check, focus is on the result and the result is announced', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/#/exercises/do/${EXERCISE}`);
  const check = page.getByTestId(X.check);
  await expect(check).toBeVisible();
  // The region is there before anything is in it, so what appears in it is announced.
  const result = page.getByTestId(X.result);
  await expect(result).toHaveRole('status');
  await expect(result).toHaveAttribute('aria-live', 'polite');
  await expect(result).toBeEmpty();

  await check.focus();
  await page.keyboard.press('Enter');
  await expect(result).toHaveAttribute('data-passed', 'false');
  await expect(result).toBeFocused();
  await expect(
    page.getByRole('status').filter({ has: page.getByTestId(X.resultSummary) }),
  ).toContainText('Not there yet: 1 of 3 goals to go.');
  // Each goal says its state in a word, not by colour alone.
  await expect(page.getByTestId(X.resultGoal('reach-pc1-srv'))).toContainText('Not yet');
  // The goals already met are one press away, so the settings stay on screen.
  await page.getByTestId(X.resultMore).click();
  await expect(page.getByTestId(X.resultGoal('reach-pc2-srv'))).toContainText('Done');
  await page.getByTestId(X.result).focus();

  // The keyboard goes on from the result, not from the top of the page: the
  // next stop is "watch it on the diagram" for the goal that was missed.
  // (Safari leaves buttons out of the Tab order unless Option is held.)
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByTestId(X.replay('reach-pc1-srv'))).toBeFocused();
});
