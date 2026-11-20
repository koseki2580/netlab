import { expect, test } from './fixtures/harness';

/** REQ-403 — IPv6 Neighbor Discovery: predict NUD for a vanished neighbour, then SLAAC and DAD (TC-2079). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2079: a stale entry for a vanished neighbour is probed three times and deleted at 48 s; SLAAC and DAD follow the controls', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ipv6-nd');
  await expect(page.getByTestId('nd-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('nd-timeline')).toHaveCount(0);
  await page.getByTestId('nd-guess-drop-now').click();
  await page.getByTestId('nd-reveal-button').click();
  await expect(page.getByTestId('nd-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('nd-reveal')).toHaveAttribute('data-deleted-at', '48000');

  await expect(page.getByTestId('nd-final')).toHaveAttribute('data-state', 'NONE');
  await expect(page.getByTestId('nd-final')).toHaveAttribute('data-at', '48000');
  await page.getByTestId('nd-step').fill('4');
  await expect(page.getByTestId('nd-state')).toHaveAttribute('data-state', 'DELAY');
  await expect(page.getByTestId('nd-state')).toHaveAttribute('data-at', '40000');
  await page.getByTestId('nd-scenario-stays').click();
  await expect(page.getByTestId('nd-final')).toHaveAttribute('data-state', 'STALE');
  await expect(page.getByTestId('nd-final')).toHaveAttribute('data-at', '75000');

  await expect(page.getByTestId('nd-slaac')).toHaveAttribute(
    'data-address',
    '2001:db8:1:0:21a:2bff:fe3c:4d5e',
  );
  await expect(page.getByTestId('nd-dad-destination')).toHaveText('ff02::1:ff3c:4d5e');
  await expect(page.getByTestId('nd-dad')).toHaveAttribute('data-state', 'preferred');
  await page.getByTestId('nd-in-use-yes').click();
  await expect(page.getByTestId('nd-dad')).toHaveAttribute('data-usable', 'false');
  await page.getByTestId('nd-mac-02005e100001').click();
  await expect(page.getByTestId('nd-slaac')).toHaveAttribute(
    'data-address',
    '2001:db8:1::5eff:fe10:1',
  );
});
