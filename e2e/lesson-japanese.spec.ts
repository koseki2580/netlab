import type { Page } from '@playwright/test';
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

/**
 * TC-531 — the hands-on exercises are not in a gallery category, so they are
 * listed here: the hub, a level, and one exercise of each kind (set a value,
 * configure a switch, choose a design). An exercise is read with a hint open
 * and after a failed Check, because the reasons a goal was missed and the
 * hints are most of what a learner reads there.
 */
const EXERCISE_PAGES = [
  '/exercises',
  '/exercises/level/1',
  '/exercises/level/2',
  '/exercises/placement',
  '/exercises/report',
  '/exercises/do/l1-host-address~0',
  '/exercises/do/l2-vlan-separate~0',
  '/exercises/do/l2-acl-permit~0',
  '/exercises/do/l1-choose-address~0',
];

async function chooseJapanese(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
}

/** The lines of the page a Japanese learner would read as an untranslated sentence. */
async function englishProse(page: Page): Promise<string[]> {
  return page.locator('body').evaluate((body: HTMLElement) => {
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
          // Prose has ordinary lower-case words, and different ones. A line
          // made only of names, codes and acronyms — "Host B → Switch B →
          // Switch A" — is a readout, and so is an address that repeats one
          // token, "ff:ff:ff:ff:ff:ff".
          new Set(line.match(/\b[a-z]{2,}\b/g) ?? []).size >= 2,
      );
  });
}

for (const path of EXERCISE_PAGES) {
  test(`no English prose on ${path} in Japanese`, async ({ page, demoPage }) => {
    await chooseJapanese(page);
    await demoPage.goto(path);
    await expect(page.getByTestId(SEL.app.root)).toBeVisible();

    if (path.startsWith('/exercises/do/')) {
      const X = SEL.exercises;
      await expect(page.getByTestId(X.check)).toBeVisible();
      if ((await page.getByTestId(X.settings).count()) === 0) {
        // A design is run, so that its explanation and the prediction's outcome are read.
        await page.getByTestId(X.check).click();
        await expect(page.getByTestId(X.designNeeded)).toBeVisible();
        expect(await englishProse(page), 'no English sentence remains').toEqual([]);
        await page.getByTestId(X.option('duplicate')).click();
        await page.getByTestId(X.predict('reach')).click();
      }
      // Hints are offered only after a Check that did not pass.
      await page.getByTestId(X.check).click();
      await expect(page.getByTestId(X.result)).toHaveAttribute('data-passed', 'false');
      // Every hint, the offer of the answer, and then the answer itself.
      while ((await page.getByTestId(X.hint).count()) > 0) await page.getByTestId(X.hint).click();
      await expect(page.getByTestId(X.hintText(3))).toBeVisible();
      await page.getByTestId(X.giveUp).click();
      await page.getByTestId(X.giveUpYes).click();
      await expect(page.getByTestId(X.reference)).toBeVisible();
    } else {
      // The words that prove the page is the one meant, and is in Japanese.
      await expect(page.getByTestId(SEL.app.root)).toContainText(/レベル|記録/);
    }

    // Something Japanese was read: an empty page would pass the check below.
    expect(await page.getByTestId(SEL.app.root).innerText()).toMatch(/[ぁ-ん]{3,}/);
    expect(await englishProse(page), 'no English sentence remains').toEqual([]);
  });
}

for (const path of LESSONS) {
  test(`no English prose on ${path} in Japanese`, async ({ page, demoPage }) => {
    await chooseJapanese(page);
    await demoPage.goto(path);
    await expect(page.getByTestId(SEL.app.root)).toBeVisible();

    const primary = page.getByTestId(SEL.demo.primaryAction).first();
    // Some lessons' shared step control claims the id but starts disabled,
    // waiting for their own button; pressing it would only wait out the timeout.
    if ((await primary.count()) > 0 && (await primary.isEnabled())) {
      await primary.click();
      await page.waitForTimeout(800);
    }

    expect(await englishProse(page), 'no English sentence remains').toEqual([]);
  });
}
