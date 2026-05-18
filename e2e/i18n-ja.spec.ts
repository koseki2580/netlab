import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('Gallery locale toggle switches to Japanese and persists', async ({ page, galleryPage }) => {
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toContainText('Demo gallery');

  await galleryPage.toggleJapaneseLocale();
  await expect(page.getByTestId(SEL.gallery.heading)).toContainText('デモギャラリー');

  await page.reload();
  await expect(page.getByTestId(SEL.gallery.heading)).toContainText('デモギャラリー');
});
