import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { boxesOf, settled } from './fixtures/settle';

/**
 * TC-2361 — on a 390×844 phone, the text drawn in the spine-leaf, MPTCP, L4S
 * and anycast diagrams, and the letters on the VPC lesson's devices, is 9 CSS
 * px or more once the prediction is revealed (REQ-427). Before, the diagrams
 * were scaled down to fit the phone and their labels drawn 8.3–8.9 px high.
 */
test.use({ viewportPreset: 'phone', hasTouch: true });

const READABLE_PX = 9;

/**
 * The smallest text inside `root`'s SVGs, in CSS pixels on screen: each text's
 * font size times the scale its SVG is drawn at (its on-screen height over its
 * height in the SVG's own units).
 */
async function smallestSvgText(root: Locator): Promise<number> {
  const sizes = await root.evaluate((element) =>
    [...element.querySelectorAll<SVGTextElement>('svg text')]
      .filter((text) => (text.textContent ?? '').trim().length > 0)
      .map((text) => {
        const drawn = text.getBBox().height;
        const shown = text.getBoundingClientRect().height;
        const scale = drawn > 0 ? shown / drawn : 1;
        return parseFloat(getComputedStyle(text).fontSize) * scale;
      }),
  );
  expect(sizes.length).toBeGreaterThan(0);
  return Math.min(...sizes);
}

/** Choose the first prediction and reveal the answer. */
async function predictAndReveal(page: Page, prefix: string): Promise<void> {
  const guess = page.locator(`[data-testid^="${prefix}-guess-"]`).first();
  await guess.scrollIntoViewIfNeeded();
  await guess.tap();
  const reveal = page.getByTestId(`${prefix}-reveal-button`);
  await reveal.scrollIntoViewIfNeeded();
  await reveal.tap();
}

const DIAGRAMS = [
  { path: '/networking/spine-leaf', prefix: 'sl', diagram: 'sl-drawing' },
  { path: '/networking/mptcp', prefix: 'mptcp', diagram: 'mptcp-chart' },
  { path: '/networking/l4s', prefix: 'l4s', diagram: 'l4s-chart' },
  { path: '/networking/anycast', prefix: 'any', diagram: 'any-map' },
] as const;

for (const { path, prefix, diagram } of DIAGRAMS) {
  test(`TC-2361: the ${diagram} text is ${READABLE_PX}px or more on a phone`, async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto(path);
    await demoPage.dismissBrief();
    await predictAndReveal(page, prefix);
    const svg = page.getByTestId(diagram);
    await svg.scrollIntoViewIfNeeded();
    await expect(svg).toBeVisible();
    expect(await smallestSvgText(svg)).toBeGreaterThanOrEqual(READABLE_PX);
  });
}

test(`TC-2361: the VPC lesson's device letters are ${READABLE_PX}px or more on a phone`, async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/vpc');
  await demoPage.dismissBrief();
  const nodes = page.getByTestId('topology-node');
  await expect(nodes.first()).toBeVisible();
  // Let the canvas settle on its final fit.
  await settled(() => boxesOf(nodes), { what: 'the fit' });
  expect(await smallestSvgText(page.getByTestId('netlab-canvas'))).toBeGreaterThanOrEqual(
    READABLE_PX,
  );
});
