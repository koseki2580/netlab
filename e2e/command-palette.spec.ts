import { expect, test } from '@playwright/test';

test('global command palette opens with keyboard and navigates to OSPF', async ({ page }) => {
  await page.goto('/#/networking/arp');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await page.getByLabel('Command palette search').fill('ospf');
  await expect(page.getByRole('option', { name: /ospf/i }).first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/#\/routing\/ospf-convergence$/);
  await expect(page.locator('[data-netlab-command-bar]')).toContainText(
    'scenario://ospf-convergence',
  );
});
