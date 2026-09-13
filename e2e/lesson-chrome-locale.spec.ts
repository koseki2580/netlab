import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * The panels every lesson shares — the packet timeline among them — were the
 * English left on a lesson after a learner chose 日本語 in the gallery. They
 * are one set of components used by every lesson, so translating them once
 * reaches all of them. Hop events stay as codes: the guide documents CREATE,
 * FWD, DELIVER and DROP by name.
 */
async function openClientServer(
  page: import('@playwright/test').Page,
  demoPage: import('./pages/DemoPage').DemoPage,
  locale: 'ja' | null,
) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((chosen) => {
    try {
      if (chosen) window.localStorage.setItem('netlab-locale', chosen);
      else window.localStorage.removeItem('netlab-locale');
    } catch {
      /* no storage means no choice, which is the English case */
    }
  }, locale);
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  await page.getByTestId(SEL.demo.primaryAction).first().click();
  await expect(page.getByTestId(SEL.traceFilter.hop).first()).toBeVisible();
}

/** TC-156 — with Japanese chosen, the shared lesson panels are Japanese. */
test('a lesson follows the language chosen in the gallery', async ({ page, demoPage }) => {
  await openClientServer(page, demoPage, 'ja');

  const timeline = page.getByTestId(SEL.demo.traceLog);
  await expect(timeline).toContainText('パケットタイムライン');
  await expect(timeline).toContainText('PCAP を保存');
  await expect(timeline).not.toContainText('PACKET TIMELINE');
  // The codes a learner looks up by name stay as they are.
  await expect(page.getByTestId(SEL.traceFilter.hop).filter({ hasText: 'DELIVER' })).toHaveCount(1);
});

/** TC-157 — and with no choice made, it is English exactly as before. */
test('a lesson with no language chosen stays in English', async ({ page, demoPage }) => {
  await openClientServer(page, demoPage, null);

  const timeline = page.getByTestId(SEL.demo.traceLog);
  await expect(timeline).toContainText('PACKET TIMELINE');
  await expect(timeline).toContainText('Download PCAP');
});
