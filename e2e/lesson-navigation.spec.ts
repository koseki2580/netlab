import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-185 — moving from one lesson to another keeps the page alive.
 *
 * Every spec opened one lesson per test, so none noticed that leaving a lesson
 * for another blanked the page: the canvas tore its graph down before its
 * overview, and the overview then reached for an element that was gone. A
 * learner who followed "next lesson", or pressed back, saw an empty screen.
 */
test('going from lesson to lesson and back never blanks the page', async ({ page, demoPage }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const path of ['/routing/client-server', '/networking/arp', '/basic/star']) {
    await demoPage.goto(path);
    await expect(
      page.getByTestId(SEL.canvas.node).first(),
      `${path} draws its devices`,
    ).toBeVisible();
  }
  await page.goBack();
  await expect(page.getByTestId(SEL.canvas.node).first(), 'and back again').toBeVisible();

  expect(errors, 'no error on the way').toEqual([]);
});
