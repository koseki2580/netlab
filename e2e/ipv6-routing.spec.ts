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

// TC-240: a failed link takes the session that ran over it down — no route may
// keep a next hop on it.
test('IPv6 routing demo withdraws the MP-BGP route when its link fails', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ipv6-routing');
  await expect(page.getByTestId(SEL.demo.mpBgpRoute)).toContainText('via 2001:db8:12::2');

  await page.getByTestId(SEL.demo.ospfv3LinkFail).click();
  await expect(page.getByTestId(SEL.demo.mpBgpRoute)).toContainText('No MP-BGP route');
  await expect(page.getByTestId(SEL.demo.r1Ipv6Routes)).not.toContainText('2001:db8:12:');

  await page.getByTestId(SEL.demo.ospfv3LinkFail).click();
  await expect(page.getByTestId(SEL.demo.mpBgpRoute)).toContainText('via 2001:db8:12::2');
});
