import { expect, test } from './fixtures/harness';

/** REQ-438 — 5G user plane: N3 overhead, inner MTU and MSS, handover (TC-2495, TC-2496). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2495: a 1500-byte N3 transport leaves an inner MTU of 1456 and an MSS of 1416', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mobile-core');
  await expect(page.getByTestId('mc-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('mc-reveal')).toHaveCount(0);
  await expect(page.getByTestId('mc-headers')).toHaveCount(0);
  await page.getByTestId('mc-guess-no-extension').click();
  await page.getByTestId('mc-reveal-button').click();
  await expect(page.getByTestId('mc-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('mc-reveal')).toHaveAttribute('data-mtu', '1456');
  await expect(page.getByTestId('mc-reveal')).toHaveAttribute('data-mss', '1416');
  await expect(page.getByTestId('mc-result')).toHaveAttribute('data-overhead', '44');
  await page.getByTestId('mc-outer-ipv6').click();
  await expect(page.getByTestId('mc-result')).toHaveAttribute('data-mtu', '1436');
  await page.getByTestId('mc-mtu').fill('1544');
  await page.getByTestId('mc-outer-ipv4').click();
  await expect(page.getByTestId('mc-result')).toHaveAttribute('data-mtu', '1500');
});

test('TC-2496: a handover keeps the UE’s IP and anchor and moves only the N3 downlink end', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mobile-core');
  await page.getByTestId('mc-guess-full').click();
  await page.getByTestId('mc-reveal-button').click();
  await expect(page.getByTestId('mc-ho-reveal-button')).toBeDisabled();
  await page.getByTestId('mc-ho-guess-everything').click();
  await page.getByTestId('mc-ho-reveal-button').click();
  await expect(page.getByTestId('mc-ho-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('mc-ho-reveal')).toHaveAttribute('data-changed', 'downlink');
  await expect(page.getByTestId('mc-row-ueIp')).toHaveAttribute('data-changed', 'false');
  await expect(page.getByTestId('mc-row-anchor')).toHaveAttribute('data-changed', 'false');
  await expect(page.getByTestId('mc-row-downlink')).toHaveAttribute('data-changed', 'true');
  await page.getByTestId('mc-serving-gnb1').click();
  await expect(page.getByTestId('mc-row-downlink')).toHaveAttribute('data-changed', 'false');
});

test('TC-2653: the smallest transport MTU that lets the UE keep 1500 bytes is reached by moving the transport MTU', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mobile-core');
  await page.getByTestId('mc-guess-full').click();
  await page.getByTestId('mc-reveal-button').click();
  const challenge = page.getByTestId('challenge-ue-keeps-1500');
  await expect(challenge).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-ue-keeps-1500-hint')).toHaveCount(0);
  await page.getByTestId('challenge-ue-keeps-1500-hint-button').click();
  await expect(page.getByTestId('challenge-ue-keeps-1500-hint')).toBeVisible();
  await page.getByTestId('mc-mtu').fill('1544');
  await expect(page.getByTestId('mc-result')).toHaveAttribute('data-mtu', '1500');
  await expect(challenge).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-ue-keeps-1500-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
