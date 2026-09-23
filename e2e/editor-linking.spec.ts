import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * The editor is where a learner builds a network of their own, and a browser
 * review found it could not be done: nothing showed where a link starts, a
 * refused link failed without a word, the run button changed nothing on the
 * screen, and the checks panel called a broken network fine.
 */
const IDS = {
  connectHandle: 'editor-connect-handle',
  refusal: 'editor-connect-refusal',
  runOutcome: 'editor-run-outcome',
  deviceIssue: 'editor-device-issue',
} as const;

async function openEditor(page: Page, demoPage: { goto(path: string): Promise<void> }) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage — the editor still works, in English */
    }
  });
  await demoPage.goto('/editor');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
}

function device(page: Page, label: string) {
  return page.getByTestId(SEL.canvas.node).filter({ hasText: label });
}

function links(page: Page) {
  return page.getByTestId(SEL.editor.canvas).locator('[data-edge-id]');
}

/** Hover a device, then drag from the connection point it shows onto another. */
async function drawLink(page: Page, from: string, to: string) {
  const source = await device(page, from).boundingBox();
  const target = await device(page, to).boundingBox();
  if (!source || !target) throw new Error(`devices ${from} / ${to} are not on the canvas`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  const handle = page.getByTestId(IDS.connectHandle).first();
  await expect(handle, 'hovering a device shows where a link starts').toBeVisible();
  const point = await handle.boundingBox();
  if (!point) throw new Error('the connection point has no box');
  await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 });
  await page.mouse.up();
}

/** TC-179 — a learner can link two devices, starting from a point they can see. */
test('a new device is named, opens its editor, and links to a switch', async ({
  page,
  demoPage,
}) => {
  await openEditor(page, demoPage);

  await page.getByTestId(SEL.editor.paletteItem('client')).click();
  await expect(device(page, 'Client-2'), 'named per kind, not by its internal id').toHaveCount(1);
  await expect(page.getByTestId(SEL.editor.nodeEditor), 'and its editor opens').toBeVisible();

  const before = await links(page).count();
  await drawLink(page, 'Client-2', 'SW-1');
  await expect(links(page), 'the drag drew a link').toHaveCount(before + 1);
});

/** TC-180 — a refused link says why, in words, and adds nothing. */
test('linking a client straight to a server is refused with a reason', async ({
  page,
  demoPage,
}) => {
  await openEditor(page, demoPage);

  const before = await links(page).count();
  await drawLink(page, 'Client-1', 'Server-1');

  const refusal = page.getByTestId(IDS.refusal);
  await expect(refusal, 'the refusal is explained').toBeVisible();
  await expect(refusal).toHaveText(/[ぁ-んァ-ヶ一-龯]{6,}/);
  await expect(links(page), 'and no link was added').toHaveCount(before);
});

/** TC-181 — running the network shows what happened, where the button is. */
test('running the starter network reports its outcome at once', async ({ page, demoPage }) => {
  await openEditor(page, demoPage);

  await page.getByTestId(SEL.editor.run).click();
  await expect(page.getByTestId(IDS.runOutcome), 'a one-line outcome by the button').toBeVisible();
  await expect(
    page.getByTestId(SEL.editor.sidebarTab('history')),
    'and the rail turns to the result',
  ).toHaveAttribute('aria-selected', 'true');
});

/** TC-182 — the checks name a device that cannot take part. */
test('the checks panel names a device that is linked to nothing', async ({ page, demoPage }) => {
  await openEditor(page, demoPage);

  await page.getByTestId(SEL.editor.paletteItem('router')).click();
  await page.getByTestId(SEL.editor.sidebarTab('validation')).click();
  await expect(
    page.getByTestId(IDS.deviceIssue).first(),
    'the new, unlinked router is reported',
  ).toBeVisible();
});

/** TC-183 — undo and redo work from the keyboard. */
test('Ctrl+Z takes back an added device and Ctrl+Y puts it back', async ({ page, demoPage }) => {
  await openEditor(page, demoPage);

  const start = await page.getByTestId(SEL.canvas.node).count();
  await page.getByTestId(SEL.editor.paletteItem('client')).click();
  await expect(page.getByTestId(SEL.canvas.node)).toHaveCount(start + 1);

  // Focus the canvas, not a text field: a shortcut must not steal typing.
  await page.getByTestId(SEL.editor.canvas).click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId(SEL.canvas.node), 'undo removes it').toHaveCount(start);
  await page.keyboard.press('Control+y');
  await expect(page.getByTestId(SEL.canvas.node), 'redo restores it').toHaveCount(start + 1);
});
