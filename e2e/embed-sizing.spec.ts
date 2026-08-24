import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-028 — an embedded canvas keeps the height it was given.
 *
 * `NetlabApp` takes a height because the page it is dropped into has no idea
 * how tall a network should be. Inside a flexible column that height is a
 * starting size, not a floor, and a squeezed column can take it to nothing —
 * which is what the embed demo showed: two of its three examples were empty
 * bands of page, on the page whose whole job is to demonstrate embedding.
 */
test('every embedded canvas on the embed demo has real height', async ({ page, demoPage }) => {
  await demoPage.goto('/embed');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();

  const canvases = page.getByTestId(SEL.canvas.root);
  await expect(canvases.first()).toBeAttached();
  const count = await canvases.count();
  expect(count, 'the demo shows more than one embed').toBeGreaterThan(1);

  for (let index = 0; index < count; index += 1) {
    const box = await canvases.nth(index).boundingBox();
    expect(box?.height ?? 0, `embed ${index} has height`).toBeGreaterThan(100);
    expect(box?.width ?? 0, `embed ${index} has width`).toBeGreaterThan(100);
  }
});
