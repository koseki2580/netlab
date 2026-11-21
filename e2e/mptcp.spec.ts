import { expect, test } from './fixtures/harness';

/** REQ-414 — Multipath TCP: predict the Wi-Fi loss, failover, fallback, and bottleneck shares (TC-2188, TC-2189). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2188: losing Wi-Fi 4 s in, MPTCP carries on over LTE and finishes at 12 s; with MP_CAPABLE stripped it breaks like TCP', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mptcp');
  await expect(page.getByTestId('mptcp-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('mptcp-downloads')).toHaveCount(0);
  await page.getByTestId('mptcp-guess-breaks').click();
  await page.getByTestId('mptcp-reveal-button').click();
  await expect(page.getByTestId('mptcp-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('mptcp-time-wifi')).toHaveAttribute('data-seconds', '10');
  await expect(page.getByTestId('mptcp-time-both')).toHaveAttribute('data-seconds', '6.67');
  await expect(page.getByTestId('mptcp-failover-tcp')).toHaveAttribute('data-finished', 'false');
  await expect(page.getByTestId('mptcp-failover-tcp')).toHaveAttribute('data-mb', '20');
  await expect(page.getByTestId('mptcp-failover-mptcp')).toHaveAttribute('data-mb', '30');
  await expect(page.getByTestId('mptcp-failover-mptcp')).toHaveAttribute('data-finish', '12');
  await page.getByTestId('mptcp-option-stripped').click();
  await expect(page.getByTestId('mptcp-failover-mptcp')).toHaveAttribute('data-mode', 'tcp');
  await expect(page.getByTestId('mptcp-failover-mptcp')).toHaveAttribute('data-finished', 'false');
});

test('TC-2189: on a shared bottleneck uncoupled subflows take 67 % (80 % with four), coupled LIA takes 50 %', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mptcp');
  await page.getByTestId('mptcp-guess-slower').click();
  await page.getByTestId('mptcp-reveal-button').click();
  await expect(page.getByTestId('mptcp-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('mptcp-share')).toHaveAttribute('data-pct', '67');
  await expect(page.getByTestId('mptcp-share')).toHaveAttribute('data-mptcp', '20');
  await page.getByTestId('mptcp-subflows').fill('4');
  await expect(page.getByTestId('mptcp-share')).toHaveAttribute('data-pct', '80');
  await page.getByTestId('mptcp-cc-coupled').click();
  await expect(page.getByTestId('mptcp-share')).toHaveAttribute('data-pct', '50');
  await expect(page.getByTestId('mptcp-share')).toHaveAttribute('data-tcp', '15');
});
