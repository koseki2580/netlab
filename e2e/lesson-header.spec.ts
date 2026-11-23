import { expect, test } from './fixtures/harness';

/**
 * REQ-424 (f)(g) — the lesson page's own text reads in a sans-serif system font,
 * and on a wide screen a long description gives way before the name or the title
 * does: a review found "netlab" under its icon and titles broken mid-word at 1280 px.
 */

/** How many lines an element's text is laid out on. */
async function lineCount(locator: import('@playwright/test').Locator): Promise<number> {
  return locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const tops = new Set(
      [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
    );
    return tops.size;
  });
}

const LONG_TITLES = [
  '/networking/redistribution',
  '/networking/wifi-roaming',
  '/networking/pim',
  '/networking/access-security',
  '/networking/tcp-options',
];

test.use({ viewport: { width: 1280, height: 720 } });

for (const locale of ['en', 'ja'] as const) {
  test.describe(`in ${locale}`, () => {
    test.use({ appLocale: locale });

    for (const path of LONG_TITLES) {
      test(`TC-2336: the header of ${path} keeps netlab and the title on one line each`, async ({
        page,
        demoPage,
      }) => {
        await demoPage.goto(path);
        const title = page.getByTestId('demo-shell-title');
        await expect(title).toBeVisible();
        expect(await lineCount(title)).toBe(1);
        expect(await lineCount(page.getByTestId('demo-shell-brand'))).toBe(1);
      });
    }
  });
}

test('TC-2335: lesson text without a font of its own is a sans-serif system font', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/l4s');
  await expect(page.getByTestId('demo-shell-title')).toBeVisible();
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(/sans-serif/);
  expect(family).not.toMatch(/Times/);
});
