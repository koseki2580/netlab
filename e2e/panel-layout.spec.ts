import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * The shared lesson panels, read in Japanese at laptop sizes.
 *
 * Each test is one finding from a browser review: text that broke into one
 * glyph per line, an editor taller than the window, switches clipped out of
 * reach, a table that did not fit its rail, and two hint chips drawn over
 * each other. They assert geometry a learner would see, not styles.
 */

const TID = {
  sandboxHeader: 'sandbox-panel-header',
  sandboxPanel: 'sandbox-panel',
  sandboxUndo: 'sandbox-undo',
  sandboxRedo: 'sandbox-redo',
  sandboxExport: 'sandbox-export-session',
  sandboxTabTraffic: 'sandbox-tab-traffic',
  editPopover: 'sandbox-edit-popover',
  topologyNode: 'topology-node',
  failurePanel: 'failure-toggle-panel',
  failureList: 'failure-toggle-list',
  failureGroup: (name: string) => `failure-group-${name}`,
  sendFlow: 'observability-send-flow',
  flowEmpty: 'observability-flow-empty',
  flowExplainer: 'observability-flow-explainer',
  flowKind: 'observability-flow-kind',
  natGrid: 'nat-table-grid',
  natOutsidePeer: 'nat-outside-peer',
  stepAction: 'demo-primary-action',
  stepDestination: 'step-route-destination',
  stepNextHop: 'step-route-next-hop',
  stepVerdict: 'step-route-verdict',
  zeroStateHint: 'zero-state-hint',
  briefStrip: 'preflight-strip',
  briefStart: 'preflight-start',
} as const;

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
] as const;

async function readInJapanese(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* without storage the page stays English and the text checks fail loudly */
    }
  });
}

async function startLesson(page: Page, hash: string) {
  await page.goto(hash);
  const start = page.getByTestId(TID.briefStart);
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  }
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return rect;
}

/** True when the element's centre is on screen and nothing covers it. */
async function isReachable(locator: Locator): Promise<boolean> {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom > window.innerHeight || rect.top < 0) return false;
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit !== null && (hit === element || element.contains(hit));
  });
}

for (const size of SIZES) {
  test.describe(`at ${size.width}×${size.height}`, () => {
    test.use({ viewport: size });

    // TC-UX-PANEL-01
    test('the sandbox header keeps every label on one line inside the panel', async ({ page }) => {
      await readInJapanese(page);
      await page.goto('/?sandbox=1#/networking/arp');
      const panel = page.getByTestId(TID.sandboxPanel);
      await expect(panel).toBeVisible();
      const panelBox = await box(panel);

      const header = page.getByTestId(TID.sandboxHeader);
      const controls = header.locator('h2, button, label');
      const count = await controls.count();
      expect(count).toBeGreaterThan(8);
      for (let i = 0; i < count; i += 1) {
        const control = controls.nth(i);
        const rect = await box(control);
        // One line of 10-14px text is well under 30px tall.
        expect(rect.height).toBeLessThan(30);
        expect(rect.x + rect.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
      }
      await expect(page.getByTestId(TID.sandboxExport)).toHaveText('書き出す');
      await expect(page.getByTestId(TID.sandboxUndo)).toBeVisible();
      await expect(page.getByTestId(TID.sandboxRedo)).toBeVisible();

      const trafficTab = await box(page.getByTestId(TID.sandboxTabTraffic));
      expect(trafficTab.height).toBeLessThan(34);
    });

    // TC-UX-PANEL-02
    test('the router editor fits the window and its last section is reachable', async ({
      page,
    }) => {
      await readInJapanese(page);
      await page.goto('/?sandbox=1#/networking/arp');
      await expect(page.getByTestId(TID.sandboxPanel)).toBeVisible();
      await page
        .getByTestId(TID.topologyNode)
        .filter({ hasText: 'Router' })
        .first()
        .click({ button: 'right', force: true });
      const popover = page.getByTestId(TID.editPopover);
      await expect(popover).toBeVisible();

      const rect = await box(popover);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height).toBeLessThanOrEqual(size.height);

      const lastButton = popover.locator('button').last();
      expect(await isReachable(lastButton)).toBe(true);
    });

    // TC-UX-PANEL-03
    test('every failure switch can be reached', async ({ page }) => {
      await readInJapanese(page);
      await startLesson(page, '/#/simulation/data-transfer');
      const panel = page.getByTestId(TID.failurePanel);
      await expect(panel).toBeVisible();

      let reached = 0;
      for (const group of ['nodes', 'links', 'interfaces']) {
        await page.getByTestId(TID.failureGroup(group)).click();
        const switches = page.getByTestId(TID.failureList).locator('[role="switch"]');
        const count = await switches.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          expect(await isReachable(switches.nth(i))).toBe(true);
          reached += 1;
        }
      }
      // Four devices, three links, six interfaces on this lesson.
      expect(reached).toBe(13);
    });

    // TC-UX-PANEL-04
    test('the flow collector reads in its rail', async ({ page }) => {
      await readInJapanese(page);
      await startLesson(page, '/#/networking/observability');
      await expect(page.getByTestId(TID.flowEmpty)).toContainText('まだ通信はありません');
      await expect(page.getByTestId(TID.flowExplainer)).toContainText('sFlow');

      await page.getByTestId(TID.sendFlow).click();
      await expect(page.getByTestId(TID.flowKind).first()).toContainText('フローの記録を更新');

      const headers = page.locator('table[role="grid"] th');
      const count = await headers.count();
      expect(count).toBe(5);
      for (let i = 0; i < count; i += 1) {
        expect((await box(headers.nth(i))).height).toBeLessThan(30);
      }
    });

    // TC-UX-PANEL-05
    test('the NAT table shows its outside-peer column inside the panel', async ({ page }) => {
      await readInJapanese(page);
      await startLesson(page, '/#/simulation/nat');
      await page.locator('button').filter({ hasText: 'SNAT' }).first().click();
      const grid = page.getByTestId(TID.natGrid);
      await expect(grid).toBeVisible();
      const gridBox = await box(grid);
      const peerBox = await box(page.getByTestId(TID.natOutsidePeer).first());
      expect(peerBox.x + peerBox.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1);
      await expect(page.getByTestId(TID.natOutsidePeer).first()).toContainText(':');
    });

    // TC-UX-PANEL-06
    test('route candidates keep a visible gap and the verdict is Japanese', async ({ page }) => {
      await readInJapanese(page);
      await startLesson(page, '/#/simulation/step');
      const step = page.getByTestId(TID.stepAction).first();
      for (let i = 0; i < 3; i += 1) {
        if (await step.isEnabled()) await step.click();
      }
      const destination = page.getByTestId(TID.stepDestination).first();
      await expect(destination).toBeVisible();
      const destinationBox = await box(destination);
      const nextHopBox = await box(page.getByTestId(TID.stepNextHop).first());
      expect(nextHopBox.x - (destinationBox.x + destinationBox.width)).toBeGreaterThanOrEqual(6);
      await expect(page.getByTestId(TID.stepVerdict).first()).toContainText('に一致したので');
    });

    // TC-UX-PANEL-08
    test('the OSPF hint and the brief strip do not overlap', async ({ page }) => {
      await readInJapanese(page);
      await startLesson(page, '/#/routing/ospf-convergence');
      const hint = page.getByTestId(TID.zeroStateHint);
      const strip = page.getByTestId(TID.briefStrip);
      await expect(hint).toBeVisible();
      await expect(strip).toBeVisible();
      const a = await box(hint);
      const b = await box(strip);
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps).toBe(false);
    });
  });
}
