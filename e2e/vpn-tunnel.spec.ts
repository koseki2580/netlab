import { expect, test } from './fixtures/harness';

/** REQ-391 — site-to-site VPNs: predict what an observer reads of IPsec, compare overhead, follow selectors (TC-1959). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1959: ESP hides the inner packet, costs 56 bytes, and only selected traffic enters the tunnel', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/vpn-tunnel');
  await expect(page.getByTestId('vpn-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('vpn-capture')).toHaveCount(0);
  await page.getByTestId('vpn-guess-everything').click();
  await page.getByTestId('vpn-reveal-button').click();
  await expect(page.getByTestId('vpn-reveal')).toHaveAttribute('data-right', 'false');

  await expect(page.getByTestId('vpn-segment-inner-ip')).toHaveAttribute('data-readable', 'false');
  await page.getByTestId('vpn-method-gre').click();
  await expect(page.getByTestId('vpn-segment-inner-ip')).toHaveAttribute('data-readable', 'true');

  const ipsec = page.getByTestId('vpn-row-ipsec');
  await expect(ipsec).toHaveAttribute('data-overhead', '56');
  await expect(ipsec).toHaveAttribute('data-outer', '1556');
  await expect(ipsec).toHaveAttribute('data-fits', 'false');
  await expect(ipsec).toHaveAttribute('data-max', '1446');
  await expect(page.getByTestId('vpn-row-gre')).toHaveAttribute('data-max', '1476');
  await expect(page.getByTestId('vpn-row-wireguard')).toHaveAttribute('data-max', '1440');
  await page.getByTestId('vpn-inner').fill('1400');
  await expect(ipsec).toHaveAttribute('data-outer', '1456');
  await expect(ipsec).toHaveAttribute('data-fits', 'true');
  await page.getByTestId('vpn-mtu-1492').click();
  await expect(ipsec).toHaveAttribute('data-max', '1438');

  const decision = page.getByTestId('vpn-decision');
  await expect(decision).toHaveAttribute('data-ipsec', 'protect-B');
  await expect(decision).toHaveAttribute('data-wg', 'peer-B');
  await page.getByTestId('vpn-dest-10.4.0.9').click();
  await expect(decision).toHaveAttribute('data-ipsec', 'bypass');
  await expect(decision).toHaveAttribute('data-wg', 'no-peer');
});
