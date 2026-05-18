import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('HTTP/3 demo keeps unaffected QUIC streams moving', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/http3');

  // h3 frame log lives inside the demo's trace region.
  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('h3:frame(SETTINGS)');

  await page.getByTestId(SEL.demo.h3StreamLossToggle).click();
  await expect(page.getByTestId(SEL.demo.h3Stream(4))).toContainText('stalled');
  await expect(page.getByTestId(SEL.demo.h3Stream(0))).toContainText('complete');
  await expect(page.getByTestId(SEL.demo.h3Stream(8))).toContainText('complete');
});
