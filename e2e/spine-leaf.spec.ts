import { expect, test } from './fixtures/harness';

/** REQ-385 — spine-leaf fabrics: predict what a failed spine costs, then fail more (TC-1892). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1892: one spine of four down leaves 75 % and three hops; all down cuts the leaves off', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/spine-leaf');
  await expect(page.getByTestId('sl-reveal-button')).toBeDisabled();
  await page.getByTestId('sl-guess-50').click();
  await page.getByTestId('sl-reveal-button').click();
  await expect(page.getByTestId('sl-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('sl-uplink')).toHaveText('300 Gbit/s (75 %)');
  await expect(page.getByTestId('sl-hops')).toHaveText('3');
  await expect(page.getByTestId('sl-ratio')).toHaveText('4 : 1');
  await expect(page.getByTestId('sl-links')).toHaveText('32');
  await page.getByTestId('sl-spine-2').click();
  await expect(page.getByTestId('sl-ratio')).toHaveText('3 : 1');
  for (const spine of [1, 2, 3, 4]) await page.getByTestId(`sl-spine-${spine}`).click();
  await expect(page.getByTestId('sl-hops')).toHaveText('なし（切れる）');
});
