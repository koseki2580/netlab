import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-035 — one learner, one sitting, on a full-screen display.
 *
 * The rest of the suite checks pieces. This walks the path a person actually
 * takes: open a lesson, send a packet, read where it went, open a device, look
 * at its addresses, put it away, and step back to see the shape of the network.
 * Every step asserts what the learner would look for next, and every control is
 * pressed rather than merely found — Playwright refuses to click something that
 * is covered or still moving, which is the check that catches a panel landing
 * on top of the button a learner needs.
 */

const FULL_SCREEN = { width: 1920, height: 1080 };
/** A laptop, where the panels crowd the canvas and things start to overlap. */
const LAPTOP = { width: 1366, height: 768 };

/** Press a control the way a learner would, failing if it cannot be reached. */
async function press(control: Locator, what: string): Promise<void> {
  await expect(control, `${what} is on screen`).toBeVisible();
  // A trial click applies every actionability check — visible, stable, not
  // covered, receives pointer events — without firing the handler, so a failure
  // here means the control was unreachable rather than that it misbehaved.
  await control.click({ trial: true });
  await control.click();
}

async function assertNothingCoversTheCanvas(page: Page): Promise<void> {
  const canvas = page.getByTestId(SEL.canvas.root).first();
  const frame = await canvas.boundingBox();
  const device = page.getByTestId(SEL.canvas.node).first();
  const box = await device.boundingBox();
  expect(frame, 'the canvas has a frame').not.toBeNull();
  expect(box, 'a device is drawn').not.toBeNull();
  if (!frame || !box) return;
  expect(box.x + box.width, 'the network is inside its canvas').toBeLessThanOrEqual(
    frame.x + frame.width + 1,
  );
}

test('a learner opens a lesson, sends a packet, and reads what happened', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize(FULL_SCREEN);
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

  // The network is drawn before anything is asked of it.
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  await expect(page.locator('.netlab-edge').first()).toBeAttached();
  await assertNothingCoversTheCanvas(page);

  // Send a packet — the one thing every learner does first.
  await press(page.getByTestId(SEL.demo.primaryAction).first(), 'the send button');
  await demoPage.waitForTraceCount(1);

  // And read where it went.
  const hops = page.getByTestId(SEL.traceFilter.hop);
  await expect(hops.first(), 'the packet left a trail').toBeVisible();
  const hopCount = await hops.count();
  expect(hopCount, 'the packet crossed the network, not one link').toBeGreaterThan(1);

  // Open a hop: the learner wants the packet at that moment, not a summary.
  await press(hops.first(), 'the first hop');
  await expect(page.getByTestId(SEL.packetViewer.panel)).toBeVisible();
  await expect(page.getByTestId(SEL.packetViewer.panel)).not.toBeEmpty();
});

test('a learner opens a device, reads it, and puts it away', async ({ page, demoPage }) => {
  await page.setViewportSize(FULL_SCREEN);
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await press(page.getByTestId(SEL.canvas.node).first(), 'a device on the canvas');

  const close = page.getByTestId(SEL.nodeDetail.closePanel);
  await expect(close, 'opening a device opens its panel').toBeVisible();

  // The device that was opened is still reachable with its panel up — the panel
  // covers the right band of the canvas, and a learner who cannot see what they
  // just opened has lost their place.
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await press(close, 'the panel close button');
  await expect(close, 'the panel goes away again').toHaveCount(0);
});

test('a learner zooms out to see the shape of a network with areas', async ({ page, demoPage }) => {
  await page.setViewportSize(FULL_SCREEN);
  await demoPage.goto('/areas/dmz');

  const devices = page.getByTestId(SEL.canvas.node);
  const clusters = page.getByTestId(SEL.canvas.areaCluster);
  await expect(devices.first()).toBeVisible();
  await expect(clusters).toHaveCount(0);

  await devices.first().hover();
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(220);
  }

  // Zoomed out, the areas stand in for their devices — the shape before the
  // detail. Clicking one has to bring the detail back.
  await expect(clusters.first(), 'the areas collapsed').toBeVisible();
  await press(clusters.first(), 'a collapsed area');
  await expect(devices.first(), 'expanding brought its devices back').toBeVisible();
});

