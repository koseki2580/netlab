import { expect, test } from './fixtures/harness';

/** REQ-401 — PIM: predict who still passes the RP, compare the trees, move the RP, RPF and SSM (TC-2057, TC-2058). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2057: after the switch only R6 still passes the RP, and moving the RP changes the shared-tree delays', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pim');
  await expect(page.getByTestId('pim-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('pim-trees')).toHaveCount(0);
  await page.getByTestId('pim-guess-all').click();
  await page.getByTestId('pim-reveal-button').click();
  await expect(page.getByTestId('pim-reveal')).toHaveAttribute('data-right', 'false');
  const r5 = page.getByTestId('pim-row-R5');
  await expect(r5).toHaveAttribute('data-before', '9');
  await expect(r5).toHaveAttribute('data-after', '5');
  await expect(r5).toHaveAttribute('data-via-rp', 'false');
  await expect(page.getByTestId('pim-row-R6')).toHaveAttribute('data-via-rp', 'true');
  await expect(page.getByTestId('pim-links')).toHaveAttribute('data-before-links', '5');
  await expect(page.getByTestId('pim-links')).toHaveAttribute('data-after-links', '6');
  await page.getByTestId('pim-rp-R6').click();
  await expect(r5).toHaveAttribute('data-before', '13');
  await expect(page.getByTestId('pim-row-R7')).toHaveAttribute('data-before', '11');
});

test('TC-2058: the RPF check drops a copy from the wrong neighbour, and SSM needs no RP', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pim');
  await page.getByTestId('pim-guess-r6').click();
  await page.getByTestId('pim-reveal-button').click();
  await expect(page.getByTestId('pim-reveal')).toHaveAttribute('data-right', 'true');
  const result = page.getByTestId('pim-rpf-result');
  await expect(result).toHaveAttribute('data-rpf', 'R4');
  await expect(result).toHaveAttribute('data-accepted', 'false');
  await page.getByTestId('pim-rpf-from-R4').click();
  await expect(result).toHaveAttribute('data-accepted', 'true');
  await page.getByTestId('pim-rpf-tree-shared').click();
  await expect(result).toHaveAttribute('data-rpf', 'R3');
  await expect(result).toHaveAttribute('data-accepted', 'false');
  await expect(page.getByTestId('pim-ssm')).toHaveAttribute('data-same', 'true');
  await expect(page.getByTestId('pim-ssm')).toHaveAttribute('data-links', '6');
});
