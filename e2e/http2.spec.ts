import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('HTTP/2 demo shows multiplexing and TCP transport HOL', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/http2');

  await expect(page.getByTestId(SEL.demo.h2DataFrame).first()).toContainText('stream=1');

  await page.getByTestId(SEL.demo.h2TcpLossToggle).click();
  await expect(page.getByTestId(SEL.demo.h2Stream(1))).toContainText('stalled');
  await expect(page.getByTestId(SEL.demo.h2Stream(3))).toContainText('stalled');
  await expect(page.getByTestId(SEL.demo.h2Stream(5))).toContainText('stalled');
  await expect(page.getByTestId(SEL.demo.h2Stream(7))).toContainText('stalled');
});
