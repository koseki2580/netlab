import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-280, TC-281, TC-282 — the congestion lesson shows how each loss event's
 * numbers were worked out.
 *
 * The readout gave ssthresh 2000 B at step 9 and again at step 12 without the
 * rule that produced it, so a reader could not tell why a second loss left the
 * threshold where it was.
 */
test('the congestion lesson works out ssthresh and cwnd at each loss event', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/simulation/tcp-congestion');
  await page.getByTestId(SEL.demo.tcpCongestionRun).click();

  const readout = page.getByTestId('tcp-congestion-readout');
  const working = page.getByTestId('tcp-congestion-working');
  const step = page.getByTestId('tcp-congestion-step');

  // TC-282: the trace opens on the timeout.
  await expect(readout).toContainText('Step 12 of 12');
  await expect(working).toHaveText(
    'ssthresh = max(max(in flight, cwnd) ÷ 2, 2 × MSS) = max(max(2000, 2000) ÷ 2, 2 × 1000) = max(1000, 2000) = 2000 B, so it does not change. cwnd = 1 × MSS = 1000 B.',
  );

  // A step that changes neither has no working.
  await step.fill('11');
  await expect(readout).toContainText('Step 11 of 12');
  await expect(working).toHaveCount(0);

  // TC-281
  await step.fill('10');
  await expect(working).toHaveText(
    'The new ACK ends fast recovery: cwnd deflates to ssthresh = 2000 B.',
  );

  // TC-280
  await step.fill('9');
  await expect(working).toHaveText(
    'ssthresh = max(max(in flight, cwnd) ÷ 2, 2 × MSS) = max(max(4000, 4000) ÷ 2, 2 × 1000) = max(2000, 2000) = 2000 B. cwnd = ssthresh + 3 × MSS = 2000 + 3 × 1000 = 5000 B.',
  );
  await expect(readout).toContainText('cwnd 5000 B');
  await expect(readout).toContainText('ssthresh 2000 B');
});
