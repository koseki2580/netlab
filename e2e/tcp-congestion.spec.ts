import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('tcp congestion demo renders deterministic phase transitions', async ({ page, demoPage }) => {
  await demoPage.goto('/simulation/tcp-congestion');

  await expect(page.getByTestId(SEL.canvas.root).first()).toBeAttached();
  await expect(page.getByTestId(SEL.demo.tcpCongestionChart)).toBeVisible();
  // The element existing IS the assertion: step 9 produced a fast retransmit.
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(9, 'fast-retransmit'))).toBeVisible();
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(12, 'rto-fire'))).toBeVisible();

  await page.getByTestId(SEL.demo.tcpCongestionReset).click();
  await expect(page.getByTestId(SEL.demo.tcpCongestionEmpty)).toBeVisible();

  await page.getByTestId(SEL.demo.tcpCongestionRun).click();
  await expect(page.getByTestId(SEL.demo.tcpCongestionEvent(9, 'fast-retransmit'))).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
