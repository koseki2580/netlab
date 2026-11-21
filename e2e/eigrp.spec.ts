import { expect, test } from './fixtures/harness';

/** REQ-411 — EIGRP's DUAL: predict the feasible successors, fail the successor, change C (TC-2158, TC-2159). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2158: B and D are feasible successors, C is not, and losing A switches to B with no queries', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/eigrp');
  await expect(page.getByTestId('eigrp-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('eigrp-fail')).toHaveCount(0);
  await page.getByTestId('eigrp-guess-bcd').click();
  await page.getByTestId('eigrp-reveal-button').click();
  await expect(page.getByTestId('eigrp-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('eigrp-reveal')).toHaveAttribute('data-fs', 'bd');
  const failover = page.getByTestId('eigrp-failover');
  await expect(failover).toHaveAttribute('data-state', 'passive');
  await expect(failover).toHaveAttribute('data-queried', '');
  await expect(failover).toHaveAttribute('data-new-successor', 'B');
  await expect(failover).toHaveAttribute('data-new-distance', '33');
  await page.getByTestId('eigrp-c-cost').fill('28');
  await expect(page.getByTestId('eigrp-whatif-result')).toHaveAttribute('data-fs', 'B,C,D');
});

test('TC-2159: without a feasible successor R1 queries C, X and Y, picks C at 36, and X’s loop is excluded', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/eigrp');
  await page.getByTestId('eigrp-guess-bd').click();
  await page.getByTestId('eigrp-reveal-button').click();
  await expect(page.getByTestId('eigrp-reveal')).toHaveAttribute('data-right', 'true');
  await page.getByTestId('eigrp-tab-no-fs').click();
  const failover = page.getByTestId('eigrp-failover');
  await expect(failover).toHaveAttribute('data-state', 'active');
  await expect(failover).toHaveAttribute('data-queried', 'C,X,Y');
  await expect(failover).toHaveAttribute('data-new-successor', 'C');
  await expect(failover).toHaveAttribute('data-new-distance', '36');
  await expect(page.getByTestId('eigrp-loop')).toHaveAttribute('data-path', 'R1>X>Y>R1');
});
