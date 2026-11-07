import { expect, test } from './fixtures/harness';

/**
 * TC-983 — the IPv6 lesson's NDP step names the solicited-node address and
 * the 33:33 MAC of the address chosen, and says the first send shows them.
 * TC-1196 — and the send does: NS and NA rows, on the first send only.
 */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('the NDP step works out the group and MAC for the address chosen', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/networking/ipv6');
    const step = page.getByTestId('ipv6-ndp');
    await step.getByTestId('ipv6-ndp-target').selectOption('2001:db8:2::20');
    await expect(step.getByTestId('ipv6-ndp-solicited')).toHaveText(
      'Solicited-node address: ff02::1:ff00:20',
    );
    await expect(step.getByTestId('ipv6-ndp-mac')).toHaveText(
      'Frame sent to MAC: 33:33:ff:00:00:20',
    );

    await step.getByTestId('ipv6-ndp-target').selectOption('2001:db8:1::1');
    await expect(step.getByTestId('ipv6-ndp-solicited')).toHaveText(
      'Solicited-node address: ff02::1:ff00:1',
    );
    await expect(step.getByTestId('ipv6-ndp-mac')).toHaveText(
      'Frame sent to MAC: 33:33:ff:00:00:01',
    );
    await expect(step.getByTestId('ipv6-ndp-note')).toContainText('the first send');
  });

  test('the first send solicits and is answered; the second asks nothing (TC-1196)', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/networking/ipv6');
    const log = page.getByTestId('demo-trace-log').first();
    await page.getByTestId('ipv6-send-echo').click();
    await expect(log).toContainText('Dual-stack Client NS → ff02::1:ff00:1');
    await expect(log).toContainText('R1 NA → 2001:db8:1::10');
    await expect(log).toContainText('R1 NS → ff02::1:ff00:20');
    const solicitations = async () => ((await log.textContent()) ?? '').split(' NS → ').length - 1;
    const before = await solicitations();
    await page.getByTestId('ipv6-send-echo').click();
    await demoPage.waitForTraceCount(2);
    await expect.poll(solicitations).toBe(before);
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('the NDP step reads in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/ipv6');
    const step = page.getByTestId('ipv6-ndp');
    await step.getByTestId('ipv6-ndp-target').selectOption('2001:db8:1::10');
    await expect(step.getByTestId('ipv6-ndp-solicited')).toHaveText(
      'solicited-node アドレス: ff02::1:ff00:10',
    );
    await expect(step.getByTestId('ipv6-ndp-mac')).toHaveText(
      'フレームの宛先 MAC: 33:33:ff:00:00:10',
    );
    await expect(step.getByTestId('ipv6-ndp-note')).toContainText('最初の送信');
  });
});
