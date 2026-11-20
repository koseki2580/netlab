import { expect, test } from './fixtures/harness';

/** REQ-402 — protecting access ports: predict, reveal, then change the settings (TC-2067, TC-2068). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2067: an unauthorised port passes only EAPOL, devices land in their VLANs, and port security reacts to its mode and maximum', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/access-security');
  await expect(page.getByTestId('acc-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('acc-frames')).toHaveCount(0);
  await page.getByTestId('acc-guess-eapol-dhcp').click();
  await page.getByTestId('acc-reveal-button').click();
  await expect(page.getByTestId('acc-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('acc-frame-eapol')).toHaveAttribute('data-unauth', 'forward');
  await expect(page.getByTestId('acc-frame-dhcp')).toHaveAttribute('data-unauth', 'drop');
  await expect(page.getByTestId('acc-frame-dhcp')).toHaveAttribute('data-auth', 'forward');

  await expect(page.getByTestId('acc-device-employee')).toHaveAttribute('data-vlan', '10');
  await expect(page.getByTestId('acc-device-contractor')).toHaveAttribute('data-vlan', '30');
  await expect(page.getByTestId('acc-device-printer')).toHaveAttribute('data-vlan', '40');
  await expect(page.getByTestId('acc-device-printer')).toHaveAttribute('data-method', 'MAB');
  await expect(page.getByTestId('acc-device-camera')).toHaveAttribute('data-vlan', 'none');
  await page.getByTestId('acc-guest-on').click();
  await expect(page.getByTestId('acc-device-camera')).toHaveAttribute('data-vlan', '99');

  const result = page.getByTestId('acc-ps-result');
  await expect(result).toHaveAttribute('data-port', 'err-disabled');
  await expect(result).toHaveAttribute('data-access', '0');
  await page.getByTestId('acc-ps-mode-restrict').click();
  await expect(result).toHaveAttribute('data-port', 'up');
  await expect(result).toHaveAttribute('data-access', '1');
  await expect(result).toHaveAttribute('data-logged', 'true');
  await page.getByTestId('acc-ps-max').fill('3');
  await expect(result).toHaveAttribute('data-access', '3');
  await expect(result).toHaveAttribute('data-dropped', '0');
});

test('TC-2068: DHCP snooping drops the rogue OFFER, DAI drops ARP without a binding, and trusting the wrong port lets the OFFER through', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/access-security');
  await page.getByTestId('acc-guess-eapol-only').click();
  await page.getByTestId('acc-reveal-button').click();
  await expect(page.getByTestId('acc-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('acc-snoop-2')).toHaveAttribute('data-action', 'drop');
  await expect(page.getByTestId('acc-snoop-3')).toHaveAttribute('data-action', 'forward');
  await expect(page.getByTestId('acc-bindings')).toHaveAttribute('data-count', '1');
  await expect(page.getByTestId('acc-snoop-6')).toHaveAttribute('data-action', 'forward');
  await expect(page.getByTestId('acc-snoop-8')).toHaveAttribute('data-action', 'drop');
  await expect(page.getByTestId('acc-snoop-9')).toHaveAttribute('data-action', 'drop');
  await page.getByTestId('acc-trust-both').click();
  await expect(page.getByTestId('acc-snoop-2')).toHaveAttribute('data-action', 'forward');
});
