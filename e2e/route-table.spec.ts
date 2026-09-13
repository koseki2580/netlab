import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-155 — the route table's collapse control collapses it.
 *
 * The panel drew a "⌃" labelled "Collapse route table" with no handler at all:
 * a control that did nothing, on a panel that floats over the diagram and can
 * cover the devices a learner is looking at. That is the one thing a collapse
 * button is for.
 */
test('the route table collapses and expands from its own control', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/areas/dmz');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const toggle = page.getByTestId(SEL.routeTable.toggle);
  const body = page.getByTestId(SEL.routeTable.body);
  await expect(body).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await toggle.click();
  await expect(body).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(body).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});
