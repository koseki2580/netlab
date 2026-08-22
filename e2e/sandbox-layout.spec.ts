import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SandboxPage } from './pages/SandboxPage';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

async function openSandbox(page: Page, sandboxPage: SandboxPage) {
  await page.goto('/?sandbox=1#/networking/arp');
  await sandboxPage.expectMounted();
}

test.describe('sandbox layout at 1280x800 (wide mode)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('canvas-surface and sandbox-panel do not overlap horizontally', async ({
    page,
    sandboxPage,
  }) => {
    await openSandbox(page, sandboxPage);

    const slot = sandboxPage.canvasSlot();
    const panel = sandboxPage.panel();
    await expect(slot).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-layout-mode', 'wide');

    const slotBox = await slot.boundingBox();
    const panelBox = await panel.boundingBox();
    if (!slotBox || !panelBox) throw new Error('bounding boxes were not measurable');

    expect(slotBox.x + slotBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  });

  test('PacketViewerPanel is fully visible while the sandbox is open', async ({
    page,
    sandboxPage,
  }) => {
    await openSandbox(page, sandboxPage);

    const panel = sandboxPage.panel();
    const viewer = page.getByTestId(SEL.packetViewer.panel).first();
    await expect(viewer).toBeVisible();

    const panelBox = await panel.boundingBox();
    const viewerBox = await viewer.boundingBox();
    if (!panelBox || !viewerBox) throw new Error('bounding boxes were not measurable');

    expect(viewerBox.x + viewerBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  });

  test('collapsing the sandbox reclaims the canvas full width', async ({ page, sandboxPage }) => {
    await openSandbox(page, sandboxPage);

    await sandboxPage.collapse();
    await expect(sandboxPage.panel()).toHaveCount(0);

    const slotBox = await sandboxPage.canvasSlot().boundingBox();
    const viewportSize = page.viewportSize();
    if (!slotBox || !viewportSize) throw new Error('viewport / slot not measurable');

    expect(slotBox.width).toBeGreaterThanOrEqual(viewportSize.width - 60);
  });

  test('resize handle is keyboard-operable and persists across reload', async ({
    page,
    sandboxPage,
  }) => {
    await openSandbox(page, sandboxPage);

    const handle = sandboxPage.resizeHandle();
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
    await expect(sandboxPage.panel()).toBeVisible();
    const restored = await page.evaluate(() => window.localStorage.getItem('netlab.sandbox.width'));
    expect(restored).toBe(persisted);
  });
});

test.describe('sandbox layout at 800x1000 (drawer mode)', () => {
  test.use({ viewport: { width: 800, height: 1000 } });

  test('sandbox-panel is a bottom drawer pinned full-width below the canvas', async ({
    page,
    sandboxPage,
  }) => {
    await openSandbox(page, sandboxPage);

    const surface = sandboxPage.surface();
    await expect(surface).toHaveAttribute('data-layout-mode', 'drawer');

    const slot = sandboxPage.canvasSlot();
    const panel = sandboxPage.panel();
    await expect(panel).toHaveAttribute('data-layout-mode', 'drawer');

    const slotBox = await slot.boundingBox();
    const panelBox = await panel.boundingBox();
    if (!slotBox || !panelBox) throw new Error('bounding boxes were not measurable');

    expect(slotBox.y + slotBox.height).toBeLessThanOrEqual(panelBox.y + 1);
    expect(panelBox.width).toBeGreaterThanOrEqual(slotBox.width - 1);
  });

  test('drawer-mode sandbox is axe-clean', async ({ page, sandboxPage }) => {
    await openSandbox(page, sandboxPage);
    const results = await excludingCanvasInternals(new AxeBuilder({ page }))
      .include(`[data-testid="${SEL.sandbox.surface}"]`)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
