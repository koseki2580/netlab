import { expect, test } from './fixtures/harness';

/**
 * TC-981 — the multi-hop lesson runs the simulator's traceroute and lists one
 * row per probe: each router that answered "time exceeded", then the server.
 */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('traceroute lists R-1, R-2, then the server', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/multi-hop');
    const panel = page.getByTestId('traceroute');
    await expect(panel).toContainText('as Windows tracert does');
    await panel.getByTestId('traceroute-run').click();

    await expect(panel.getByTestId('traceroute-row-1')).toHaveText(
      'TTL 1: R-1 (10.0.0.1) — time exceeded',
    );
    await expect(panel.getByTestId('traceroute-row-2')).toHaveText(
      'TTL 2: R-2 (172.16.0.2) — time exceeded',
    );
    await expect(panel.getByTestId('traceroute-row-3')).toHaveText(
      'TTL 3: Server (203.0.113.10) — echo reply: the destination',
    );
    await expect(panel.getByRole('listitem')).toHaveCount(3);
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('the rows read in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/multi-hop');
    const panel = page.getByTestId('traceroute');
    await expect(panel).toContainText('Windows の tracert と同じく ICMP エコーで調べます');
    await panel.getByTestId('traceroute-run').click();
    await expect(panel.getByTestId('traceroute-row-1')).toHaveText(
      'TTL 1: R-1 (10.0.0.1) — 時間超過 (time exceeded)',
    );
    await expect(panel.getByTestId('traceroute-row-3')).toHaveText(
      'TTL 3: Server (203.0.113.10) — エコー応答: 宛先',
    );
  });
});

test.describe('phone', () => {
  test.use({ appLocale: 'en', viewportPreset: 'phone' });

  test('the traceroute panel fits a phone screen and still runs', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/multi-hop');
    const run = page.getByTestId('traceroute-run');
    await run.scrollIntoViewIfNeeded();
    await run.tap();
    await expect(page.getByTestId('traceroute-row-3')).toContainText('Server');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
