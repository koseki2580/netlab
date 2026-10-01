import { expect, test } from './fixtures/harness';

/** Lesson-local test ids for the Dynamic Routing lesson. */
const DYNAMIC = {
  protocol: (name: 'rip' | 'ospf' | 'bgp') => `dynamic-protocol-${name}`,
  route: (routerId: string, destination: string) => `dynamic-route-${routerId}-${destination}`,
  linkCosts: 'ospf-link-costs',
  linkCost: (edgeId: string) => `ospf-link-cost-${edgeId}`,
  bgpOriginated: 'dynamic-bgp-originated',
} as const;

/**
 * TC-270 — the OSPF view lists its link costs.
 *
 * R2's metric 3 to 10.0.13.0/30 can only be added up from the costs, and the
 * view named one of them, in prose.
 */
test('the Dynamic Routing OSPF view lists each link’s cost per direction', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/dynamic');
  await expect(page.getByTestId(DYNAMIC.linkCosts)).toHaveCount(0);

  await page.getByTestId(DYNAMIC.protocol('ospf')).click();
  await expect(page.getByTestId(DYNAMIC.linkCosts)).toBeVisible();
  await expect(page.getByTestId(DYNAMIC.linkCost('e-r1-r3'))).toHaveText(
    'R1 → R3: cost 3 · R3 → R1: cost 1',
  );
  await expect(page.getByTestId(DYNAMIC.linkCost('e-r1-r2'))).toHaveText('R1 ↔ R2: cost 1');
  await expect(page.getByTestId(DYNAMIC.linkCost('e-r2-r4'))).toHaveText('R2 ↔ R4: cost 1');
  await expect(page.getByTestId(DYNAMIC.linkCost('e-r3-r4'))).toHaveText('R3 ↔ R4: cost 1');

  // The route the costs explain is unchanged.
  const route = page.getByTestId(DYNAMIC.route('r2', '10.0.13.0/30'));
  await expect(route).toContainText('next-hop: 10.0.24.2');
  await expect(route).toContainText('metric 3');

  await page.getByTestId(DYNAMIC.protocol('bgp')).click();
  await expect(page.getByTestId(DYNAMIC.linkCosts)).toHaveCount(0);
});

/**
 * TC-271 — the BGP view says what BGP advertises here.
 *
 * R2 has no route to 10.0.13.0/30, and nothing on the page said why.
 */
test('the BGP view names the networks each router originates', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/dynamic');
  await expect(page.getByTestId(DYNAMIC.bgpOriginated)).toHaveCount(0);

  await page.getByTestId(DYNAMIC.protocol('bgp')).click();
  const note = page.getByTestId(DYNAMIC.bgpOriginated);
  await expect(note).toContainText('R1: 10.1.0.0/24 · R2: none · R3: none · R4: 10.4.0.0/24');
  await expect(note).toContainText('a link between two other routers does not appear');
  await expect(page.getByTestId(DYNAMIC.route('r2', '10.0.13.0/30'))).toHaveCount(0);
  await expect(page.getByTestId(DYNAMIC.route('r2', '10.4.0.0/24'))).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  await page.getByTestId(DYNAMIC.protocol('bgp')).click();
  await expect(note).toContainText('R1: 10.1.0.0/24 · R2: なし · R3: なし · R4: 10.4.0.0/24');
});

/**
 * TC-272 — a connected route reads 直結 in Japanese.
 *
 * Every other word in the table was translated; `direct` was not.
 */
test('a connected route’s next hop is translated in every protocol view', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/dynamic');
  const connected = page.getByTestId(DYNAMIC.route('r1', '10.1.0.0/24'));
  await expect(connected).toContainText('next-hop: direct');

  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  for (const protocol of ['rip', 'ospf', 'bgp'] as const) {
    await page.getByTestId(DYNAMIC.protocol(protocol)).click();
    await expect(connected).toContainText('次ホップ: 直結');
    await expect(connected).not.toContainText('direct');
  }
});
