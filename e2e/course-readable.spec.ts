import type { Page } from '@playwright/test';
import { COURSE_STEPS } from '../demo/course/courseSteps';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * What five beginners could not get past in the six-step course: a result that
 * opened as a block of prose, a verdict that arrived before the packet did, and
 * on a phone a diagram that was scrolled away the moment they pressed send.
 */
const IDS = {
  diagram: 'course-diagram',
  caption: 'course-caption',
  packet: 'canvas-packet',
  verdict: 'course-verdict',
  headline: 'course-headline',
  points: 'course-points',
  moreToggle: 'course-more-toggle',
  more: 'course-more',
  routeTable: 'course-route-table',
  routeExtra: 'course-route-extra',
  routeRow: 'course-route-row',
  finishActions: 'course-finish-actions',
  toExam: 'course-to-exam',
  toGallery: 'course-to-gallery',
} as const;

async function inJapanese(page: Page, step = 0) {
  await page.addInitScript((at) => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
      // Only on the first load: a later reload keeps the step the test set.
      if (window.sessionStorage.getItem('course-test-seeded') === null) {
        window.sessionStorage.setItem('course-test-seeded', '1');
        window.localStorage.setItem('netlab-course-step', String(at));
      }
    } catch {
      /* the default is English at step 1, which these tests would then catch */
    }
  }, step);
}

async function openStep(page: Page, index: number) {
  await page.evaluate((at) => {
    window.localStorage.setItem('netlab-course-step', String(at));
  }, index);
  await page.reload();
  await expect(page.getByTestId(SEL.course.progress)).toContainText(String(index + 1));
  await expect(page.getByTestId(SEL.canvas.root)).toBeVisible();
}

/**
 * TC-337 — every step's result opens with its one idea, keeps the rest behind
 * a closed toggle, and the last step's button ends the course.
 */
