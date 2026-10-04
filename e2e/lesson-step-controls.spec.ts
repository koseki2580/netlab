import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * The step controls and the timeline every beginner lesson shares, as five
 * learners with no IT background met them: the step button slid down with each
 * press, the idle hint named a button that was not on the screen, the status
 * never said the packet had arrived, play did nothing after a send, and the
 * timeline opened with a display filter.
 */
const TID = {
  control: 'step-controls',
  step: 'demo-step-action',
  readout: 'step-readout',
  hint: 'step-hint',
  idleHint: 'step-idle-hint',
  history: 'step-history',
  status: 'sim-status',
  play: 'sim-play',
  pause: 'sim-pause',
  stepIcon: 'sim-step',
  reset: 'sim-reset',
  advancedToggle: 'trace-advanced-toggle',
  viewer: 'packet-viewer-panel',
};

type Page = import('@playwright/test').Page;

async function inJapanese(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means English, which the assertions below would then catch */
    }
  });
}

async function pressesKeepTheirPlace(page: Page) {
  await page.getByTestId(SEL.demo.primaryAction).first().click();
  const step = page.getByTestId(TID.step);
  await step.scrollIntoViewIfNeeded();

  await step.click();
  await expect(page.getByTestId(TID.readout)).toContainText('10 個のうち 1 番目');
  const afterOne = await step.boundingBox();

  for (let press = 2; press <= 5; press += 1) {
    await step.click();
  }
  await expect(page.getByTestId(TID.readout)).toContainText('10 個のうち 5 番目');
  const afterFive = await step.boundingBox();

  expect(afterFive?.x).toBe(afterOne?.x);
  expect(afterFive?.y).toBe(afterOne?.y);
  await expect(step).toBeInViewport({ ratio: 1 });
  // The history is there, and it is below the button rather than above it.
  const history = await page.getByTestId(TID.history).boundingBox();
  expect(history?.y ?? 0).toBeGreaterThan(afterFive?.y ?? 0);
}

/** TC-341 — five presses on the ARP lesson land on the same spot. */
test('the step button stays where it was pressed as the history grows', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await inJapanese(page);
  await demoPage.goto('/networking/arp');
  await pressesKeepTheirPlace(page);
  /** TC-342 — and the line under it says what a press does, and how many there are. */
  await expect(page.getByTestId(TID.hint)).toContainText('全部で 10 回');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  /**
   * TC-341 — at phone width the button keeps its place inside the control and
   * stays on screen. Measured against the control's own top: the lesson's
   * card above it changes height part-way through, which is the lesson's to fix.
   */
  test('the step button keeps its place in the control and stays on screen', async ({
    page,
    demoPage,
  }) => {
    await inJapanese(page);
    await demoPage.goto('/networking/arp');
    await page.getByTestId(SEL.demo.primaryAction).first().click();
    const step = page.getByTestId(TID.step);
    const control = page.getByTestId(TID.control);
    await step.scrollIntoViewIfNeeded();
    const offset = async () =>
      ((await step.boundingBox())?.y ?? 0) - ((await control.boundingBox())?.y ?? 0);

    await step.click();
    await expect(page.getByTestId(TID.readout)).toContainText('10 個のうち 1 番目');
    const afterOne = await offset();
    for (let press = 2; press <= 5; press += 1) {
      await step.click();
    }
    await expect(page.getByTestId(TID.readout)).toContainText('10 個のうち 5 番目');

    expect(await offset()).toBe(afterOne);
    await expect(step).toBeInViewport({ ratio: 1 });
    const box = await step.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  /** TC-349 — the transport buttons are big enough for a thumb, and the status is on screen. */
  test('the transport buttons are at least 44 px and the status is in view', async ({
    page,
    demoPage,
  }) => {
    await inJapanese(page);
    await demoPage.goto('/routing/client-server');
    await page.getByTestId(SEL.demo.primaryAction).first().click();
    await expect(page.getByTestId(TID.status)).toContainText('届きました');
    await expect(page.getByTestId(TID.status)).toBeInViewport({ ratio: 1 });

    for (const id of [TID.play, TID.pause, TID.stepIcon, TID.reset]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByTestId(TID.play)).toHaveAttribute('aria-label', '再生');
  });
});

/** TC-343 — before anything is sent, the hint names no button that is not there. */
test('the idle step control points at the lesson, not at a missing button', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await inJapanese(page);
  await demoPage.goto('/simulation/tcp-handshake');

  await expect(page.getByTestId(TID.idleHint)).toHaveText(
    'まだ何も送っていません。この画面のボタンで通信を始めると、ここから 1 つずつ進められます。',
  );
  await expect(page.getByTestId(SEL.demo.primaryAction)).toBeDisabled();
  await expect(page.getByTestId(TID.readout)).toHaveCount(0);
});

