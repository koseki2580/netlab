import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('DHCPv6 SLAAC demo switches M/O flag behavior', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/dhcpv6');

  await expect(page.getByTestId(SEL.demo.slaacMode)).toContainText('DHCPv6 address');
  await expect(page.getByTestId(SEL.demo.hostDns)).toContainText('2001:db8::53');

  await page.getByTestId(SEL.demo.dhcpv6FlagM0O1).click();
  await expect(page.getByTestId(SEL.demo.slaacMode)).toContainText('slaac-with-dhcpv6-other');
  await expect(page.getByTestId(SEL.demo.hostDns)).toContainText('2001:db8::53');

  await page.getByTestId(SEL.demo.dhcpv6FlagM0O0).click();
  await expect(page.getByTestId(SEL.demo.slaacMode)).toContainText('slaac-only');
  await expect(page.getByTestId(SEL.demo.hostDns)).toContainText('none');
});
