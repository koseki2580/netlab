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
  // So do the canvas's own controls, the part every lesson shows.
  await expect(page.getByTestId(SEL.maxGraph.fit)).toHaveText('全体');
  await expect(page.getByTestId(SEL.maxGraph.fit)).toHaveAttribute(
    'aria-label',
    '図全体を画面に収める',
  );
  // The codes a learner looks up by name stay as they are.
  await expect(page.getByTestId(SEL.traceFilter.hop).filter({ hasText: 'DELIVER' })).toHaveCount(1);
});

/** TC-157 — and with no choice made, it is English exactly as before. */
test('a lesson with no language chosen stays in English', async ({ page, demoPage }) => {
  await openClientServer(page, demoPage, null);

  const timeline = page.getByTestId(SEL.demo.traceLog);
  await expect(timeline).toContainText('PACKET TIMELINE');
  await expect(timeline).toContainText('Download PCAP');
  await expect(page.getByTestId(SEL.maxGraph.fit)).toHaveText('fit');
});

/**
 * TC-160 — the lesson's own name and summary are in the chosen language.
 *
 * The gallery showed a lesson as 「スパニングツリー」, and opening it put
 * "Spanning Tree" at the top of the page. The header now reads from the same
 * translations the gallery card does, so the two cannot drift apart.
 */
test('a lesson is named in the language chosen in the gallery', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

  await expect(page.getByTestId(SEL.shell.title)).toHaveText('スパニングツリー');
  await expect(page.getByTestId(SEL.shell.desc)).toHaveText(/[ぁ-んァ-ヶ一-龯]/);
  await expect(page).toHaveTitle(/スパニングツリー/);
});

/**
 * TC-163 — the command bar and area legend follow the choice too.
 *
 * "▶ Send Packet" is the first thing a learner presses on the client-server
 * lesson, and it stayed English on a Japanese page.
 */
test('the command bar and area legend follow the chosen language', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(SEL.demo.primaryAction).first()).toHaveText('▶ パケットを送る');
  await expect(page.getByTestId(SEL.canvas.areaLegend)).toContainText('ネットワークの区画');
});

/**
 * TC-164 — a beginner lesson's own brief is in the chosen language.
 *
 * The shared panels reach every lesson at once; a lesson's teaching copy does
 * not, so it is translated lesson by lesson, beginner lessons first.
 */
test('the ARP lesson teaches in the chosen language', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const brief = page.getByTestId(SEL.lesson.brief);
  await expect(brief).toContainText('ARP のしくみ');
  await expect(brief).not.toContainText('ARP Teaching Flow');
  await expect(page.getByTestId(SEL.demo.primaryAction)).toHaveText('client から server へ ping');
});

/**
 * TC-165 — the result panels read in the chosen language: the packet viewer
 * over the canvas, and the trace summary a lesson shows once a packet has run.
 */
test('the result panels follow the chosen language', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });

  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  await expect(page.getByTestId(SEL.results.packetViewer)).toContainText('パケットの中身');

  await demoPage.goto('/networking/udp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  await page.getByTestId(SEL.demo.primaryAction).click();
  const summary = page.getByTestId(SEL.results.traceSummary);
  await expect(summary).toContainText('通信のまとめ');
  await expect(summary).toContainText('届いた');
});

/**
 * TC-167 — the short labels too: the failure panel and the state-diff table.
 *
 * The prose guard (TC-166) reads sentences, and these are one or two words —
 * "Toggle", "Reset All", "now / diff / history" — which is exactly what it
 * would let through.
 */
test('the failure panel and state-diff table follow the chosen language', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });

  await demoPage.goto('/simulation/session');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  const failures = page.getByTestId(SEL.results.failurePanel);
  await expect(failures).toContainText('障害を起こす');
  await expect(failures).toContainText('すべて戻す');
  await expect(failures).not.toContainText('Toggle');

  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  await page.getByTestId(SEL.demo.primaryAction).click();
  await expect(page.getByTestId(SEL.results.diffMode('diff'))).toHaveText('差分');
});

/**
 * TC-169 — the device detail panel reads in Japanese, tab by tab.
 *
 * Pressing a device is how a learner reads its addresses, its interfaces and
 * its routes, so it is the panel they open most; it is also the largest one,
 * with a tab strip whose later tabs only render once they are chosen.
 */
test('the device detail panel is Japanese on every tab', async ({ page, demoPage }) => {
  await openClientServer(page, demoPage, 'ja');

  await page.getByTestId(SEL.canvas.node).first().click();
  const panel = page.locator('[data-netlab-dp]');
  await expect(panel).toBeVisible();

  const tabs = panel.locator('[data-netlab-dp-tab]');
  const tabCount = await tabs.count();
  expect(tabCount, 'the panel offers its tabs').toBeGreaterThan(0);

  for (let index = 0; index < tabCount; index += 1) {
    const tab = tabs.nth(index);
    await expect(tab, 'the tab is named in Japanese').toHaveText(/[ぁ-んァ-ヶ一-龯]/);
    await tab.click();
    const prose = await panel.evaluate((el: HTMLElement) =>
      el.innerText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(
          (line: string) =>
            !/[ぁ-んァ-ヶ一-龯]/.test(line) &&
            (line.match(/[A-Za-z]{2,}/g) ?? []).length >= 4 &&
            (line.match(/\b[a-z]{2,}\b/g) ?? []).length >= 2,
        ),
    );
    expect(prose, 'no English sentence remains on this tab').toEqual([]);
  }
});
