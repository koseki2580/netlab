import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('GRE demo shows outer header, GRE key, and inner IP packet', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/tunneling/gre');

  await expect(page.getByTestId(SEL.demo.greOuter)).toContainText('proto 47');
  await expect(page.getByTestId(SEL.demo.greShim)).toContainText('100');
  await expect(page.getByTestId(SEL.demo.greInner)).toContainText('10.0.0.10');

  await page.getByTestId(SEL.demo.greKeyChange).click();
  await expect(page.getByTestId(SEL.demo.greStatus)).toContainText('isolated');
});
