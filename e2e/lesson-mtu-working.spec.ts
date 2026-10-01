import { expect, test } from './fixtures/harness';

/**
 * TC-283, TC-284 — the MTU lesson shows the sum behind its fragment count.
 *
 * The notes read 「断片の数: 5」 at a 300-byte tunnel MTU without saying why
 * five: 1208 bytes to carry, 280 in each fragment.
 */
test('the MTU notes work out the fragment count, and show no sum when nothing was fragmented', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/networking/mtu-fragmentation');

  const slider = page.getByTestId('mtu-tunnel-slider');
  const notes = page.getByTestId('mtu-trace-notes');
  const working = page.getByTestId('mtu-fragment-working');
  const ping = page.getByTestId('demo-primary-action');

  // TC-284: nothing has been sent yet.
  await expect(working).toHaveCount(0);

  // TC-283
  await ping.click();
  await expect(notes).toContainText('Fragments: 3');
  await expect(working).toContainText('1208 bytes to carry (1200 data + 8 ICMP header)');
  await expect(working).toContainText('each fragment carries 584 (MTU 604 − 20 IP header');
  await expect(working).toContainText('1208 = 2 × 584 + 40, so 3 fragments');

  await slider.fill('300');
  await ping.click();
  await expect(notes).toContainText('Fragments: 5');
  await expect(working).toContainText('1208 = 4 × 280 + 88, so 5 fragments');

  await slider.fill('628');
  await ping.click();
  await expect(notes).toContainText('Fragments: 2');
  await expect(working).toContainText('1208 = 1 × 608 + 600, so 2 fragments');

  // TC-284: the packet fits, so there is no sum.
  await slider.fill('1228');
  await ping.click();
  await expect(notes).toContainText('Fragments: 0');
  await expect(working).toHaveCount(0);
});
