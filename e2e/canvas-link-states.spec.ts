import { expect, test } from './fixtures/harness';

/**
 * The canvas draws a link that carries nothing so it cannot be mistaken for a
 * healthy one: a failed link is `down`, a link spanning tree keeps out of
 * forwarding is `blocked`, and each says so on the drawn link itself.
 *
 * `data-edge-state` is the canvas's contract for that state, set on the drawn
 * link next to `data-edge-id`; the key names the marks while one is on screen.
 */
const T = {
  failurePanel: 'failure-toggle-panel',
  failureLinksGroup: 'failure-group-links',
  linkStateKey: 'canvas-link-state-key',
  ospfFailLink: 'ospf-fail-link',
  controls: 'maxgraph-controls',
  minimap: 'maxgraph-minimap',
  canvas: 'maxgraph-canvas',
} as const;

const drawnLink = (state: 'up' | 'down' | 'blocked') =>
  `[data-edge-id][data-edge-state="${state}"]`;

test('a link failed from the failure panel is drawn down, and the key names it', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/simulation/failure');
  await demoPage.dismissBrief();
  await expect(page.locator(drawnLink('up')).first()).toBeAttached();
  await expect(page.locator(drawnLink('down'))).toHaveCount(0);
  await expect(page.getByTestId(T.linkStateKey)).toHaveCount(0);

  const panel = page.getByTestId(T.failurePanel);
  const linksGroup = panel.getByTestId(T.failureLinksGroup);
  if (await linksGroup.isVisible().catch(() => false)) await linksGroup.click();
  // A link's toggle is named after both of its ends.
  await panel.locator('[role="switch"][aria-label*="↔"]').first().click();

  await expect(page.locator(drawnLink('down'))).toHaveCount(1);
  await expect(page.getByTestId(T.linkStateKey).locator('[data-link-state="down"]')).toBeVisible();
});

test('the link spanning tree blocks is drawn blocked, not as a healthy link', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/stp');
  await demoPage.dismissBrief();

  await expect(page.locator(drawnLink('blocked'))).toHaveCount(1);
  await expect(
    page.getByTestId(T.linkStateKey).locator('[data-link-state="blocked"]'),
  ).toBeVisible();
});

test('failing the OSPF primary link draws R2–R4 as failed', async ({ page, demoPage }) => {
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  const r2r4 = page.locator('[data-edge-id="e-r2-r4"]');
  await expect(r2r4).toHaveAttribute('data-edge-state', 'up');

  await page.getByTestId(T.ospfFailLink).click();

  // The failed link stays on the diagram and says it failed; it used to be
  // deleted, which left nothing to show and, before that, a healthy line.
  await expect(page.locator('[data-edge-id="e-r2-r4"]').first()).toHaveAttribute(
    'data-edge-state',
    'down',
  );
});

/**
 * On a short canvas the zoom strip and the overview covered a device: the
 * third device of the 240px TCP canvas at every width, and Server B on the
 * data-transfer canvas.
 */
for (const path of ['/simulation/tcp-congestion', '/simulation/data-transfer']) {
  for (const width of [1440, 1024, 800]) {
    test(`no device sits under the canvas controls on ${path} at ${width}px`, async ({
      page,
      demoPage,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await demoPage.goto(path);
      await demoPage.dismissBrief();
      await expect(page.getByTestId(T.controls)).toBeVisible();
      // Too short a canvas for an overview: none is drawn.
      await expect(page.getByTestId(T.minimap)).toHaveCount(0);

      const controls = (await page.getByTestId(T.controls).boundingBox())!;
      const canvas = (await page.getByTestId(T.canvas).boundingBox())!;
      const devices = page.locator('[data-id][role="button"]');
      await expect(devices.first()).toBeVisible();
      for (const box of await devices.evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      )) {
        const overlaps =
          box.x < controls.x + controls.width &&
          box.x + box.width > controls.x &&
          box.y < controls.y + controls.height &&
          box.y + box.height > controls.y;
        expect(overlaps, 'a device is under the zoom strip').toBe(false);
        expect(box.x + box.width, 'a device runs off the canvas').toBeLessThanOrEqual(
          canvas.x + canvas.width + 1,
        );
      }
    });
  }
}
