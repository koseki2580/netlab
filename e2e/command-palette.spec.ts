import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('global command palette opens with keyboard and navigates to OSPF', async ({
  page,
  commandBarPage,
}) => {
  await page.goto('/#/networking/arp');
  // The shortcut is only listened for once the app has mounted. Pressing it
  // straight after `goto` raced that on WebKit under the default parallel run:
  // the key went nowhere and the palette never opened.
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

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
