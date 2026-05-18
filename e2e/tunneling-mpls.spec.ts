import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('MPLS L3VPN demo shows LDP, VPNv4, and PHP state', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/tunneling/mpls-l3vpn');

  await expect(page.getByTestId(SEL.demo.mplsLdp)).toContainText('converged');
  await expect(page.getByTestId(SEL.demo.vpnv4Route)).toContainText('10.0.2.0/24');
  await expect(page.getByTestId(SEL.demo.mplsStack)).toContainText('3 / 24010');

  await page.getByTestId(SEL.demo.mplsPhpDisable).click();
  await expect(page.getByTestId(SEL.demo.mplsPhp)).toContainText('disabled');
});
