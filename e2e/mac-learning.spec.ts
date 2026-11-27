import { expect, test } from './fixtures/harness';

/** REQ-429 — MAC learning: predict each frame's egress ports, then a moved host and ageing (TC-2405, TC-2406). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2405: a fresh switch floods A → B and learns A on port 1, then forwards B → A by port 1 only', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mac-learning');
  await expect(page.getByTestId('ml-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ml-reveal')).toHaveCount(0);
  await expect(page.getByTestId('ml-table')).toHaveAttribute('data-size', '0');
  await page.getByTestId('ml-guess-port-2').click();
  await page.getByTestId('ml-reveal-button').click();
  await expect(page.getByTestId('ml-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ml-reveal')).toHaveAttribute('data-egress', '2,3,4');
  await expect(page.getByTestId('ml-table-A')).toHaveAttribute('data-port', '1');
  await page.getByTestId('ml-next').click();
  await expect(page.getByTestId('ml-reveal-button')).toBeDisabled();
  await page.getByTestId('ml-guess-port-1').click();
  await page.getByTestId('ml-reveal-button').click();
  await expect(page.getByTestId('ml-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('ml-reveal')).toHaveAttribute('data-egress', '1');
  await expect(page.getByTestId('ml-table')).toHaveAttribute('data-size', '2');
});

test('TC-2406: a silently moved host is sent to its old port, and an aged-out entry floods until the slider is under 300 s', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mac-learning');
  await expect(page.getByTestId('ml2')).toHaveCount(0);
  for (let frame = 1; frame <= 5; frame += 1) {
    await page.getByTestId('ml-guess-flood').click();
    await page.getByTestId('ml-reveal-button').click();
    if (frame < 5) await page.getByTestId('ml-next').click();
  }
  await expect(page.getByTestId('ml-table')).toHaveAttribute('data-size', '4');

  await expect(page.getByTestId('ml2-reveal-button')).toBeDisabled();
  await page.getByTestId('ml2-guess-port-3').click();
  await page.getByTestId('ml2-reveal-button').click();
  await expect(page.getByTestId('ml2-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ml2-reveal')).toHaveAttribute('data-egress', '1');
  await expect(page.getByTestId('ml2-reveal')).toHaveAttribute('data-delivered', 'false');

  await page.getByTestId('ml2-tab-aged').click();
  await expect(page.getByTestId('ml2-reveal-button')).toBeDisabled();
  await page.getByTestId('ml2-guess-port-1').click();
  await page.getByTestId('ml2-reveal-button').click();
  await expect(page.getByTestId('ml2-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ml2-reveal')).toHaveAttribute('data-egress', '1,3,4');
  await expect(page.getByTestId('ml2-aged-result')).toHaveAttribute('data-kind', 'flood');
  await page.getByTestId('ml2-idle').fill('120');
  await expect(page.getByTestId('ml2-aged-result')).toHaveAttribute('data-egress', '1');
  await expect(page.getByTestId('ml2-aged-result')).toHaveAttribute('data-kind', 'forward');
});

test('TC-2647: after the ageing reveal, a 420 s ageing time keeps A’s entry through 400 s of silence and reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mac-learning');
  for (let frame = 1; frame <= 5; frame += 1) {
    await page.getByTestId('ml-guess-flood').click();
    await page.getByTestId('ml-reveal-button').click();
    if (frame < 5) await page.getByTestId('ml-next').click();
  }
  await page.getByTestId('ml2-tab-aged').click();
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('ml2-guess-flood').click();
  await page.getByTestId('ml2-reveal-button').click();

  const first = page.getByTestId('challenge-keep-entry');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-keep-entry-hint')).toHaveCount(0);
  await page.getByTestId('challenge-keep-entry-hint-button').click();
  await expect(page.getByTestId('challenge-keep-entry-hint')).toBeVisible();

  await page.getByTestId('ml2-ageing').fill('420');
  await expect(page.getByTestId('ml2-aged-result')).toHaveAttribute('data-kind', 'forward');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-keep-entry-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