test('each step says its one idea first and keeps the detail closed', async ({
  page,
  demoPage,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await inJapanese(page);
  await demoPage.goto('/course');

  for (const [index, step] of COURSE_STEPS.entries()) {
    await expect(page.getByTestId(SEL.course.progress)).toContainText(String(index + 1));
    await page.getByTestId(SEL.course.send).click();

    const outcome = page.getByTestId(SEL.course.outcome);
    await expect(outcome).toBeVisible();
    await expect(outcome).toHaveAttribute(
      'data-tone',
      step.expect === 'drop' ? 'planned-failure' : 'success',
    );
    const headline = page.getByTestId(IDS.headline);
    await expect(headline).toHaveText(step.copy.ja.headline);
    expect(step.copy.ja.headline.length, 'short enough to be read at a glance').toBeLessThan(31);
    // The headline is the largest text in the box.
    const sizes = await Promise.all(
      [IDS.headline, IDS.points, IDS.verdict].map((id) =>
        page.getByTestId(id).evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      ),
    );
    expect(sizes[0]).toBeGreaterThan(sizes[1]!);
    expect(sizes[0]).toBeGreaterThan(sizes[2]!);

    const toggle = page.getByTestId(IDS.moreToggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId(IDS.more)).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // The copy marks a new term with **…**; the page renders it as emphasis.
    await expect(page.getByTestId(IDS.more)).toContainText(
      step.copy.ja.more[0]!.replaceAll('**', ''),
    );
    if (step.id === 'two-machines') {
      // The notation the detail explains is now on the diagram to be checked.
      await expect(page.getByTestId(IDS.diagram)).toHaveAttribute('data-prefix', '');
    }

    const next = page.getByTestId(SEL.course.next);
    const last = index === COURSE_STEPS.length - 1;
    await expect(next).toHaveAttribute('data-last', last ? 'yes' : 'no');
    await expect(next).toHaveText(last ? 'コースを終える' : '次のステップへ');
    await next.click();
  }

  await expect(page.getByTestId(SEL.course.finished)).toBeVisible();
  await expect(page.getByTestId(IDS.toExam)).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  /**
   * TC-338 — pressing send leaves the diagram where it is, and the verdict
   * waits for the packet.
   */
  test('the diagram stays in view while the packet moves, and the verdict follows it', async ({
    page,
    demoPage,
  }) => {
    test.setTimeout(180_000);
    await inJapanese(page);
    await demoPage.goto('/course');

    for (const index of [0, 2, 4, 5]) {
      await openStep(page, index);
      const diagram = page.getByTestId(IDS.diagram);
      const before = await diagram.boundingBox();
      expect(before, 'the diagram is drawn').not.toBeNull();
      const send = page.getByTestId(SEL.course.send);
      await expect(send, 'the one button needs no swipe').toBeInViewport({ ratio: 1 });

      // Note what the packet was doing at the moment the verdict appeared.
      await page.evaluate(() => {
        const seen = { moving: null as string | null };
        (window as unknown as { __courseVerdict: typeof seen }).__courseVerdict = seen;
        const observer = new MutationObserver(() => {
          if (!document.querySelector('[data-testid="course-outcome"]')) return;
          seen.moving =
            document.querySelector('[data-testid="canvas-packet"]')?.getAttribute('data-moving') ??
            'absent';
          observer.disconnect();
        });
        observer.observe(document.body, { subtree: true, childList: true });
      });

      await send.tap();
      await expect(page.getByTestId(IDS.caption)).toHaveAttribute('data-phase', 'travelling');
      await expect(page.getByTestId(IDS.caption)).toContainText('PC-A');

      for (const wait of [300, 700]) {
        await page.waitForTimeout(wait);
        const now = await diagram.boundingBox();
        expect(now, `step ${index + 1}: the diagram is still drawn`).not.toBeNull();
        expect(now!.y, `step ${index + 1}: the diagram has not moved`).toBe(before!.y);
        expect(now!.y + now!.height, `step ${index + 1}: and is on screen`).toBeGreaterThan(0);
        await expect(diagram).toBeInViewport({ ratio: 1 });
      }

      await expect(page.getByTestId(SEL.course.outcome)).toBeVisible();
      await expect(page.getByTestId(IDS.packet)).toHaveAttribute('data-moving', 'false');
      const seen = await page.evaluate(
        () =>
          (window as unknown as { __courseVerdict: { moving: string | null } }).__courseVerdict
            .moving,
      );
      expect(seen, `step ${index + 1}: the verdict came once the packet was at rest`).toBe('false');
      await expect(page.getByTestId(IDS.caption)).toHaveAttribute('data-phase', 'arrived');

      // The result is read under a diagram that is still whole, and going on
      // needs no swipe.
      await expect(page.getByTestId(IDS.headline)).toBeInViewport({ ratio: 1 });
      await expect(diagram).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId(SEL.course.next)).toBeInViewport({ ratio: 1 });
      expect((await diagram.boundingBox())!.y).toBe(before!.y);
    }
  });

  /**
   * TC-339 — the last step's table is under the diagram, not over it, shows
   * the two columns the explanation uses, and the course ends on stacked buttons.
   */
  test('the routing table sits clear of the diagram and the course ends cleanly', async ({
    page,
    demoPage,
  }) => {
    test.setTimeout(120_000);
    await inJapanese(page, COURSE_STEPS.length - 1);
    await demoPage.goto('/course');

    const table = page.getByTestId(IDS.routeTable);
    await expect(table).toBeVisible();
    const diagramBox = await page.getByTestId(IDS.diagram).boundingBox();
    const tableBox = await table.boundingBox();
    expect(tableBox!.y, 'the table starts under the diagram').toBeGreaterThanOrEqual(
      diagramBox!.y + diagramBox!.height,
    );
    await expect(table).toHaveAttribute('data-detailed', 'no');
    await expect(page.getByTestId(IDS.routeExtra)).toHaveCount(0);
    await expect(page.getByTestId(IDS.routeRow)).toHaveCount(2);
    const size = await table.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(size, 'a size that can be read').toBeGreaterThanOrEqual(13);

    await page.getByTestId(SEL.course.send).tap();
    await expect(page.getByTestId(SEL.course.outcome)).toBeVisible();
    // The row the router used is the one the explanation talks about.
    await expect(page.getByTestId(IDS.routeRow).nth(1)).toHaveAttribute('data-used', 'true');
    await expect(page.getByTestId(IDS.routeRow).nth(1)).toContainText('192.168.1.0/24');

    await page.getByTestId(IDS.moreToggle).tap();
    await expect(table).toHaveAttribute('data-detailed', 'yes');
    await expect(page.getByTestId(IDS.routeExtra)).toHaveCount(2);

    await page.getByTestId(SEL.course.next).tap();
    await expect(page.getByTestId(SEL.course.finished)).toBeVisible();
    const boxes = await Promise.all(
      [IDS.toExam, IDS.toGallery, SEL.course.restart].map((id) =>
        page.getByTestId(id).boundingBox(),
      ),
    );
    const [exam, gallery, restart] = boxes;
    expect(gallery!.y, 'stacked, one under another').toBeGreaterThanOrEqual(exam!.y + exam!.height);
    expect(restart!.y).toBeGreaterThanOrEqual(gallery!.y + gallery!.height);
    expect(exam!.height, 'each label on one line').toBeLessThan(50);
    expect(exam!.width).toBe(restart!.width);
    await expect(page.getByTestId(IDS.finishActions)).toBeInViewport({ ratio: 1 });
  });
});
