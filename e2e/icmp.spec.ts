import { ICMP_CASES } from '../demo/networking/icmpLesson';
import { expect, test } from './fixtures/harness';

/** REQ-368 — four situations: predict, send, and read the ICMP message that comes back (TC-1761). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1761: each situation brings back its ICMP message, and the predictions are counted', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/icmp');
  for (const [index, situation] of ICMP_CASES.entries()) {
    await expect(page.getByTestId('icmp-step')).toHaveAttribute('data-case', situation.id);
    await expect(page.getByTestId('icmp-send')).toBeDisabled();
    // The second prediction is wrong on purpose.
    const guess = index === 1 ? 'nothing' : situation.expected;
    await page.getByTestId(`icmp-guess-${guess}`).click();
    await page.getByTestId('icmp-send').click();
    const result = page.getByTestId('icmp-result');
    await expect(result).toHaveAttribute('data-kind', situation.expected);
    await expect(result).toHaveAttribute('data-right', String(index !== 1));
    await page.getByTestId('icmp-next').click();
  }
  await expect(page.getByTestId('icmp-summary')).toContainText(
    `${ICMP_CASES.length - 1} / ${ICMP_CASES.length}`,
  );
});

test('TC-1762: the router that cannot go on is the one that answers', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/icmp');
  for (const situation of ICMP_CASES.slice(0, 3)) {
    await page.getByTestId(`icmp-guess-${situation.expected}`).click();
    await page.getByTestId('icmp-send').click();
    if (situation.id === 'ttl')
      await expect(page.getByTestId('icmp-message')).toContainText('R1 (10.0.0.1)');
    if (situation.id === 'no-route') {
      await expect(page.getByTestId('icmp-message')).toContainText('R2 (10.0.1.2)');
      await expect(page.getByTestId('icmp-message')).toContainText('type 3, code 0');
    }
    await page.getByTestId('icmp-next').click();
  }
});
