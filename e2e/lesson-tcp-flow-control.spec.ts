import { expect, test } from './fixtures/harness';

const PATH = '/simulation/tcp-flow-control';

test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('TC-1070: stopping the application stops the sender, and an update restarts it', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto(PATH);
    await page.getByTestId('tcp-flow-speed-stops').check();
    await page.getByTestId('tcp-flow-run').click();

    const summary = page.getByTestId('tcp-flow-summary');
    await expect(summary).toContainText('8000 of 8000 bytes arrived');
    await expect(page.getByTestId('tcp-flow-stopped')).toContainText('the sender stopped');
    const rows = page.getByTestId('tcp-flow-rows');
    expect(await rows.locator('[data-kind="probe"]').count()).toBeGreaterThan(0);
    expect(await rows.locator('[data-kind="window-update"]').count()).toBeGreaterThan(0);
  });

  test('a fast application never makes the sender stop', async ({ page, demoPage }) => {
    await demoPage.goto(PATH);
    await page.getByTestId('tcp-flow-speed-fast').check();
    await page.getByTestId('tcp-flow-run').click();
    await expect(page.getByTestId('tcp-flow-never-stopped')).toBeVisible();
  });

  test('TC-1071: choosing an ACK shows that window in its header', async ({ page, demoPage }) => {
    await demoPage.goto(PATH);
    await page.getByTestId('tcp-flow-speed-stops').check();
    await page.getByTestId('tcp-flow-run').click();
    await expect(page.getByTestId('tcp-flow-summary')).toBeVisible();

    const ack = page.getByTestId('tcp-flow-rows').locator('[data-kind="ack"]').nth(1);
    const testId = await ack.getAttribute('data-testid');
    const index = (testId ?? '').replace('tcp-flow-row-', '');
    const shown = await page.getByTestId(`tcp-flow-window-${index}`).innerText();
    await page.getByTestId(`tcp-flow-pick-${index}`).click();
    await expect(page.getByTestId('tcp-flow-field-value')).toHaveText(shown);
  });

  test('TC-1072: the MSS the server announces bounds the segments', async ({ page, demoPage }) => {
    await demoPage.goto(PATH);
    await page.getByTestId('tcp-flow-mss-1000').check();
    await page.getByTestId('tcp-flow-run').click();
    await expect(page.getByTestId('tcp-negotiated-mss')).toContainText('1000 bytes');
    await expect(page.getByTestId('tcp-syn-options')).toContainText('MSS 1460');
    await expect(page.getByTestId('tcp-synack-options')).toContainText('MSS 1000');
    await expect(page.getByTestId('tcp-flow-delivered')).toContainText(
      'largest data segment carried 1000 bytes',
    );
  });

  test('TC-1074: the handshake lesson shows the options of the SYN', async ({ page, demoPage }) => {
    await demoPage.goto('/simulation/tcp-handshake');
    await page.getByTestId('tcp-connect').click();
    await page.getByTestId('tcp-more-detail').locator('summary').click();
    await page.getByTestId('tcp-jump-1').click();
    await expect(page.getByTestId('tcp-selected-options')).toContainText('MSS 1460');
    await expect(page.getByTestId('tcp-selected-window')).toContainText('65535');
    for (const jump of ['tcp-jump-2', 'tcp-jump-3']) {
      await page.getByTestId(jump).click();
    }
    await expect(page.getByTestId('tcp-negotiated')).toContainText('at most 1460 bytes', {
      timeout: 15000,
    });
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('TC-1073: the lesson reads in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto(PATH);
    await expect(page.getByTestId('lesson-lead')).toContainText('まだ入る');
    await page.getByTestId('tcp-flow-run').click();
    await expect(page.getByTestId('tcp-flow-delivered')).toContainText(
      '8000 バイトのうち 8000 バイトが届きました',
    );
    await expect(page.getByTestId('tcp-flow-stopped')).toContainText('送信側は止まりました');
  });
});

test.describe('a phone', () => {
  test.use({ appLocale: 'en', viewportPreset: 'phone' });

  test('the rows can be reached and the page does not scroll sideways', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto(PATH);
    await page.getByTestId('tcp-flow-run').click();
    await expect(page.getByTestId('tcp-flow-summary')).toBeVisible();
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);
  });
});