/** TC-344, TC-345, TC-340 — what happened, what each button is, and play that plays. */
test('after a send the bar says it arrived, names its buttons, and play replays', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await inJapanese(page);
  await demoPage.goto('/routing/client-server');

  /** TC-348 — the empty packet panel is not an error message. */
  await expect(page.getByTestId(TID.viewer)).toContainText('まだ何も送っていません');

  await page.getByTestId(SEL.demo.primaryAction).first().click();
  const status = page.getByTestId(TID.status);
  await expect(status).toHaveText(
    '届きました（終点は Server）。 → を押すと、通った道を 1 つずつ見直せます。',
  );

  await expect(page.getByTestId(TID.play)).toHaveText('▶ 再生');
  await expect(page.getByTestId(TID.pause)).toHaveText('⏸ 止める');
  await expect(page.getByTestId(TID.stepIcon)).toHaveText('→ 1 つ進む');
  await expect(page.getByTestId(TID.reset)).toHaveText('⟳ やり直す');

  // Each position is on screen for half a second and the assertion polls up to
  // a second apart, so it looks for any position rather than a particular one:
  // a play that does nothing leaves the sentence above in place and fails here.
  const position = /^7 個のうち [1-6] 番目：/;
  await page.getByTestId(TID.play).click();
  await expect(status).toHaveText(position);

  // Pause holds it where it is, which also shows the trace really was moving.
  await page.getByTestId(TID.pause).click();
  await expect(page.getByTestId(TID.pause)).toBeDisabled();
  const held = await status.textContent();
  expect(held).toMatch(position);
  await expect(page.getByTestId(TID.play)).toBeEnabled();

  await page.getByTestId(TID.play).click();
  await expect(status).not.toHaveText(held ?? '');
  await expect(status).toHaveText('届きました（終点は Server）。', { timeout: 10_000 });

  // Finished is not a dead end: play starts over from the first device.
  await page.getByTestId(TID.play).click();
  await expect(status).toHaveText(position);
});

/** TC-346, TC-347 — the timeline opens plain, and reads in Japanese. */
test('the timeline keeps its expert tools folded and its rows in Japanese', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await inJapanese(page);
  await demoPage.goto('/networking/arp');
  await page.getByTestId(SEL.demo.primaryAction).first().click();

  const rows = page.getByTestId(SEL.traceFilter.hop);
  await expect(rows.nth(1)).toHaveAttribute('data-event', 'arp-request');
  await expect(rows.nth(1)).toContainText('203.0.113.10 の持ち主は？');
  await expect(rows.nth(1)).toContainText('ARP 要求');
  await expect(rows.nth(2)).toHaveAttribute('data-event', 'arp-reply');
  await expect(rows.nth(2)).toContainText('203.0.113.10 は');
  await expect(rows.nth(2)).toContainText('です');
  await expect(rows.nth(0)).toContainText('CREATE');
  await expect(rows.nth(0)).toContainText('作成');

  const searchbox = page.getByTestId(SEL.traceFilter.searchbox);
  await expect(searchbox).toBeHidden();
  await expect(page.getByTestId(TID.advancedToggle)).toHaveAttribute('aria-expanded', 'false');

  await page.getByTestId(TID.advancedToggle).click();
  await expect(searchbox).toBeVisible();
  await expect(page.getByTestId(SEL.traceFilter.statusLabel)).toBeVisible();
});
