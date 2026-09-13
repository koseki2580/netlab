import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { SEL } from './selectors';

/**
 * The guide has to survive being zipped and sent to someone, so it is opened
 * the way they would open it: a `file://` URL, with no server behind it and the
 * network refused. That is why these do not use the demo harness.
 */
const GUIDE_URL = pathToFileURL(resolve('docs/user-guide/site/index.html')).href;

/** TC-147 — the guide opens from a file and asks the network for nothing. */
test('the guide opens offline from a file', async ({ page }) => {
  const requested: string[] = [];
  await page.route(/^https?:\/\//, async (route) => {
    requested.push(route.request().url());
    await route.abort();
  });

  await page.goto(GUIDE_URL);

  await expect(page.locator(SEL.guide.title)).toContainText('netlab');
  await expect(page.locator(SEL.guide.section).first()).toBeVisible();
  expect(requested, 'the guide makes no network request').toEqual([]);
});

/** TC-148 — it can be read in Japanese and in English. */
test('the guide switches between Japanese and English', async ({ page }) => {
  await page.goto(GUIDE_URL);

  // Headings rather than "any Japanese character": the English guide rightly
  // names the 日本語 option, so a character test cannot tell the two apart.
  await page.locator(SEL.guide.language).selectOption('ja');
  await expect(page.locator(SEL.guide.content)).toContainText('入門コース');
  await expect(page.locator(SEL.guide.content)).not.toContainText('Getting started');

  await page.locator(SEL.guide.language).selectOption('en');
  await expect(page.locator(SEL.guide.content)).toContainText('Getting started');
  await expect(page.locator(SEL.guide.content)).not.toContainText('入門コース');
});

/** TC-149 — it can be searched with no server doing the searching. */
test('the guide searches its own sections', async ({ page }) => {
  await page.goto(GUIDE_URL);
  await page.locator(SEL.guide.language).selectOption('en');

  const sections = page.locator(SEL.guide.section);
  const total = await sections.count();
  expect(total).toBeGreaterThan(1);

  await page.locator(SEL.guide.search).fill('pcap');
  await expect(sections).not.toHaveCount(total);
  await expect(page.locator(SEL.guide.content)).toContainText(/pcap/i);

  await page.locator(SEL.guide.search).fill('');
  await expect(sections).toHaveCount(total);
});

/** TC-150 — and in either theme. */
test('the guide switches between light and dark', async ({ page }) => {
  await page.goto(GUIDE_URL);

  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.locator(SEL.guide.themeToggle).click();

  await expect(html).not.toHaveAttribute('data-theme', before ?? '');
  expect(['light', 'dark']).toContain(await html.getAttribute('data-theme'));
});
