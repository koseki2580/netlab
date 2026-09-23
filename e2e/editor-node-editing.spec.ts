import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-171 — a device opened on the editor canvas can be edited.
 *
 * The editor's whole point is building a network and running it, and the run
 * button's own advice is to give two devices an address first. Selection was
 * never wired to the inspector, so pressing a device highlighted it on the
 * canvas and the rail went on showing "select a device to edit it" — the
 * advice could not be followed, and the editor was half dead.
 */
test('pressing a device on the editor canvas opens its editor', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/editor');

  await page.getByTestId(SEL.editor.sidebarTab('node')).click();
  await expect(
    page.getByTestId(SEL.editor.nodeEditorEmpty),
    'the rail starts by asking for a selection',
  ).toBeVisible();

  // A client keeps its address on the device itself, which is the field the
  // run button asks a learner to fill in.
  await page
    .getByTestId(SEL.canvas.node)
    .filter({ has: page.locator('[data-node-kind="client"]') })
    .first()
    .click();

  await expect(
    page.getByTestId(SEL.editor.nodeEditor),
    'the device opens its editor',
  ).toBeVisible();
  const ip = page.getByTestId(SEL.editor.nodeIp);
  await expect(ip).toBeVisible();

  // The address can actually be set, which is what the run button asks for.
  await ip.fill('10.9.9.9');
  await ip.blur();
  await expect(ip).toHaveValue('10.9.9.9');
});
