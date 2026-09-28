import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-230 — the DHCPv6 / SLAAC lesson names each mode in the reader's language
 * and is honest about dropping the DHCPv6 address when M goes back to 0.
 *
 * The Japanese page showed the raw identifiers `slaac-with-dhcpv6-other` and
 * `slaac-only`, and dropped the leased address at once without saying that a
 * real host keeps it until its lifetime runs out.
 */
test('the DHCPv6 lesson names its modes in Japanese and explains the dropped lease', async ({
  page,
  demoPage,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/dhcpv6');

  const mode = page.getByTestId(SEL.demo.slaacMode);
  await expect(mode).toHaveText('モード: DHCPv6 でアドレス取得');

  await page.getByTestId(SEL.demo.dhcpv6FlagM0O1).click();
  await expect(mode).toHaveText('モード: SLAAC ＋ DHCPv6（DNS などだけ）');

  await page.getByTestId(SEL.demo.dhcpv6FlagM0O0).click();
  await expect(mode).toHaveText('モード: SLAAC のみ');

  await expect(page.getByTestId('dhcpv6-lease-note')).toContainText(
    '実際のホストはリース期間が切れるまで',
  );
});

test('the DHCPv6 lesson names its modes in English', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/dhcpv6');

  const mode = page.getByTestId(SEL.demo.slaacMode);
  await page.getByTestId(SEL.demo.dhcpv6FlagM0O1).click();
  await expect(mode).toHaveText('Mode: SLAAC + stateless DHCPv6 (DNS only)');
  await page.getByTestId(SEL.demo.dhcpv6FlagM0O0).click();
  await expect(mode).toHaveText('Mode: SLAAC only');
  await expect(page.getByTestId('dhcpv6-lease-note')).toContainText(
    'real hosts keep it until its lease lifetime expires',
  );
});
