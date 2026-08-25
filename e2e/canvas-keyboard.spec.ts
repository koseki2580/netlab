import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-037 — a device can be opened without a mouse.
 *
 * Selecting a device is how a learner reads its addresses, its interfaces and
 * its routes; a canvas whose devices are not in the tab order puts all of that
 * out of reach of anyone working by keyboard. React Flow made its nodes
 * focusable and the interaction profile still asks for it, so the loss was
 * silent — nothing in the DOM says "this used to be reachable".
 */
test('a device can be reached and opened with the keyboard alone', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  // Tab until a device takes focus, the way a keyboard user arrives at one.
  let reached = false;
  for (let stop = 0; stop < 30 && !reached; stop += 1) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(
      (testid) => !!document.activeElement?.closest(`[data-testid="${testid}"], [data-id]`),
      SEL.canvas.node,
    );
  }
  expect(reached, 'a device is in the tab order').toBe(true);

  const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  expect(name, 'the focused device says which one it is').not.toBe('');

  await page.keyboard.press('Enter');
  await expect(
    page.getByTestId(SEL.nodeDetail.closePanel),
    'pressing Enter opens the device',
  ).toBeVisible();
});
