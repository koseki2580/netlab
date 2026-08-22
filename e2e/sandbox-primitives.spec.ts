import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox primitives mount, switch mode, and pass axe checks', async ({
  page,
  sandboxPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await sandboxPage.expectMounted();

  await expect(sandboxPage.tab('packet')).toBeVisible();
  await expect(sandboxPage.tab('node')).toBeVisible();
  await expect(sandboxPage.tab('parameters')).toBeVisible();
  await expect(sandboxPage.tab('traffic')).toBeVisible();
  await sandboxPage.expectEditsCount(0);
  await expect(sandboxPage.tabpanel()).toContainText('Right-click a node or link on the canvas');

  await sandboxPage.applyMtuEdit('R1', '500');
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.reload();
  await expect(sandboxPage.tabpanel()).toContainText('Interface MTU');
  await expect(sandboxPage.tabpanel()).toContainText('1');
  await sandboxPage.clickTab('parameters');
  await expect(sandboxPage.tabpanel()).toContainText('TCP initial window');

  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(1);
  await sandboxPage.toggleMode();
  await expect(sandboxPage.modeSwitch()).toContainText('Compare');
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(2);
  await sandboxPage.toggleMode();
  await expect(sandboxPage.modeSwitch()).toContainText('Live');
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(1);

  const results = await new AxeBuilder({ page })
    .include(`[data-testid="${SEL.sandbox.panel}"]`)
    .analyze();
  expect(results.violations).toEqual([]);
});
