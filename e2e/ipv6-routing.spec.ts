import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('IPv6 routing demo shows OSPFv3 ECMP and recomputes after failure', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ipv6-routing');

  await expect(page.getByTestId(SEL.demo.ospfv3Ecmp)).toContainText('2 active next hops');
  await expect(page.getByTestId(SEL.demo.mpBgpRoute)).toContainText('2001:db8:2::/64');

  await page.getByTestId(SEL.demo.ospfv3LinkFail).click();
  await expect(page.getByTestId(SEL.demo.ospfv3Ecmp)).toContainText('1 active next hop');
});
