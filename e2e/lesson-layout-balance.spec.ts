import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const LAYOUT = {
  timeline: 'lesson-trace-timeline',
  hopDetails: 'lesson-hop-details',
} as const;

/**
 * Panels with content get the room; an empty panel is as tall as its one line.
 * On the trace inspector the timeline was a 39px window over its hops while
 * the empty hop details below held ~400px.
 */
test('the trace inspector shows every hop and keeps the empty details small', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/trace-inspector');
  const timeline = page.getByTestId(LAYOUT.timeline);
  await expect(timeline.locator('[data-step]').last()).toBeVisible();

  const list = await timeline
    .locator('[role="listbox"]')
    .first()
    .evaluate((el) => ({
      shown: el.clientHeight,
      full: el.scrollHeight,
    }));
  expect(list.shown, 'the hop list is not cut off').toBeGreaterThanOrEqual(list.full);

  const details = await page.getByTestId(LAYOUT.hopDetails).boundingBox();
  if (!details) throw new Error('hop details were not measurable');
  expect(details.height).toBeLessThan(140);
});

test('the ARP lesson puts the timeline at the top once a packet has run', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  // Before anything is sent there is no empty timeline taking the rail.
  await expect(page.getByTestId(LAYOUT.timeline)).toHaveCount(0);

  await page.getByTestId(SEL.demo.primaryAction).first().click();
  const box = await page.getByTestId(LAYOUT.timeline).boundingBox();
  if (!box) throw new Error('timeline was not measurable');
  expect(box.y + box.height).toBeLessThanOrEqual(900);
});

test('the UDP send buttons keep their labels on one line in Japanese', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the page falls back to English, which this test would then catch */
    }
  });
  await demoPage.goto('/networking/udp');
  const send = page.getByTestId(SEL.demo.primaryAction).first();
  await expect(send).toHaveText('UDP を送る → ポート 7777');
  const box = await send.boundingBox();
  if (!box) throw new Error('button was not measurable');
  // One line of 12px text plus padding; a wrapped label is twice that.
  expect(box.height).toBeLessThan(40);
});

test('all-in-one names flows by their order and endpoints, not a random hash', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/comprehensive/all-in-one');

  await page.getByTestId('all-in-one-tab-failure').click();
  const send = page.getByTestId('all-in-one-failure-send');
  await send.click();
  await send.click();

  const chips = page.getByTestId('trace-selector-chip');
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0), 'the first flow is ① and names its endpoints').toHaveText(
    /^① .+ → .+/,
  );
  await expect(chips.nth(1)).toHaveText(/^② .+ → .+/);
  await expect(chips.nth(0), 'no hash stands in for a name').not.toHaveText(/#[0-9a-f]{6,}/);
});
