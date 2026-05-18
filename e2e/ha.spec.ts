import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('high availability demo fails over VRRP and rehashes LACP members', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ha');

  await expect(page.getByTestId(SEL.demo.vrrpMaster)).toContainText('R1');
  await expect(page.getByTestId(SEL.demo.memberCount)).toContainText('2 active member');

  await page.getByTestId(SEL.demo.haFailGateway).click();
  await expect(page.getByTestId(SEL.demo.vrrpMaster)).toContainText('R2');

  await page.getByTestId(SEL.demo.haFailLacp).click();
  await expect(page.getByTestId(SEL.demo.memberCount)).toContainText('1 active member');
  await expect(page.getByTestId(SEL.demo.lacpMember)).toContainText('fa0/2');
});
