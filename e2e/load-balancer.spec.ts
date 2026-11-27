import { expect, test } from './fixtures/harness';

/** REQ-373 — predict, compare three algorithms, use a health check, and send one request (TC-1794). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1794: least connections evens out the long requests; a down server gets none; the VIP is rewritten', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/load-balancer');
  await expect(page.getByTestId('lb-reveal-button')).toBeDisabled();
  await page.getByTestId('lb-guess-least-connections').click();
  await page.getByTestId('lb-reveal-button').click();
  await expect(page.getByTestId('lb-reveal')).toHaveAttribute('data-right', 'true');

  const server = (name: string) =>
    page.getByTestId('lb-servers').locator(`[data-server="${name}"]`);
  await expect(server('web1')).toHaveAttribute('data-peak', '3');
  await expect(server('web2')).toHaveAttribute('data-peak', '1');
  await page.getByTestId('lb-algorithm-least-connections').click();
  await expect(server('web1')).not.toHaveAttribute('data-peak', '3');

  await page.getByTestId('lb-up-web2').click();
  await expect(server('web2')).toHaveAttribute('data-requests', '0');

  await page.getByTestId('lb-row-2').click();
  await page.getByTestId('lb-send-button').click();
  await expect(page.getByTestId('lb-sent')).toContainText('203.0.113.10:80');
  await expect(page.getByTestId('lb-sent')).toContainText('書き換え');
});

test('TC-2683: after the reveal, least connections with every server in reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/load-balancer');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('lb-guess-round-robin').click();
  await page.getByTestId('lb-reveal-button').click();
  const first = page.getByTestId('challenge-busiest-two');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-busiest-two-hint')).toHaveCount(0);
  await page.getByTestId('challenge-busiest-two-hint-button').click();
  await expect(page.getByTestId('challenge-busiest-two-hint')).toBeVisible();
  await page.getByTestId('lb-algorithm-least-connections').click();
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-busiest-two-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
