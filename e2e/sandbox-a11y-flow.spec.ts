import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox popovers and compare flow remain accessible', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  const routedNode = page.getByTestId(SEL.canvas.node).filter({ hasText: 'R1' }).first();
  await routedNode.click({ button: 'right', force: true });

  const popover = page.getByRole('dialog', { name: 'Edit in sandbox' });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Edit in sandbox');

  // Scoped to the dialog and limited to WCAG A/AA, as the other a11y specs are.
  // `heading-order` is an axe best-practice rule, and scoping to a fragment
  // hides the h1 → h2 above this dialog's h3, so it reports a jump that the page
  // does not actually have.
  const popoverA11y = await new AxeBuilder({ page })
    .include('[role="dialog"][data-anchor-kind]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(popoverA11y.violations).toEqual([]);

  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();
  await expect(popover).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(2);

  const compareA11y = await new AxeBuilder({ page })
    .include('[data-testid="sandbox-panel"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(compareA11y.violations).toEqual([]);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(1);
});
