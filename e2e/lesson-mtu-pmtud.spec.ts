import { expect, test } from './fixtures/harness';

/**
 * TC-980 — the MTU lesson shows path MTU discovery (RFC 1191) as the simulator
 * runs it: a DF ping too big for the tunnel is refused by R1 with the tunnel's
 * MTU, Host A remembers that MTU for Host B, and a packet that size arrives.
 */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('a DF ping teaches Host A the path MTU, and a packet that size arrives', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/networking/mtu-fragmentation');
    const card = page.getByTestId('mtu-pmtud');
    await expect(card.getByTestId('mtu-pmtud-path-mtu')).toHaveText(
      "Host A's path MTU to Host B: not learned yet",
    );
    await expect(card.getByTestId('mtu-pmtud-resend')).toBeDisabled();

    await page.getByTestId('mtu-df-toggle').check();
    await page.getByTestId('demo-primary-action').click();

    await expect(card.getByTestId('mtu-pmtud-answer')).toHaveText(
      'R1 answered "fragmentation needed" with MTU 604',
    );
    await expect(card.getByTestId('mtu-pmtud-path-mtu')).toHaveText(
      "Host A's path MTU to Host B: 604 bytes",
    );

    const resend = card.getByTestId('mtu-pmtud-resend');
    await expect(resend).toHaveText('send again at 604 bytes, DF set');
    await resend.click();
    await expect(card.getByTestId('mtu-pmtud-result')).toHaveText(
      'It arrived whole at Host B: no fragments, no ICMP.',
    );
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('the same steps read in Japanese, at a narrower tunnel', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/mtu-fragmentation');
    await page.getByTestId('mtu-tunnel-slider').fill('508');
    await page.getByTestId('mtu-df-toggle').check();
    await page.getByTestId('demo-primary-action').click();

    const card = page.getByTestId('mtu-pmtud');
    await expect(card.getByTestId('mtu-pmtud-answer')).toHaveText(
      'R1 が「fragmentation needed」を MTU 508 付きで返しました',
    );
    await expect(card.getByTestId('mtu-pmtud-path-mtu')).toHaveText(
      'Host A が覚えた Host B への Path MTU: 508 バイト',
    );
    await card.getByTestId('mtu-pmtud-resend').click();
    await expect(card.getByTestId('mtu-pmtud-result')).toHaveText(
      'Host B に分割されずに届きました。ICMP も返りません。',
    );
  });
});
