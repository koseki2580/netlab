import { expect, test } from './fixtures/harness';

/** REQ-376 — SD-WAN: predict where voice goes in the rush, then read each link's fit (TC-1823). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1823: a wrong prediction is marked, and in the rush voice uses LTE and video MPLS', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/sd-wan');
  await expect(page.getByTestId('sdwan-policies')).toContainText('音声通話');
  await expect(page.getByTestId('sdwan-reveal-button')).toBeDisabled();
  // The links' measurements stay hidden until a prediction is revealed.
  await expect(page.getByTestId('sdwan-periods')).toHaveCount(0);
  await page.getByTestId('sdwan-guess-mpls').click();
  await page.getByTestId('sdwan-reveal-button').click();
  await expect(page.getByTestId('sdwan-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('sdwan-reveal')).toContainText('LTE');
  await expect(page.getByTestId('sdwan-period-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('sdwan-cell-lte-voice')).toHaveAttribute('data-chosen', 'true');
  await expect(page.getByTestId('sdwan-cell-mpls-video')).toHaveAttribute('data-chosen', 'true');
  await expect(page.getByTestId('sdwan-cell-internet-backup')).toHaveAttribute(
    'data-chosen',
    'true',
  );
  await expect(page.getByTestId('sdwan-cell-internet-voice')).toHaveAttribute(
    'title',
    'jitter 40 > 30 ms, loss 3 > 1 %',
  );
  // Before the rush every kind of traffic rides the cheap internet line.
  await page.getByTestId('sdwan-period-0').click();
  for (const policy of ['voice', 'video', 'backup']) {
    await expect(page.getByTestId(`sdwan-cell-internet-${policy}`)).toHaveAttribute(
      'data-chosen',
      'true',
    );
  }
  // Late at night the internet line is good again, and voice moves back.
  await page.getByTestId('sdwan-period-3').click();
  await expect(page.getByTestId('sdwan-cell-internet-voice')).toHaveAttribute(
    'data-chosen',
    'true',
  );
});
