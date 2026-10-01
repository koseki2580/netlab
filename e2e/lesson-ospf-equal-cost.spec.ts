import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids for the two OSPF lessons. */
const DYNAMIC = {
  protocol: (name: 'rip' | 'ospf' | 'bgp') => `dynamic-protocol-${name}`,
  route: (routerId: string, destination: string) => `dynamic-route-${routerId}-${destination}`,
} as const;

const OSPF = {
  failLink: 'ospf-fail-link',
  routeTab: (routerId: string) => `ospf-route-tab-${routerId}`,
  routeRow: (destination: string) => `ospf-route-row-${destination}`,
  ecmpNote: 'ospf-ecmp-note',
  linkCosts: 'ospf-link-costs',
  linkCost: (edgeId: string) => `ospf-link-cost-${edgeId}`,
} as const;

/**
 * TC-251 — OSPF installs both equal-cost next hops, and the lesson shows both.
 *
 * R4 has two cost-3 paths to 10.1.0.0/24, through R2 and through R3. The table
 * showed only 10.0.24.1, as if OSPF had picked one.
 */
test('the Dynamic Routing OSPF view shows both of R4’s equal-cost next hops', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/dynamic');
  await page.getByTestId(DYNAMIC.protocol('ospf')).click();

  const row = page.getByTestId(DYNAMIC.route('r4', '10.1.0.0/24'));
  await expect(row).toContainText('10.0.24.1, 10.0.34.1');
  await expect(row).toContainText('metric 3');

  // A route with one path is unchanged.
  const single = page.getByTestId(DYNAMIC.route('r2', '10.0.13.0/30'));
  await expect(single).toContainText('next-hop: 10.0.24.2');
  await expect(single).toContainText('metric 3');
});

test('the OSPF Convergence lesson shows both next hops until the link fails', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(OSPF.routeTab('r4')).click();
  const row = page.getByTestId(OSPF.routeRow('10.1.0.0/24'));
  await expect(row).toContainText('10.0.24.1');
  await expect(row).toContainText('10.0.34.1');
  await expect(page.getByTestId(OSPF.ecmpNote)).toBeVisible();

  await page.getByTestId(OSPF.failLink).click();
  await page.getByTestId(OSPF.routeTab('r4')).click();
  await expect(row).toContainText('10.0.34.1');
  await expect(row).not.toContainText('10.0.24.1');
  await expect(page.getByTestId(OSPF.ecmpNote)).toHaveCount(0);
});

/**
 * TC-252 — the BGP view's number is the AS path length, and is named so.
 *
 * It was labelled "metric", which in BGP means MED; this lesson does not model
 * MED, and the number it ranks on is how many ASes the route crossed.
 */
test('the BGP view names its number the AS path length, in both languages', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/dynamic');
  await page.getByTestId(DYNAMIC.protocol('bgp')).click();

  const bgpRoute = page.getByTestId(DYNAMIC.route('r1', '10.4.0.0/24'));
  await expect(bgpRoute).toContainText('AS path length 2');
  await expect(bgpRoute).not.toContainText('metric');
  await expect(page.getByTestId(DYNAMIC.route('r2', '10.0.13.0/30'))).toHaveCount(0);

  await page.getByTestId(DYNAMIC.protocol('ospf')).click();
  await expect(page.getByTestId(DYNAMIC.route('r2', '10.0.13.0/30'))).toContainText('metric 3');

  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  await page.getByTestId(DYNAMIC.protocol('bgp')).click();
  await expect(bgpRoute).toContainText('AS パス長 2');
  await expect(bgpRoute).not.toContainText('メトリック');
});

/**
 * TC-253 — the OSPF Convergence lesson states its link costs.
 *
 * The cost 3 on R1's interface toward R3 decides every route on the page, and
 * it was written only in the other OSPF lesson.
 */
test('the OSPF Convergence lesson lists each link’s cost per direction', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();

  await expect(page.getByTestId(OSPF.linkCosts)).toBeVisible();
  await expect(page.getByTestId(OSPF.linkCost('e-r1-r3'))).toHaveText(
    'R1 → R3: cost 3 · R3 → R1: cost 1',
  );
  await expect(page.getByTestId(OSPF.linkCost('e-r1-r2'))).toHaveText('R1 ↔ R2: cost 1');
  await expect(page.getByTestId(OSPF.linkCost('e-r2-r4'))).toHaveText('R2 ↔ R4: cost 1');

  await page.getByTestId(OSPF.failLink).click();
  await expect(page.getByTestId(OSPF.linkCost('e-r2-r4'))).toHaveText(
    'R2 ↔ R4: cost 1 (link down)',
  );
});
