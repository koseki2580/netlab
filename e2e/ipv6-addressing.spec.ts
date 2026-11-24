import { expect, test } from './fixtures/harness';

/** REQ-430 — IPv6 addresses: predict the RFC 5952 spelling, then the 4th LAN's /64 (TC-2417, TC-2418). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2417: the first of two equal zero runs is compressed, and typed addresses are classified', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ipv6-addressing');
  await expect(page.getByTestId('ipv6a-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ipv6a-explorer')).toHaveCount(0);
  await page.getByTestId('ipv6a-guess-last').click();
  await page.getByTestId('ipv6a-reveal-button').click();
  await expect(page.getByTestId('ipv6a-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ipv6a-reveal')).toHaveAttribute(
    'data-canonical',
    '2001:db8::1:0:0:1',
  );
  await expect(page.getByTestId('ipv6a-explore')).toHaveAttribute(
    'data-canonical',
    'fe80::abc:0:0:1',
  );
  await expect(page.getByTestId('ipv6a-explore')).toHaveAttribute('data-kind', 'link-local');
  await page.getByTestId('ipv6a-input').fill('FD12:3456:789A:0001:0000:0000:0000:0001');
  await expect(page.getByTestId('ipv6a-explore')).toHaveAttribute(
    'data-canonical',
    'fd12:3456:789a:1::1',
  );
  await expect(page.getByTestId('ipv6a-explore')).toHaveAttribute('data-kind', 'ula');
  await page.getByTestId('ipv6a-input').fill('2001:db8::1::1');
  await expect(page.getByTestId('ipv6a-explore')).toHaveAttribute('data-valid', 'false');
});

test('TC-2418: LAN 4 of a /56 gets subnet ID 03, and the prefix length sets how many LANs fit', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ipv6-addressing');
  await expect(page.getByTestId('ipv6a-pd-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ipv6a-pd-plan')).toHaveCount(0);
  await page.getByTestId('ipv6a-pd-guess-s5604').click();
  await page.getByTestId('ipv6a-pd-reveal-button').click();
  await expect(page.getByTestId('ipv6a-pd-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ipv6a-pd-reveal')).toHaveAttribute(
    'data-prefix',
    '2001:db8:1234:5603::/64',
  );
  await expect(page.getByTestId('ipv6a-pd-result')).toHaveAttribute('data-count', '256');
  await page.getByTestId('ipv6a-pd-lan').fill('11');
  await expect(page.getByTestId('ipv6a-pd-result')).toHaveAttribute(
    'data-prefix',
    '2001:db8:1234:560a::/64',
  );
  await page.getByTestId('ipv6a-pd-length-60').click();
  await expect(page.getByTestId('ipv6a-pd-result')).toHaveAttribute('data-count', '16');
  await expect(page.getByTestId('ipv6a-pd-result')).toHaveAttribute(
    'data-prefix',
    '2001:db8:1234:567a::/64',
  );
});
