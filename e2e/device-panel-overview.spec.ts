import { expect, test } from './fixtures/harness';

/**
 * The device panel for a router: an overview that says what the device is,
 * a header in words, no placeholder tab, an MTU shown once, and a resize edge
 * that can be found and used.
 */
const T = {
  node: 'topology-node',
  panel: '[data-netlab-dp]',
  tab: (id: string) => `[data-netlab-dp-tab="${id}"]`,
  resize: '[data-netlab-dp-resize-handle]',
} as const;

async function openRouter(
  page: import('@playwright/test').Page,
  demoPage: { goto: (p: string) => Promise<void>; dismissBrief: () => Promise<void> },
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/client-server');
  await demoPage.dismissBrief();
  await page.locator('[data-id="router-1"]').click();
  const panel = page.locator(T.panel);
  await expect(panel).toBeVisible();
  return panel;
}

test('a router overview names its role, its interfaces, its subnets and its neighbours', async ({
  page,
  demoPage,
}) => {
  const panel = await openRouter(page, demoPage);
  await panel.locator(T.tab('overview')).click();

  for (const row of ['role', 'interfaces', 'subnets', 'linkedTo']) {
    await expect(panel.locator(`[data-overview-row="${row}"]`)).toBeVisible();
  }
  await expect(panel.locator('[data-overview-row="subnets"]')).toContainText('10.0.0.0/24');
  await expect(panel.locator('[data-overview-row="linkedTo"] [data-linked-state]')).toHaveCount(2);
});

test('the header names the kind and the layer, and there is no placeholder ACL tab', async ({
  page,
  demoPage,
}) => {
  const panel = await openRouter(page, demoPage);

  await expect(panel.locator('[data-dp-node-kind]')).toHaveText('router');
  await expect(panel.locator('[data-dp-node-layer]')).toHaveText('L3 · network layer');
  await expect(panel.locator(T.tab('acl'))).toHaveCount(0);
});

test('an interface without an MTU shows it once, with what no limit means', async ({
  page,
  demoPage,
}) => {
  const panel = await openRouter(page, demoPage);
  await panel.locator(T.tab('ifaces')).click();

  const interfaces = await panel.locator('[data-low-mtu]').count();
  expect(interfaces).toBeGreaterThan(0);
  await expect(panel.locator('[data-mtu-unlimited]')).toHaveCount(interfaces);
});

test('the resize edge lights up on hover and resizes from the keyboard', async ({
  page,
  demoPage,
}) => {
  const panel = await openRouter(page, demoPage);
  const handle = panel.locator(T.resize);

  const atRest = await handle.evaluate((el) => getComputedStyle(el).backgroundColor);
  await handle.hover();
  await expect
    .poll(() => handle.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(atRest);

  const before = Number(await panel.getAttribute('data-dp-width'));
  await handle.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(panel).toHaveAttribute('data-dp-width', String(before + 16));
});
