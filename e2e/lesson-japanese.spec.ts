import { CATEGORIES, expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-166 — with Japanese chosen, no lesson leaves English prose behind.
 *
 * Every lesson in the gallery is opened, and the compare view besides. A line
 * counts as prose when it has four or more English words and no Japanese —
 * which is what a learner reads as an untranslated sentence, provided at least
 * two of those words are ordinary lower-case ones. Readouts such as
 * "10.0.0.10 → 203.0.113.10 | TTL 64 | TCP", hop codes, protocol and device
 * names are not prose and are rightly left as they are.
 *
 * Each lesson is opened and its primary action pressed first, so panels that
 * only appear once a packet has run are read as well.
 */
const LESSONS = [
  ...CATEGORIES.flatMap((category) => category.demos.map((demo) => demo.path)),
  '/compare/ospf-convergence/rip-convergence',
];

for (const path of LESSONS) {
  test(`no English prose on ${path} in Japanese`, async ({ page, demoPage }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('netlab-locale', 'ja');
      } catch {
        /* no storage means no choice, which this test would then catch */
      }
    });
    await demoPage.goto(path);
    await expect(page.getByTestId(SEL.app.root)).toBeVisible();

    const primary = page.getByTestId(SEL.demo.primaryAction).first();
    // Some lessons' shared step control claims the id but starts disabled,
    // waiting for their own button; pressing it would only wait out the timeout.
    if ((await primary.count()) > 0 && (await primary.isEnabled())) {
      await primary.click();
      await page.waitForTimeout(800);
    }

    const prose = await page.locator('body').evaluate((body: HTMLElement) => {
      // Code and data a lesson shows are not prose: a JSX snippet, a topology's
      // JSON, a payload typed into a box and a key name stay as they are.
      body.querySelectorAll('pre, code, textarea, kbd').forEach((el) => el.remove());
      return body.innerText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(
          (line: string) =>
            !/[ぁ-んァ-ヶ一-龯]/.test(line) &&
            (line.match(/[A-Za-z]{2,}/g) ?? []).length >= 4 &&
            // Prose has ordinary lower-case words. A line made only of names,
            // codes and acronyms — "Host B → Switch B → Switch A" — is a readout.
            (line.match(/\b[a-z]{2,}\b/g) ?? []).length >= 2,
        );
    });

    expect(prose, 'no English sentence remains').toEqual([]);
  });
}
