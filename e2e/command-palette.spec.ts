import { expect, test } from './fixtures/harness';

test('global command palette opens with keyboard and navigates to OSPF', async ({
  page,
  commandBarPage,
}) => {
  await page.goto('/#/networking/arp');

  await commandBarPage.open();
  await commandBarPage.typeSearch('ospf');
  await expect(commandBarPage.optionFirst()).toBeVisible();
  await commandBarPage.pressArrowDown();
  await commandBarPage.pressArrowUp();
  await commandBarPage.submit();

  await expect(page).toHaveURL(/#\/routing\/ospf-convergence$/);
  await expect(page.locator('[data-netlab-command-bar]')).toContainText(
    'scenario://ospf-convergence',
  );
});
