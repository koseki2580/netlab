import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-219, TC-220, TC-221 — the congestion chart can be read step by step.
 *
 * The chart had no byte values, started cwnd at 0 rather than its 2000-byte
 * initial window, and its header showed only the final state, so a learner
 * could not check a single number the lesson (or its exam question) asks
 * about. Event names reached the page as trace identifiers.
 */
test('the congestion lesson reads out cwnd and ssthresh at the step chosen', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/simulation/tcp-congestion');
  await page.getByTestId(SEL.demo.tcpCongestionRun).click();

  const readout = page.getByTestId('tcp-congestion-readout');
  const step = page.getByTestId('tcp-congestion-step');
  await expect(readout).toContainText('Step 12 of 12');
  await expect(readout).toContainText('cwnd 1000 B');

  // TC-219: the byte axis is labelled.
  const chart = page.getByTestId(SEL.demo.tcpCongestionChart);
  const ticks = chart.getByTestId('tcp-congestion-ytick');
  for (const bytes of ['1000', '2000', '3000', '5000']) {
    await expect(ticks.filter({ hasText: new RegExp(`^${bytes}$`) })).toHaveCount(1);
  }

  // TC-220: the line starts at the initial window, 2000 bytes.
  await step.fill('0');
  await expect(readout).toContainText('Step 0 of 12');
  await expect(readout).toContainText('Slow Start');
  await expect(readout).toContainText('cwnd 2000 B');
  await expect(readout).toContainText('ssthresh 4000 B');

  await step.fill('9');
  await expect(readout).toContainText('Fast Recovery');
  await expect(readout).toContainText('cwnd 5000 B');
  await expect(readout).toContainText('ssthresh 2000 B');

  await step.fill('10');
  await expect(readout).toContainText('cwnd 2000 B');

  // TC-221: events are named in words.
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(9, 'fast-retransmit'))).toContainText(
    'Fast retransmit',
  );
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(12, 'rto-fire'))).toContainText(
    'Retransmission timeout',
  );
  await expect(page.locator('main').first()).not.toContainText('fast-retransmit');
  await expect(page.locator('main').first()).not.toContainText('`');
});
