import { expect, test } from './fixtures/harness';

/** REQ-444 — SCTP: predict the failover time and the messages a loss delays (TC-2568). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2568: the defaults fail over after 63 s, Path.Max.Retrans 2 after 7 s, and a loss on stream 1 delays only stream 1', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/sctp');
  await expect(page.getByTestId('sctp-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('sctp-timeouts')).toHaveCount(0);
  await page.getByTestId('sctp-guess-thirty-one').click();
  await page.getByTestId('sctp-reveal-button').click();
  await expect(page.getByTestId('sctp-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('sctp-failover')).toHaveAttribute('data-failover-ms', '63000');
  await expect(page.getByTestId('sctp-timeout-6')).toHaveAttribute('data-at', '63000');
  await page.getByTestId('sctp-pmr').fill('2');
  await expect(page.getByTestId('sctp-failover')).toHaveAttribute('data-failover-ms', '7000');

  await expect(page.getByTestId('sctp-hol-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('sctp-hol-table')).toHaveCount(0);
  await page.getByTestId('sctp-hol-guess-all').click();
  await page.getByTestId('sctp-hol-reveal-button').click();
  await expect(page.getByTestId('sctp-hol-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('sctp-msg-A3')).toHaveAttribute('data-sctp-delay', '160');
  await expect(page.getByTestId('sctp-msg-B1')).toHaveAttribute('data-sctp-delay', '0');
  await expect(page.getByTestId('sctp-msg-B1')).toHaveAttribute('data-tcp-delay', '190');
  await page.getByTestId('sctp-lose-B2').click();
  await expect(page.getByTestId('sctp-msg-B3')).toHaveAttribute('data-sctp-delay', '180');
  await expect(page.getByTestId('sctp-msg-A3')).toHaveAttribute('data-sctp-delay', '0');
});

test('TC-2661: after the reveal, lowering only RTO.Min to 100 ms reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/sctp');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('sctp-guess-five').click();
  await page.getByTestId('sctp-reveal-button').click();
  const first = page.getByTestId('challenge-rto-min-only');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-rto-min-only-hint')).toHaveCount(0);
  await page.getByTestId('challenge-rto-min-only-hint-button').click();
  await expect(page.getByTestId('challenge-rto-min-only-hint')).toBeVisible();
  await page.getByTestId('sctp-rto-min').fill('100');
  await expect(page.getByTestId('sctp-failover')).toHaveAttribute('data-failover-ms', '6300');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-rto-min-only-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
