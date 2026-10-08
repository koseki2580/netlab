import type { Locator, Page } from '@playwright/test';
import { TEMPLATES } from '../demo/exercises/templates';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-525 to TC-527 — an exercise on a 390×844 phone, held in one hand.
 *
 * The page used to stack the brief, a 280px diagram and the form, so on the
 * simplest exercise the last row of devices sat under the Check bar and on a
 * longer one the diagram was off the first screen altogether. Now the diagram
 * takes whatever the brief leaves above the bar.
 */
const X = SEL.exercises;
const WIDTH = 390;
const HEIGHT = 844;

test.use({ viewport: { width: WIDTH, height: HEIGHT }, hasTouch: true });

const firstOf = (level: number) =>
  TEMPLATES.filter((template) => template.level === level).map((template) => `${template.id}~0`);

async function openInJapanese(page: Page, path: string) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* English is laid out the same way */
    }
  });
  await page.goto(`/#${path}`);
  await page.getByTestId(SEL.app.root).waitFor();
}

async function openExercise(page: Page, id: string) {
  await openInJapanese(page, `/exercises/do/${id}`);
  await expect(page.getByTestId(X.panel)).toHaveAttribute('data-exercise-id', id);
  await expect(page.getByTestId(X.check)).toBeVisible();
  // The canvas keeps a device hidden until it has measured and placed it.
  await expect(page.getByTestId(X.diagram).getByTestId(SEL.canvas.node).last()).toBeVisible();
}

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error('the element is not laid out');
  return {
    top: found.y,
    bottom: found.y + found.height,
    left: found.x,
    right: found.x + found.width,
  };
}

async function noSidewaysScroll(page: Page) {
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
    window.innerWidth,
  ]);
  expect(widths[0], 'the page is no wider than the screen').toBeLessThanOrEqual(WIDTH);
  expect(widths[1], 'the body is no wider than the screen').toBeLessThanOrEqual(WIDTH);
}

/**
 * TC-525 — level 1 is where a learner with a phone and no background starts:
 * the task, its goals, every device of the network and the button are on the
 * first screen, with nothing to scroll for. Six exercises of each kind,
 * because a longer brief leaves the diagram less room.
 */
for (const template of TEMPLATES.filter((entry) => entry.level === 1)) {
  test(`${template.id}: brief, goals, every device and Check are on the first screen`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    for (let seed = 0; seed < 6; seed += 1) {
      const id = `${template.id}~${seed}`;
      await openExercise(page, id);
      const bar = await box(page.getByTestId(X.actions));
      const check = await box(page.getByTestId(X.check));
      expect(check.top, id).toBeGreaterThanOrEqual(0);
      expect(check.bottom, id).toBeLessThanOrEqual(HEIGHT);

      // Everything else is above the bar the button sits in, not under it.
      const brief = await box(page.getByTestId(X.brief));
      expect(brief.top, id).toBeGreaterThanOrEqual(0);
      expect(brief.bottom, id).toBeLessThanOrEqual(bar.top);
      for (const goal of template.generate(seed).checks) {
        await expect(page.getByTestId(X.goal(goal.id))).toBeInViewport({ ratio: 1 });
      }
      const diagram = await box(page.getByTestId(X.diagram));
      expect(diagram.top, id).toBeGreaterThanOrEqual(brief.bottom);
      const devices = await page.getByTestId(X.diagram).getByTestId(SEL.canvas.node).all();
      expect(devices.length, id).toBe(template.generate(seed).start.nodes.length);
      for (const device of devices) {
        const drawn = await box(device);
        expect(drawn.top, id).toBeGreaterThanOrEqual(diagram.top);
        expect(drawn.bottom, id).toBeLessThanOrEqual(bar.top);
        expect(drawn.left, id).toBeGreaterThanOrEqual(0);
        expect(drawn.right, id).toBeLessThanOrEqual(WIDTH);
      }
      await noSidewaysScroll(page);
    }
  });
}

/**
 * TC-526 — at every level: Check never leaves the screen, nothing scrolls
 * sideways, the diagram at least begins on the first screen and can be
 * scrolled to, and the result is brought into view when Check is pressed.
 */
