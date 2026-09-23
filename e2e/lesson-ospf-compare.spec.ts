import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const OSPF = {
  failLink: 'ospf-fail-link',
  routeCurrent: 'ospf-route-current',
  routePrevious: 'ospf-route-previous',
  routeTables: 'ospf-route-tables',
  routeTab: (routerId: string) => `ospf-route-tab-${routerId}`,
  routeRows: 'ospf-route-table-rows',
} as const;

async function sendProbe(page: import('@playwright/test').Page) {
  // The command bar's probe button has no id of its own; it is the one whose
  // title names the probe, which is an attribute, not visible text.
  await page.locator('button[title="Send probe C1 -> C2"]').click();
}

/**
 * Failing the link keeps the run the learner compares against: the route
 * before the failure stays on screen beside the recomputed one.
 */
test('the OSPF lesson keeps the route from before the link failed', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await sendProbe(page);
  await expect(page.getByTestId(OSPF.routeCurrent)).toHaveText(
    'Probe route: C1 → R1 → R2 → R4 → C2 (link up)',
  );

  await page.getByTestId(OSPF.failLink).click();
  await sendProbe(page);
  await expect(page.getByTestId(OSPF.routeCurrent)).toHaveText(
    'Probe route: C1 → R1 → R3 → R4 → C2 (link down)',
  );
  await expect(page.getByTestId(OSPF.routePrevious)).toHaveText(
    'Previous route: C1 → R1 → R2 → R4 → C2 (link up)',
  );
});

/**
 * Every router's table is reachable from the side rail, and none of them
 * floats over the diagram.
 */
test('every OSPF route table opens in the side rail, off the canvas', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(SEL.routeTable.body)).toHaveCount(0);
  for (const router of ['r1', 'r2', 'r3', 'r4']) {
    await page.getByTestId(OSPF.routeTab(router)).click();
    await expect(page.getByTestId(OSPF.routeTab(router))).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId(OSPF.routeRows).locator('tbody tr').first()).toBeVisible();
  }

  const tables = await page.getByTestId(OSPF.routeTables).boundingBox();
  const canvas = await page.getByTestId(SEL.canvas.node).first().boundingBox();
  if (!tables || !canvas) throw new Error('bounding boxes were not measurable');
  expect(tables.x).toBeGreaterThan(canvas.x + canvas.width);
});
