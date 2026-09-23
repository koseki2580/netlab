import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-176 — the first lessons in the catalogue give the learner something to do.
 *
 * The three shape lessons are tagged "はじめて" and sit first in the catalogue,
 * and each was a picture and nothing else: no instruction, no button, no
 * result. A beginner opening the simplest-sounding lesson met a dead end. Each
 * now says what to try, has one button, and explains what happened.
 */
for (const path of ['/basic/minimal', '/basic/three-tier', '/basic/star']) {
  test(`${path} sets a task, runs it, and explains the result`, async ({ page, demoPage }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('netlab-locale', 'ja');
      } catch {
        /* no storage — the page is still usable, only in English */
      }
    });
    await demoPage.goto(path);

    await expect(page.getByTestId(SEL.lessonTask.goal), 'the lesson says what to try').toHaveText(
      /[ぁ-んァ-ヶ一-龯]/,
    );
    await expect(page.getByTestId(SEL.lessonTask.outcome)).toHaveCount(0);

    await demoPage.pressStart();

    const outcome = page.getByTestId(SEL.lessonTask.outcome);
    await expect(outcome, 'pressing it produces a result').toBeVisible();
    await expect(outcome, 'the packet arrives on every shape lesson').toHaveAttribute(
      'data-arrived',
      'yes',
    );
    await expect(outcome, 'and the result is explained').toHaveText(/[ぁ-んァ-ヶ一-龯]{8,}/);

    // The route is the one on the diagram: from the sender to the server, each
    // device once — not a hop count, and not the address lookup's round trip.
    const route = ((await page.getByTestId(SEL.lessonTask.path).textContent()) ?? '')
      .replace(/^[^:：]*[:：]\s*/, '')
      .split(' → ');
    expect(route[route.length - 1], 'the route ends at the server').toBe('Server');
    expect(new Set(route).size, 'no device appears twice').toBe(route.length);
  });
}
