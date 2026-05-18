import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('VXLAN EVPN demo shows UDP/4789, EVPN routes, and ARP suppression', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tunneling/vxlan-evpn');

  await expect(page.getByTestId(SEL.demo.vxlanOuter)).toContainText('UDP/4789');
  await expect(page.getByTestId(SEL.demo.evpnType2)).toContainText('10.10.0.20');
  await expect(page.getByTestId(SEL.demo.evpnType5)).toContainText('10.10.0.0/24');
  await expect(page.getByTestId(SEL.demo.arpSuppression)).toContainText('hit');

  await page.getByTestId(SEL.demo.arpSuppressionToggle).click();
  await expect(page.getByTestId(SEL.demo.arpSuppression)).toContainText('flood');
});
