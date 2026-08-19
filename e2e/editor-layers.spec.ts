import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * The 3-pane editor, in a real browser.
 *
 * Every unit test of this surface mocks the graph engine, so nothing below the
 * seam is exercised there: whether a node actually appears on the canvas, and
 * whether hiding a layer actually removes it, can only be seen here.
 */
/** TC-001 — placing an element from the palette puts it on the canvas. */
test('places elements from the layer palette and paints them on the canvas', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/editor');

  const palette = page.getByTestId(SEL.editor.palette);
  await expect(palette).toBeVisible();
  // Grouped bottom-up through the stack, and only layers that have something.
  await expect(page.getByTestId(SEL.editor.paletteItem('switch'))).toBeVisible();
  await expect(page.getByTestId(SEL.editor.paletteItem('router'))).toBeVisible();
  await expect(page.getByTestId(SEL.editor.paletteItem('server'))).toBeVisible();

  // `data-node-kind` is the product's own attribute on the device glyph, so this
  // counts drawn devices without depending on the engine's generated markup.
  const nodes = page.getByTestId(SEL.editor.canvas).locator('[data-node-kind]');
  const before = await nodes.count();
  await page.getByTestId(SEL.editor.paletteItem('router')).click();
  await expect(nodes).toHaveCount(before + 1);
});

/** TC-003 — per-layer display actually adds and removes nodes on the canvas. */
test('hiding a layer removes its nodes from the canvas, and showing brings them back', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/editor');

  const canvas = page.getByTestId(SEL.editor.canvas);
  const l3Nodes = canvas.locator('[data-node-kind="router"]');
  const allNodes = canvas.locator('[data-node-kind]');
  const total = await allNodes.count();
  const routers = await l3Nodes.count();
  expect(routers).toBeGreaterThan(0);

  const toggle = page.getByTestId(SEL.editor.layerToggle('l3'));
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();

  // Hiding L3 must take its nodes off the canvas — this is the whole point of
  // per-layer display, and it is invisible to a test that mocks the engine.
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(allNodes).toHaveCount(total - routers);

  await toggle.click();
  await expect(allNodes).toHaveCount(total);
});

/** TC-006 — only the chosen inspector panel is present. */
test('the inspector rail shows one tab at a time, and the run tab starts empty', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/editor');

  await expect(page.getByTestId(SEL.editor.sidebar)).toBeVisible();
  await page.getByTestId(SEL.editor.sidebarTab('history')).click();
  await expect(page.getByTestId(SEL.editor.results)).toBeVisible();
  await expect(page.getByTestId(SEL.editor.historyEmpty)).toBeVisible();

  // Switching away unmounts it rather than hiding it, so its controls leave the
  // accessibility tree with it.
  await page.getByTestId(SEL.editor.sidebarTab('validation')).click();
  await expect(page.getByTestId(SEL.editor.results)).toHaveCount(0);
});

/**
 * TC-008 — a run is readable afterwards.
 * TC-101 (regression) — Run recorded nothing at all, because the editor
 * subscribed to a simulation context that it rendered itself.
 */
test('Run explains itself when it cannot run, and records a packet when it can', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/editor');

  const run = page.getByTestId(SEL.editor.run);
  await expect(run).toBeVisible();
  const label = await run.getAttribute('aria-label');
  expect(label, 'Run always says what it will do, or why it cannot').toBeTruthy();

  if (await run.isEnabled()) {
    await run.click();
    await page.getByTestId(SEL.editor.sidebarTab('history')).click();
    // A run that happened is a run the learner can read back.
    await expect(page.getByTestId(SEL.editor.historyEmpty)).toHaveCount(0);
  } else {
    expect(label).toContain('IP address');
  }
});

/** TC-009 — no WCAG 2 A/AA violations with the new panes on screen. */
test('the editor has no WCAG A/AA violations with the palette and rail on screen', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/editor');
  await expect(page.getByTestId(SEL.editor.palette)).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