test('a learner builds a link in the editor and runs it', async ({ page, demoPage }) => {
  await page.setViewportSize(FULL_SCREEN);
  await demoPage.goto('/editor');
  await expect(page.getByTestId(SEL.editor.canvas)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const before = await page.getByTestId(SEL.canvas.node).count();
  await press(page.getByTestId(SEL.editor.paletteItem('router')), 'the router in the palette');
  await expect(page.getByTestId(SEL.canvas.node)).toHaveCount(before + 1);

  // The new device is on the canvas, not off in the coordinates the topology
  // happened to start at.
  const frame = (await page.getByTestId(SEL.editor.canvas).boundingBox())!;
  const devices = page.getByTestId(SEL.canvas.node);
  let onScreen = 0;
  for (let index = 0; index < (await devices.count()); index += 1) {
    const box = await devices.nth(index).boundingBox();
    if (box && box.x >= frame.x && box.x + box.width <= frame.x + frame.width) onScreen += 1;
  }
  expect(onScreen, 'every device including the new one is on the canvas').toBe(before + 1);

  // The inspector says what it wants when nothing is chosen, rather than
  // showing an empty rail.
  await expect(page.getByTestId(SEL.editor.sidebarTab('node'))).toBeVisible();
  await expect(page.getByTestId(SEL.editor.sidebarPanel('node'))).not.toBeEmpty();

  // And the run tab is reachable and reports itself.
  await press(page.getByTestId(SEL.editor.sidebarTab('history')), 'the run tab');
  await expect(page.getByTestId(SEL.editor.sidebarPanel('history'))).not.toBeEmpty();
});

test.describe('on a laptop, where the panels crowd', () => {
  test('the same lesson still works end to end', async ({ page, demoPage }) => {
    await page.setViewportSize(LAPTOP);
    await demoPage.goto('/routing/client-server');
    await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

    await press(page.getByTestId(SEL.demo.primaryAction).first(), 'the send button');
    await demoPage.waitForTraceCount(1);
    await press(page.getByTestId(SEL.traceFilter.hop).first(), 'the first hop');
    await expect(page.getByTestId(SEL.packetViewer.panel)).toBeVisible();

    await press(page.getByTestId(SEL.canvas.node).first(), 'a device');
    const close = page.getByTestId(SEL.nodeDetail.closePanel);
    await press(close, 'the panel close button');
    await expect(close).toHaveCount(0);
  });
});

test('a learner edits a device in the sandbox and takes the edit back', async ({
  page,
  sandboxPage,
}) => {
  await page.setViewportSize(FULL_SCREEN);
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.sandbox.panel)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  // Right-clicking a device is how the sandbox is reached from the diagram.
  await sandboxPage.rightClickNodeByLabel('R1');
  await press(page.getByTestId(SEL.sandbox.editPopover.mtuInput), 'the MTU field');
  await page.getByTestId(SEL.sandbox.editPopover.mtuInput).fill('500');
  await press(page.getByTestId(SEL.sandbox.editPopover.mtuApply), 'apply MTU');

  // The edit is listed where the learner can see what they changed.
  await press(page.getByTestId(SEL.sandbox.tabs.edits), 'the edits tab');
  await expect(page.getByTestId(SEL.sandbox.edits.list).first()).toBeVisible();

  // Compare mode puts before and after side by side, and comes back.
  await press(page.getByTestId(SEL.sandbox.modeSwitch), 'the mode switch');
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(2);
  await press(page.getByTestId(SEL.sandbox.modeSwitch), 'the mode switch back');
  await expect(page.getByTestId(SEL.canvas.root)).toHaveCount(1);

  // And taking it back leaves nothing behind. Reset asks first, through a
  // native confirm, which is part of the flow rather than an obstacle to it.
  page.once('dialog', (dialog) => void dialog.accept());
  await press(page.getByTestId(SEL.sandbox.edits.resetAll), 'reset all');
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toHaveCount(0);
});