for (const id of ['l1-host-address~0', 'l1-choose-address~0', ...firstOf(2)]) {
  test(`${id}: Check stays on screen, and its result comes into view`, async ({ page }) => {
    await openExercise(page, id);
    const bar = await box(page.getByTestId(X.actions));
    const diagram = await box(page.getByTestId(X.diagram));
    expect(diagram.top, 'the diagram begins above the Check bar').toBeLessThan(bar.top - 44);
    await noSidewaysScroll(page);

    const isDesign = (await page.getByTestId(X.settings).count()) === 0;
    await page.getByTestId(X.check).tap();
    if (isDesign) {
      // Nothing is run before a design is chosen; the page says so where the learner is looking.
      await expect(page.getByTestId(X.designNeeded)).toBeInViewport();
    } else {
      await expect(page.getByTestId(X.result)).toHaveAttribute('data-passed', 'false');
      await expect(page.getByTestId(X.resultSummary)).toBeInViewport({ ratio: 1 });
      // The bar is taller now: the hint button and what a hint costs have joined Check.
      const barNow = await box(page.getByTestId(X.actions));
      const summary = await box(page.getByTestId(X.resultSummary));
      expect(summary.bottom, 'the result is not under the Check bar').toBeLessThanOrEqual(
        barNow.top,
      );
      // TC-545 — on a phone too: the hint is beside Check, on screen, after the first miss.
      await expect(page.getByTestId(X.actions).getByTestId(X.hint)).toBeInViewport({ ratio: 1 });
    }
    const after = await box(page.getByTestId(X.check));
    expect(after.top).toBeGreaterThanOrEqual(0);
    expect(after.bottom).toBeLessThanOrEqual(HEIGHT);

    // The diagram is still reachable, whole.
    await page.getByTestId(X.diagram).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(X.diagram)).toBeInViewport({ ratio: 0.5 });
    await noSidewaysScroll(page);
  });
}

/** Every control a finger has to hit on these pages, with its height. */
async function controlHeights(scope: Locator): Promise<{ name: string; height: number }[]> {
  return scope.locator('button, input, select, a[href]').evaluateAll((controls) =>
    controls
      .filter((control) => (control as HTMLElement).offsetParent !== null)
      .map((control) => ({
        name:
          control.getAttribute('data-testid') ??
          `${control.tagName.toLowerCase()} “${(control.textContent ?? '').trim().slice(0, 24)}”`,
        height: Math.round(control.getBoundingClientRect().height),
      })),
  );
}

/** TC-527 — nothing a finger has to hit is smaller than 44px. */
test('every control of an exercise is at least 44px high', async ({ page }) => {
  for (const id of [
    'l1-host-address~0',
    'l2-vlan-separate~0',
    'l2-acl-permit~0',
    'l2-static-missing~0',
  ]) {
    await openExercise(page, id);
    // With a hint open and the way out asked for, so those controls are measured too.
    await page.getByTestId(X.check).tap();
    await expect(page.getByTestId(X.result)).toHaveAttribute('data-passed', 'false');
    await page.getByTestId(X.hint).tap();
    await page.getByTestId(X.giveUp).tap();
    const controls = [
      ...(await controlHeights(page.getByTestId(X.panel))),
      ...(await controlHeights(page.getByTestId(X.actions))),
      ...(await controlHeights(page.getByTestId(X.backToLevel).locator('..'))),
    ];
    expect(controls.length).toBeGreaterThan(5);
    expect(
      controls.filter((control) => control.height < 44),
      `controls under 44px on ${id}`,
    ).toEqual([]);
  }
});

test('every control of the hub, a level, placement and the record is at least 44px high', async ({
  page,
}) => {
  for (const path of [
    '/exercises',
    '/exercises/level/1',
    '/exercises/placement',
    '/exercises/report',
  ]) {
    await openInJapanese(page, path);
    const main = page.getByTestId(
      path === '/exercises/placement'
        ? X.placementQuestion
        : path === '/exercises/report'
          ? X.reportExport
          : X.level(1),
    );
    await expect(main).toBeVisible();
    // The column of cards the page is made of.
    const controls = await controlHeights(main.locator('..'));
    expect(controls.length).toBeGreaterThan(1);
    expect(
      controls.filter((control) => control.height < 44),
      `controls under 44px on ${path}`,
    ).toEqual([]);
    await noSidewaysScroll(page);
  }
  // In the middle of placement there is one more control: the way out.
  await openInJapanese(page, '/exercises/placement');
  await page.getByTestId(X.placementAnswer('no')).tap();
  const stop = await box(page.getByTestId(X.placementStop));
  expect(stop.bottom - stop.top).toBeGreaterThanOrEqual(44);
});
