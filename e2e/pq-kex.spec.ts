import { expect, test } from './fixtures/harness';

/** REQ-383 — post-quantum key exchange: predict the group that always holds, then the cost (TC-1874). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1874: only the hybrid holds in every case, and its ClientHello takes two segments', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/post-quantum');
  await expect(page.getByTestId('pq-reveal-button')).toBeDisabled();
  await page.getByTestId('pq-guess-mlkem768').click();
  await page.getByTestId('pq-reveal-button').click();
  await expect(page.getByTestId('pq-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('pq-x25519-quantum')).toHaveAttribute('data-holds', 'false');
  await expect(page.getByTestId('pq-mlkem768-mlkem-flaw')).toHaveAttribute('data-holds', 'false');
  for (const attacker of ['classical', 'quantum', 'mlkem-flaw']) {
    await expect(page.getByTestId(`pq-x25519mlkem768-${attacker}`)).toHaveAttribute(
      'data-holds',
      'true',
    );
  }
  await expect(page.getByTestId('pq-size-x25519')).toContainText('セグメント 1 個');
  await expect(page.getByTestId('pq-size-x25519mlkem768')).toContainText('1216 B');
  await expect(page.getByTestId('pq-size-x25519mlkem768')).toContainText('セグメント 2 個');
  await expect(page.getByTestId('pq-size-x25519mlkem768')).toContainText('0x11ec');
});
