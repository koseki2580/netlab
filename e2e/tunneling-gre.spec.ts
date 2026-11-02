import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('TC-1132: a ping crosses the GRE tunnel, and a changed key stops it', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tunneling/gre');

  await page.getByTestId(SEL.demo.greSend).click();
  await expect(page.getByTestId(SEL.demo.greOuter)).toContainText('proto 47');
  await expect(page.getByTestId(SEL.demo.greShim)).toContainText('100');
  await expect(page.getByTestId(SEL.demo.greInner)).toContainText('10.0.0.10');
  await expect(page.getByTestId(SEL.demo.greStatus)).toContainText('delivers');
  await expect(page.getByTestId(SEL.demo.greHex)).toContainText('47 (GRE)');
  await expect(page.getByTestId(SEL.demo.greHex)).toContainText('Inner Src IP');

  await page.getByTestId(SEL.demo.greKeyChange).click();
  await page.getByTestId(SEL.demo.greSend).click();
  await expect(page.getByTestId(SEL.demo.greStatus)).toContainText('isolated');
});
