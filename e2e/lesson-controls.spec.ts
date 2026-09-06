import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-039 — the controls a lesson is about can be pressed.
 *
 * The OSPF lesson turns on failing a link: that is its whole demonstration, and
 * the assessment built on it lists "Disable the primary link" as a required
 * sub-goal. The button could not be clicked. The audience pill beside it
 * intercepted the pointer from more than three hundred pixels away, so nothing
 * about the layout looked wrong and the bounding boxes did not overlap.
 */
test('the OSPF lesson can fail and restore its link', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const failLink = page.getByTestId('ospf-fail-link');
  await expect(failLink).toBeVisible();
  // The trial applies every actionability check without firing the handler, so
  // a failure here means the control was unreachable rather than misbehaving.
  await failLink.click({ trial: true });
  await failLink.click();

  // Pressing it changes what it offers, which is how the learner knows the
  // link is down and can be brought back.
  await expect(failLink).toHaveText('Restore link');
  await failLink.click();
  await expect(failLink).toHaveText('Fail link');
});

/**
 * TC-040 — the hit-area overlay stays on its own button.
 *
 * `shell-chrome.css` grows every command-bar and nav-rail button to a 44px
 * touch target with an absolutely positioned `::before`. That only works where
 * the button is itself positioned; otherwise the overlay anchors to the toolbar
 * row and spreads across it, shielding every control on the line. Three buttons
 * on the OSPF lesson did that, which is why its central action could not be
 * pressed while every bounding box looked correct.
 *
 * The overlay is invisible and absent from `getBoundingClientRect`, so this
 * asks the only question that catches it directly.
 */
test('every command-bar button anchors its own hit area', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const unanchored = await page.evaluate(() => {
    const found: string[] = [];
    for (const scope of ['[data-netlab-command-bar]', '[data-netlab-nav-rail]']) {
      for (const button of document.querySelectorAll<HTMLElement>(`${scope} button`)) {
        if (getComputedStyle(button).position !== 'static') continue;
        found.push((button.getAttribute('aria-label') ?? button.textContent ?? '?').trim());
      }
    }
    return found;
  });
  expect(unanchored, 'no button lets its hit area escape onto the toolbar').toEqual([]);
});

/**
 * TC-041 — the area legend does not sit on the navigation rail.
 *
 * `AreaLegend` was the only canvas overlay positioned `fixed` rather than
 * `absolute`, so it anchored to the viewport instead of the canvas it is a
 * child of. At `left: 12` that put it on top of the 48px rail, and the Help
 * button — the rail's bottom item, and the only route to the keyboard
 * shortcuts — sat underneath it on every lesson that draws areas.
 */
test('the navigation rail stays reachable beside the area legend', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  // The lesson must actually draw the legend, or this proves nothing.
  await expect(page.getByTestId(SEL.canvas.areaLegend)).toBeVisible();

  const rail = page.locator('[data-netlab-nav-rail] button');
  const count = await rail.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const button = rail.nth(index);
    const label = (await button.getAttribute('aria-label')) ?? `#${index}`;
    await test.step(`rail button ${label} is reachable`, async () => {
      await button.click({ trial: true });
    });
  }
});
