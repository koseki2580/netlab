import { expect, test } from './fixtures/harness';

/**
 * TC-983 — the IPv6 lesson's NDP step names the solicited-node address and
 * the 33:33 MAC of the address chosen, and says the simulator sends no NS/NA.
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
    await expect(step.getByTestId('ipv6-ndp-note')).toContainText(
      'finds IPv6 neighbours without sending these messages',
    );
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
    await expect(step.getByTestId('ipv6-ndp-note')).toContainText(
      'これらのメッセージを送らずに IPv6 の隣の機器を見つけます',
    );
  });
});
