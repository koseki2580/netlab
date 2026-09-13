import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-141 — a topology the product ships is not drawn as broken.
 *
 * "Minimal" is described in the gallery as "two nodes directly connected, the
 * simplest possible setup", and its one cable was painted red with a ✕ through
 * it. The canvas graded the authored link with the editor's construction rule,
 * which refuses to let someone wire two machines together directly — guidance
 * for building a network, not a fault in one. The simulator carries packets
 * across that cable perfectly well, so the picture contradicted both the
 * lesson's description and its own behaviour.
 */
const DIRECT_LINK_LESSONS = [
  '/basic/minimal',
  '/course',
  // Two links between the same pair is a port-channel, which is this lesson's
  // subject — not a network wired twice by mistake.
  '/networking/ha',
];

for (const path of DIRECT_LINK_LESSONS) {
  test(`no link is drawn as faulty on ${path}`, async ({ page, demoPage }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await demoPage.goto(path);
    await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

    // The fault colour is what a learner actually sees, so that is what this
    // reads — the red the canvas paints a link it considers wrong.
    const faulty = await page.locator('path').evaluateAll(
      (paths: Element[]) =>
        paths.filter((path) => {
          const stroke = window.getComputedStyle(path).stroke;
          return /248,\s*113,\s*113|239,\s*68,\s*68|185,\s*28,\s*28/.test(stroke);
        }).length,
    );

    expect(faulty, 'no cable is painted as a fault').toBe(0);
  });
}

/**
 * TC-144 — the TCP lesson's overlays follow the chosen theme.
 *
 * Two of them were painted `#020617dd`, a fixed near-black, while their text
 * used the theme's own colour. In the light theme that is dark text on a dark
 * box sitting on a white page: the state badge and the teaching-flow panel were
 * both unreadable, and the panel covered the sentence behind it.
 *
 * The light-theme sweep only caught this when the scan happened to land after
 * the overlay appeared, which is why it failed once and then passed three times
 * — so this reads the colour directly rather than relying on that race.
 */
test('the TCP lesson paints its overlays in the theme it was given', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  // Dark first: the gallery opens light, and a setting is only remembered once
  // it changes, so choosing Light alone would leave nothing stored.
  await page.getByTestId(SEL.gallery.themeMode('dark')).click();
  await page.waitForTimeout(120);
  await page.getByTestId(SEL.gallery.themeMode('light')).click();
  await page.waitForTimeout(220);

  await page.goto('/#/simulation/tcp-handshake');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

  for (const testId of [SEL.tcp.teachingFlow, SEL.tcp.clientState]) {
    const overlay = page.getByTestId(testId);
    await expect(overlay).toBeVisible();
    const luminance = await overlay.evaluate((element: HTMLElement) => {
      const [r, g, b] = window
        .getComputedStyle(element)
        .backgroundColor.match(/\d+/g)!
        .map(Number) as [number, number, number];
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    });
    expect(luminance, `${testId} is light in the light theme`).toBeGreaterThan(0.5);
  }
});

/**
 * TC-145 — the TCP lesson's two state badges are both visible.
 *
 * The teaching-flow panel sat in the top-right at a higher stacking order and
 * covered the Server State badge completely — on a lesson whose whole subject
 * is what the two ends' states do. Playwright called the badge "visible",
 * because it is in the document and has a size; it was simply painted over,
 * which is why this compares the boxes instead.
 */
test('neither TCP state badge is covered by the teaching panel', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/simulation/tcp-handshake');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const panel = await page.getByTestId(SEL.tcp.teachingFlow).boundingBox();
  expect(panel, 'the teaching panel is drawn').not.toBeNull();

  for (const testId of [SEL.tcp.clientState, SEL.tcp.serverState]) {
    const badge = await page.getByTestId(testId).boundingBox();
    expect(badge, `${testId} is drawn`).not.toBeNull();
    const overlaps =
      badge!.x < panel!.x + panel!.width &&
      panel!.x < badge!.x + badge!.width &&
      badge!.y < panel!.y + panel!.height &&
      panel!.y < badge!.y + badge!.height;
    expect(overlaps, `${testId} is not under the teaching panel`).toBe(false);
  }
});
