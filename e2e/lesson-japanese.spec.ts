import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-166 — a lesson translated into Japanese leaves no English prose behind.
 *
 * Lesson copy is translated lesson by lesson, so this names the lessons that
 * have been done and holds each of them to it. A line counts as prose when it
 * has four or more English words and no Japanese — which is what a learner
 * reads as an untranslated sentence, provided at least two of those words are
 * ordinary lower-case ones. Readouts such as
 * "10.0.0.10 → 203.0.113.10 | TTL 64 | TCP", hop codes, protocol and device
 * names are not prose and are rightly left as they are.
 *
 * Each lesson is opened and its primary action pressed first, so panels that
 * only appear once a packet has run are read as well.
 */
const TRANSLATED_LESSONS = [
  '/basic/minimal',
  '/basic/three-tier',
  '/basic/star',
  '/routing/client-server',
  '/networking/arp',
  '/networking/udp',
  '/simulation/tcp-handshake',
  '/routing/dynamic',
  '/networking/vlan',
  '/simulation/session',
  '/networking/http',
  '/services/dhcp-dns',
  '/networking/multicast',
  '/networking/stp',
];

for (const path of TRANSLATED_LESSONS) {
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

    const prose = await page.locator('body').evaluate((body: HTMLElement) =>
      body.innerText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(
          (line: string) =>
            !/[ぁ-んァ-ヶ一-龯]/.test(line) &&
            (line.match(/[A-Za-z]{2,}/g) ?? []).length >= 4 &&
            // Prose has ordinary lower-case words. A line made only of names,
            // codes and acronyms — "Host B → Switch B → Switch A" — is a readout.
            (line.match(/\b[a-z]{2,}\b/g) ?? []).length >= 2,
        ),
    );

    expect(prose, 'no English sentence remains').toEqual([]);
  });
}
