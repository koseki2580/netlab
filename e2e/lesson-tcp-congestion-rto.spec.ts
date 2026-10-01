import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-255, TC-256 — the end of the congestion trace is one a real sender could
 * produce.
 *
 * Step 11 put 2000 bytes in flight as a single "segment" on a 1000-byte MSS,
 * and step 12 read "in flight 0 B" at the very moment the timer fired for
 * data nobody had acknowledged.
 */
test('the congestion lesson keeps the lost bytes in flight at the timeout', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/simulation/tcp-congestion');
  await page.getByTestId(SEL.demo.tcpCongestionRun).click();

  const readout = page.getByTestId('tcp-congestion-readout');
  const step = page.getByTestId('tcp-congestion-step');

  // The trace opens on its last step, the timeout.
  await expect(readout).toContainText('Step 12 of 12');
  await expect(readout).toContainText('RTO');
  await expect(readout).toContainText('cwnd 1000 B');
  await expect(readout).toContainText('ssthresh 2000 B');
  await expect(readout).toContainText('in flight 2000 B');
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(12, 'rto-fire'))).toContainText(
    'the oldest unacknowledged segment, 9001, is resent',
  );

  await step.fill('11');
  await expect(readout).toContainText('cwnd 2000 B');
  await expect(readout).toContainText('ssthresh 2000 B');
  await expect(readout).toContainText('in flight 2000 B');
});
