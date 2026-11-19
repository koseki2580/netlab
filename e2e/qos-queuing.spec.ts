import { expect, test } from './fixtures/harness';

/** REQ-388 — QoS queuing: policing vs shaping, then FIFO vs LLQ on a congested link (TC-1926, TC-1927). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1926: the policer drops 380 packets and delays none; the shaper drops none and holds up to 180.8 ms', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/qos-queuing');
  await expect(page.getByTestId('qq-condition-button')).toBeDisabled();
  await page.getByTestId('qq-guess-shaper-drops').click();
  await page.getByTestId('qq-condition-button').click();
  await expect(page.getByTestId('qq-condition-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('qq-police-delivered')).toHaveText('245 / 625');
  await expect(page.getByTestId('qq-police-dropped')).toHaveText('380');
  await expect(page.getByTestId('qq-police-delay')).toHaveText('0.0 ms');
  await expect(page.getByTestId('qq-shape-delivered')).toHaveText('625 / 625');
  await expect(page.getByTestId('qq-shape-dropped')).toHaveText('0');
  await expect(page.getByTestId('qq-shape-delay')).toHaveText('181 ms');
  await expect(page.getByTestId('qq-shape-queue')).toHaveText('114 KB');
  await expect(page.getByTestId('qq-shape-rate')).toHaveText('3.75 Mbit/s');
  await page.getByTestId('qq-view-shape').click();
  await expect(page.getByTestId('qq-view-shape')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('qq-condition-chart')).toBeVisible();
});

test('TC-1927: voice waits 121 ms in FIFO, 1.3 ms with LLQ; the priority policer keeps bulk at 8 Mbit/s', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/qos-queuing');
  await expect(page.getByTestId('qq-delay-button')).toBeDisabled();
  await page.getByTestId('qq-delay-120').click();
  await page.getByTestId('qq-delay-button').click();
  await expect(page.getByTestId('qq-delay-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('qq-voice-delay')).toHaveText('121 ms');
  await expect(page.getByTestId('qq-voice-loss')).toHaveText('3 %');
  await page.getByTestId('qq-sched-llq').click();
  await expect(page.getByTestId('qq-voice-delay')).toHaveText('1.3 ms');
  await expect(page.getByTestId('qq-voice-loss')).toHaveText('0 %');
  await expect(page.getByTestId('qq-bulk-rate')).toHaveText('9.0 Mbit/s');
  await page.getByTestId('qq-rogue').check();
  await expect(page.getByTestId('qq-bulk-rate')).toHaveText('8.0 Mbit/s');
  await expect(page.getByTestId('qq-rogue-rate')).toHaveText('1.1 Mbit/s');
  await page.getByTestId('qq-sched-priority-unpoliced').click();
  await expect(page.getByTestId('qq-bulk-rate')).toHaveText('1.0 Mbit/s');
  await expect(page.getByTestId('qq-voice-loss')).toHaveText('0 %');
});
