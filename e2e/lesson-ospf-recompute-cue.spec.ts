import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids. */
const OSPF = {
  failLink: 'ospf-fail-link',
  cue: 'ospf-recompute-cue',
  routeTab: (routerId: string) => `ospf-route-tab-${routerId}`,
  changed: (routerId: string) => `ospf-route-tab-changed-${routerId}`,
  routeRow: (destination: string) => `ospf-route-row-${destination}`,
} as const;

const ROUTERS = ['r1', 'r2', 'r3', 'r4'] as const;

/**
 * TC-299 — failing the link says that every router recomputed, and marks the
 * tabs whose tables changed.
 *
 * R1's tab is the one open, so the learner saw R1's table change and nothing
 * that said R2's and R4's had changed too.
 */
test('failing the OSPF link points the learner at the other routers’ tables', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(OSPF.cue)).toHaveCount(0);
  for (const router of ROUTERS) await expect(page.getByTestId(OSPF.changed(router))).toHaveCount(0);

  await page.getByTestId(OSPF.failLink).click();
  await expect(page.getByTestId(OSPF.cue)).toBeVisible();
  await expect(page.getByTestId(OSPF.cue)).toContainText('every router recomputed its routes');
  await expect(page.getByTestId(OSPF.cue)).toContainText('R2 and R4 tabs');
  // Every router had a route to the failed link's own network.
  for (const router of ROUTERS) await expect(page.getByTestId(OSPF.changed(router))).toBeVisible();
  await expect(page.getByTestId(OSPF.routeTab('r2'))).toHaveText('R2');

  // The tables the cue sends the learner to read as they did.
  await page.getByTestId(OSPF.routeTab('r2')).click();
  const r2 = page.getByTestId(OSPF.routeRow('10.4.0.0/24'));
  await expect(r2).toContainText('10.0.12.1');
  await expect(r2.locator('td').last()).toHaveText('6');
  await expect(page.getByTestId(OSPF.routeRow('10.0.24.0/30'))).toHaveCount(0);
  await page.getByTestId(OSPF.routeTab('r4')).click();
  const r4 = page.getByTestId(OSPF.routeRow('10.1.0.0/24'));
  await expect(r4).toContainText('10.0.34.1');
  await expect(r4.locator('td').last()).toHaveText('3');

  // Restoring the link puts the tables back; nothing is left to point at.
  await page.getByTestId(OSPF.failLink).click();
  await expect(page.getByTestId(OSPF.cue)).toHaveCount(0);
  for (const router of ROUTERS) await expect(page.getByTestId(OSPF.changed(router))).toHaveCount(0);
});

test('the cue and the marks are in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/ospf-convergence');
  await page.evaluate(() => window.localStorage.setItem('netlab-locale', 'ja'));
  await page.reload();
  await demoPage.dismissBrief();

  await page.getByTestId(OSPF.failLink).click();
  await expect(page.getByTestId(OSPF.cue)).toContainText('すべてのルータが経路を計算し直しました');
  await expect(page.getByTestId(OSPF.cue)).toContainText('R2 と R4 のタブ');
  await expect(page.getByTestId(OSPF.changed('r2'))).toHaveAttribute('aria-label', '変化あり');
});
