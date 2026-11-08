import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test(
  'TC-1296: a ping crosses the VXLAN fabric, EVPN is shown, and another VNI stops it',
  { tag: '@smoke' },
  async ({ page, demoPage }) => {
    await demoPage.goto('/networking/tunneling/vxlan-evpn');

    await expect(page.getByTestId(SEL.demo.evpnType2)).toContainText('10.20.0.10');
    await expect(page.getByTestId(SEL.demo.evpnType5)).toContainText('10.20.0.0/24');
    await expect(page.getByTestId(SEL.demo.arpSuppression)).toContainText('hit');
    await page.getByTestId(SEL.demo.arpSuppressionToggle).click();
    await expect(page.getByTestId(SEL.demo.arpSuppression)).toContainText('flood');

    await page.getByTestId(SEL.demo.vxlanSend).click();
    await expect(page.getByTestId(SEL.demo.vxlanOuter)).toContainText('UDP/4789 VNI 10000');
    await expect(page.getByTestId(SEL.demo.vxlanStatus)).toContainText('Delivered');
    await expect(page.getByTestId(SEL.demo.vxlanHex)).toContainText('VNI');
    await expect(page.getByTestId(SEL.demo.vxlanHex)).toContainText('Inner Src IP');

    await page.getByTestId(SEL.demo.vxlanVniChange).click();
    await page.getByTestId(SEL.demo.vxlanSend).click();
    await expect(page.getByTestId(SEL.demo.vxlanStatus)).toContainText('VNIs do not match');
  },
);
