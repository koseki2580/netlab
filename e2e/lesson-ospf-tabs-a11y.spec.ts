import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-273 — the OSPF Convergence route-table tabs are a tablist with names of
 * their own.
 *
 * The tabs and the topology nodes were both buttons named "R2", so a screen
 * reader's list of controls offered two of each with nothing to tell them apart.
 */
test('the route-table tabs are named apart from the topology nodes', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const tablist = page.getByRole('tablist', { name: 'Route tables' });
  await expect(tablist.getByRole('tab')).toHaveCount(4);
  for (const label of ['R1', 'R2', 'R3', 'R4']) {
    const tab = page.getByRole('tab', { name: `${label} route table`, exact: true });
    await expect(tab).toHaveCount(1);
    await expect(tab).toHaveText(label);
    // Nothing on the page is a tab named only "R2" any more.
    await expect(page.getByRole('tab', { name: label, exact: true })).toHaveCount(0);
  }

  await expect(page.getByRole('tab', { name: 'R1 route table' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'R2 route table' }).click();
  await expect(page.getByRole('tab', { name: 'R2 route table' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'R1 route table' })).toHaveAttribute(
    'aria-selected',
    'false',
  );
  const panel = page.getByRole('tabpanel', { name: 'R2 route table' });
  await expect(panel).toHaveCount(1);
  await expect(panel.getByTestId('ospf-route-table-rows')).toBeVisible();
  // The sandbox page object finds its panels by this id prefix.
  await expect(page.locator('[role="tabpanel"][id^="sandbox-tabpanel-"]')).toHaveCount(0);

  // Arrow keys move the selection, as in any tablist.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'R3 route table' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'R3 route table' })).toHaveCount(1);
});

test('the route-table tabs are named in Japanese', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  await demoPage.dismissBrief();

  await expect(page.getByRole('tab', { name: 'R2 の経路表', exact: true })).toHaveText('R2');
  await page.getByRole('tab', { name: 'R2 の経路表', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'R2 の経路表' })).toHaveCount(1);
});
