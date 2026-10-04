import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids. */
const OSPF = {
  failLink: 'ospf-fail-link',
  r1Route: 'ospf-r1-route',
  r1RouteHeading: 'ospf-r1-route-heading',
  r1RouteNote: 'ospf-r1-route-note',
  routeTables: 'ospf-route-tables',
  routeTab: (routerId: string) => `ospf-route-tab-${routerId}`,
  routeRow: (destination: string) => `ospf-route-row-${destination}`,
} as const;

/**
 * TC-308 — the card above the route-table tabs says it is R1's route to C2's
 * network.
 *
 * It was headed "R1 preferred route" and kept that heading with the R2, R3 or
 * R4 tab open, so it read as the heading of the table below it.
 */
test('the OSPF summary card stays about R1 whichever tab is open', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const heading = page.getByTestId(OSPF.r1RouteHeading);
  await expect(heading).toHaveText('R1’s route to C2’s network (10.4.0.0/24)');
  await expect(page.getByTestId(OSPF.r1RouteNote)).toHaveText(
    'Always R1, whichever tab is open below.',
  );
  const before = await page.getByTestId(OSPF.r1Route).innerText();

  for (const router of ['r2', 'r3', 'r4']) {
    await page.getByTestId(OSPF.routeTab(router)).click();
    await expect(page.getByTestId(OSPF.routeTab(router))).toHaveAttribute('aria-selected', 'true');
    await expect(heading).toHaveText('R1’s route to C2’s network (10.4.0.0/24)');
    expect(await page.getByTestId(OSPF.r1Route).innerText()).toBe(before);
  }

  // The card is a box of its own, clear of the tables' box.
  const card = await page.getByTestId(OSPF.r1Route).boundingBox();
  const tables = await page.getByTestId(OSPF.routeTables).boundingBox();
  if (!card || !tables) throw new Error('bounding boxes were not measurable');
  expect(card.y + card.height).toBeLessThan(tables.y);

  // The recomputed tables read as they did.
  await page.getByTestId(OSPF.failLink).click();
  await page.getByTestId(OSPF.routeTab('r2')).click();
  const r2 = page.getByTestId(OSPF.routeRow('10.4.0.0/24'));
  await expect(r2).toContainText('10.0.12.1');
  await expect(r2.locator('td').last()).toHaveText('6');
  await page.getByTestId(OSPF.routeTab('r4')).click();
  const r4 = page.getByTestId(OSPF.routeRow('10.1.0.0/24'));
  await expect(r4).toContainText('10.0.34.1');
  await expect(r4.locator('td').last()).toHaveText('3');
});

test('the OSPF summary card is headed in Japanese for a Japanese learner', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/ospf-convergence');
  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  await demoPage.dismissBrief();

  await page.getByTestId(OSPF.routeTab('r3')).click();
  await expect(page.getByTestId(OSPF.r1RouteHeading)).toHaveText(
    'R1 から C2 のネットワーク（10.4.0.0/24）への経路',
  );
  await expect(page.getByTestId(OSPF.r1RouteNote)).toHaveText(
    '下でどのタブを開いても、ここは R1 の経路です。',
  );
});
