import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-025 — the canvas's own controls follow the theme it was given.
 *
 * A canvas dropped into a light-mode page still draws viewport controls, and
 * they belong to the canvas rather than to the host: a dark control cluster in
 * the corner of an otherwise light diagram reads as a rendering fault. The
 * embed demo shows the same topology twice, once in each theme, which is the
 * one place both are on screen together.
 */
function brightness(color: string): number {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+/g) ?? []).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('viewport controls are drawn in the theme of the canvas they sit on', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/embed');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const controlsIn = (scope: ReturnType<typeof page.getByTestId> | typeof page) =>
    scope.getByTestId(SEL.maxGraph.controls).first();

  const lightHost = page.getByTestId(SEL.embed.lightHost);
  await expect(controlsIn(lightHost)).toBeVisible();

  const buttonBackground = async (controls: ReturnType<typeof page.getByTestId>) =>
    controls.evaluate((element) => {
      const button = element.querySelector('button');
      return button ? getComputedStyle(button).backgroundColor : '';
    });

  const light = await buttonBackground(controlsIn(lightHost));
  const dark = await buttonBackground(controlsIn(page));

  expect(light, 'the light canvas does not reuse the dark chrome').not.toBe(dark);
  expect(brightness(light), 'controls on a light canvas are drawn light').toBeGreaterThan(
    brightness(dark),
  );
});
