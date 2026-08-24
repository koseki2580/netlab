import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-021 — a learner takes a link down from the canvas.
 *
 * Right-clicking a link is the only way into the link editor, and it is the one
 * canvas gesture that goes through the graph engine rather than through a
 * device's own markup: a device is HTML the app renders, a link is a shape the
 * engine draws. Nothing covered it, so replacing the engine could have dropped
 * the feature in silence.
 */
test('right-clicking a link opens its editor and records the edit', async ({
  page,
  sandboxPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await sandboxPage.rightClickLink();

  await expect(page.getByTestId(SEL.sandbox.linkEditor.root)).toBeVisible();
  await page.getByTestId(SEL.sandbox.linkEditor.stateDown).click();
  await page.getByTestId(SEL.sandbox.linkEditor.apply).click();

  await sandboxPage.clickTab('edits');
  await expect(page.getByTestId(SEL.sandbox.edits.list).first()).toBeVisible();
});
