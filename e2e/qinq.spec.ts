import { expect, test } from './fixtures/harness';

/** REQ-442 — Q-in-Q: predict the core frame size, who receives a broadcast, and the VLAN space (TC-2547, TC-2548). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2547: the S-tag makes a 1522-byte frame 1526 bytes in the core, and a 1522-byte core leaves 1496 bytes of payload', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/qinq');
  await expect(page.getByTestId('qq-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('qq-hops')).toHaveCount(0);
  await page.getByTestId('qq-guess-plus-header').click();
  await page.getByTestId('qq-reveal-button').click();
  await expect(page.getByTestId('qq-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('qq-reveal')).toHaveAttribute('data-bytes', '1526');
  await expect(page.getByTestId('qq-hop-PE1-P')).toHaveAttribute('data-tags', 'S100/C10');
  await expect(page.getByTestId('qq-hop-PE2-A2')).toHaveAttribute('data-bytes', '1522');
  await expect(page.getByTestId('qq-fit')).toHaveAttribute('data-max-payload', '1500');
  await page.getByTestId('qq-core-1522').click();
  await expect(page.getByTestId('qq-fit')).toHaveAttribute('data-max-payload', '1496');
  await page.getByTestId('qq-payload').fill('1000');
  await expect(page.getByTestId('qq-hop-PE1-P')).toHaveAttribute('data-bytes', '1026');
});

test('TC-2548: two customers on VLAN 10 stay apart by S-VLAN, leak on one shared VLAN, and two tags give 16 760 836 VLANs', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/qinq');
  await expect(page.getByTestId('qq-who-reveal-button')).toBeDisabled();
  await page.getByTestId('qq-who-guess-dropped').click();
  await page.getByTestId('qq-who-reveal-button').click();
  await expect(page.getByTestId('qq-who-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('qq-who-reveal')).toHaveAttribute('data-delivered', 'A2');
  await page.getByTestId('qq-customer-B').click();
  await expect(page.getByTestId('qq-delivered')).toHaveAttribute('data-delivered', 'B2');
  await expect(page.getByTestId('qq-delivered')).toHaveAttribute('data-core-tags', 'S200/C10');
  await page.getByTestId('qq-mode-shared-vlan').click();
  await expect(page.getByTestId('qq-delivered')).toHaveAttribute('data-delivered', 'A2,B2');
  await expect(page.getByTestId('qq-delivered')).toHaveAttribute('data-core-tags', 'C10');

  await expect(page.getByTestId('qq-count-reveal-button')).toBeDisabled();
  await page.getByTestId('qq-count-guess-two-spaces').click();
  await page.getByTestId('qq-count-reveal-button').click();
  await expect(page.getByTestId('qq-count-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('qq-count-reveal')).toHaveAttribute('data-count', '16760836');
});

test('TC-2655: after the reveals, a 1496-byte payload on the 1522-byte core reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/qinq');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('qq-guess-plus-tag').click();
  await page.getByTestId('qq-reveal-button').click();
  await page.getByTestId('qq-who-guess-own').click();
  await page.getByTestId('qq-who-reveal-button').click();
  const first = page.getByTestId('challenge-fill-core');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-fill-core-hint')).toHaveCount(0);
  await page.getByTestId('challenge-fill-core-hint-button').click();
  await expect(page.getByTestId('challenge-fill-core-hint')).toBeVisible();
  await page.getByTestId('qq-core-1522').click();
  await page.getByTestId('qq-payload').fill('1496');
  await expect(page.getByTestId('qq-hop-PE1-P')).toHaveAttribute('data-bytes', '1522');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-fill-core-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
