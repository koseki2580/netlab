import { expect, test } from './fixtures/harness';

/** TC-1402 — the ARP lesson's same-network scene, opened from its address. */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('on one network the Client asks for the Printer itself', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/arp?scene=local');
    await expect(page.getByTestId('arp-scene-local')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('arp-local-note')).toContainText(
      'the Client asks for the Printer itself, not for the Router',
    );
    await page.getByTestId('demo-primary-action').click();
    const timeline = page.getByTestId('lesson-trace-timeline');
    await expect(timeline).toContainText('10.0.0.20');
    await expect(timeline).not.toContainText('who has 10.0.0.1?');
  });

  test('the scene buttons switch between the two', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/arp');
    await expect(page.getByTestId('arp-who-asks')).toBeVisible();
    await page.getByTestId('arp-scene-local').click();
    await expect(page.getByTestId('arp-local-note')).toBeVisible();
    await page.getByTestId('arp-scene-routed').click();
    await expect(page.getByTestId('arp-who-asks')).toBeVisible();
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'phone' });

  test('reads in Japanese on a phone', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/arp?fromExam=6&scene=local');
    await expect(page.getByTestId('arp-local-note')).toContainText(
      'Client は Router ではなく Printer そのものを聞きます',
    );
  });
});
