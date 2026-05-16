import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

async function openSandbox(page: Page) {
  await page.goto('/?sandbox=1#/networking/arp');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
}

test.describe('sandbox layout at 1280x800 (wide mode)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('canvas-surface and sandbox-panel do not overlap horizontally', async ({ page }) => {
    await openSandbox(page);

    const slot = page.locator('[data-testid="sandbox-canvas-slot"]');
    const panel = page.locator('[data-testid="sandbox-panel"]');
    await expect(slot).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-layout-mode', 'wide');

    const slotBox = await slot.boundingBox();
    const panelBox = await panel.boundingBox();
    if (!slotBox || !panelBox) throw new Error('bounding boxes were not measurable');

    expect(slotBox.x + slotBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  });

  test('PacketViewerPanel is fully visible while the sandbox is open', async ({ page }) => {
    await openSandbox(page);

    const panel = page.locator('[data-testid="sandbox-panel"]');
    const viewer = page.locator('[data-testid="packet-viewer-panel"]').first();
    await expect(viewer).toBeVisible();

    const panelBox = await panel.boundingBox();
    const viewerBox = await viewer.boundingBox();
    if (!panelBox || !viewerBox) throw new Error('bounding boxes were not measurable');

    expect(viewerBox.x + viewerBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  });

  test('collapsing the sandbox reclaims the canvas full width', async ({ page }) => {
    await openSandbox(page);

    const panel = page.locator('[data-testid="sandbox-panel"]');
    await page.getByLabel('Collapse sandbox').click();
    await expect(panel).toHaveCount(0);

    const slot = page.locator('[data-testid="sandbox-canvas-slot"]');
    const slotBox = await slot.boundingBox();
    const viewportSize = page.viewportSize();
    if (!slotBox || !viewportSize) throw new Error('viewport / slot not measurable');

    expect(slotBox.width).toBeGreaterThanOrEqual(viewportSize.width - 60);
  });

  test('resize handle is keyboard-operable and persists across reload', async ({ page }) => {
    await openSandbox(page);

    const handle = page.locator('[data-testid="sandbox-panel-resize-handle"]');
    await expect(handle).toBeVisible();
    await handle.focus();
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('ArrowLeft');
    }
    const persisted = await page.evaluate(() =>
      window.localStorage.getItem('netlab.sandbox.width'),
    );
    expect(Number(persisted)).toBeGreaterThan(320);

    await page.reload();
    await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
    const restored = await page.evaluate(() => window.localStorage.getItem('netlab.sandbox.width'));
    expect(restored).toBe(persisted);
  });
});

test.describe('sandbox layout at 800x1000 (drawer mode)', () => {
  test.use({ viewport: { width: 800, height: 1000 } });

  test('sandbox-panel is a bottom drawer pinned full-width below the canvas', async ({ page }) => {
    await openSandbox(page);

    const surface = page.locator('[data-testid="sandbox-surface"]');
    await expect(surface).toHaveAttribute('data-layout-mode', 'drawer');

    const slot = page.locator('[data-testid="sandbox-canvas-slot"]');
    const panel = page.locator('[data-testid="sandbox-panel"]');
    await expect(panel).toHaveAttribute('data-layout-mode', 'drawer');

    const slotBox = await slot.boundingBox();
    const panelBox = await panel.boundingBox();
    if (!slotBox || !panelBox) throw new Error('bounding boxes were not measurable');

    expect(slotBox.y + slotBox.height).toBeLessThanOrEqual(panelBox.y + 1);
    expect(panelBox.width).toBeGreaterThanOrEqual(slotBox.width - 1);
  });

  test('drawer-mode sandbox is axe-clean', async ({ page }) => {
    await openSandbox(page);
    const results = await new AxeBuilder({ page })
      .include('[data-testid="sandbox-surface"]')
      .exclude('.react-flow__renderer')
      .exclude('.react-flow__attribution')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
