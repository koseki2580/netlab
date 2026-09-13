import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-129 — the HTTP lesson survives its own request.
 *
 * Pressing "GET /" killed the browser tab inside a second. The lesson stepped
 * the trace to its end with `while (status !== 'done') { step(); await
 * Promise.resolve(); }`, and the engine runs in a worker: `step()` posts a
 * message and the new state arrives on a later task, while `Promise.resolve()`
 * only drains microtasks. The reply could never be delivered, the loop never
 * saw `done`, and it posted step commands until the renderer ran out of memory.
 *
 * A hang would have shown as a slow test. This asks the one thing that
 * distinguishes the two: whether the page is still there afterwards.
 */
test('the HTTP lesson answers a request without killing the page', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/http');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(SEL.http.getRoot).click();

  // One request is one session, and the count is rendered by the page itself —
  // so reading it proves the renderer is alive and the request completed.
  await expect(page.getByTestId(SEL.http.sessionCount)).toHaveText('1');
  await expect(page.getByTestId(SEL.http.getRoot)).toBeEnabled();
});

/**
 * TC-130 — and so does the session lesson, which had the same loop.
 *
 * Both lessons stepped their trace with the same microtask spin, and both
 * killed the tab. Fixing one and not the other would have left a second copy
 * of the defect behind a button nobody had pressed.
 */
test('the session lesson answers a request without killing the page', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/simulation/session');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(SEL.session.send).click();

  await expect(page.getByTestId(SEL.session.count)).toHaveText('1');
  await expect(page.getByTestId(SEL.session.send)).toBeEnabled();
});
