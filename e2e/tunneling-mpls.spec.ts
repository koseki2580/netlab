import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('MPLS L3VPN demo shows LDP, VPNv4, and PHP state', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/tunneling/mpls-l3vpn');

  await expect(page.getByTestId(SEL.demo.mplsLdp)).toContainText('converged');
  await expect(page.getByTestId(SEL.demo.vpnv4Route)).toContainText('10.0.2.0/24');

  await page.getByTestId(SEL.demo.mplsPhpDisable).click();
  await expect(page.getByTestId(SEL.demo.mplsPhp)).toContainText('disabled');
});

/**
 * TC-215 — each link carries the label its downstream router advertised.
 *
 * The lesson showed one stack, "3 / 24010" with PHP and "16001 / 24010"
 * without: 3 (implicit null) never appears on a wire, and 16001 is P's own
 * label, which P swaps for PE2's before the packet reaches PE2.
 */
test('the label stack on each link is the one a real LSP carries', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/tunneling/mpls-l3vpn');

  const intoP = page.getByTestId('mpls-stack-pe1-p');
  const intoPe2 = page.getByTestId(SEL.demo.mplsStack);

  await expect(intoP).toContainText('16001 / 24010');
  await expect(intoPe2).toContainText('24010');
  await expect(
    intoPe2,
    'implicit null is a request to pop, never a label on the wire',
  ).not.toContainText('3 /');

  await page.getByTestId(SEL.demo.mplsPhpDisable).click();
  await expect(intoP).toContainText('16001 / 24010');
  await expect(intoPe2, "P swaps its own label for PE2's").toContainText('16002 / 24010');
});
