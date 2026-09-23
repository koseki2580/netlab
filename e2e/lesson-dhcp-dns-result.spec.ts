import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-199 — the DHCP/DNS lesson says what each run did, in words.
 *
 * Learners in a trial answered the DNS question only by opening the client's
 * details and finding its cache; the lesson had no explanation and no result
 * beside its buttons. It now explains both services and states each outcome.
 */
test('running DHCP and then DNS states the address given and the name resolved', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* English is fine too */
    }
  });
  await demoPage.goto('/services/dhcp-dns');
  await expect(page.getByTestId(SEL.lesson.brief)).toBeVisible();

  await page.getByTestId('dhcp-run').click();
  await expect(page.getByTestId('dhcp-result'), 'the lease is stated').toContainText(
    /\d+\.\d+\.\d+\.\d+/,
  );

  await page.getByTestId('dns-run').click();
  const dns = page.getByTestId('dns-result');
  await expect(dns, 'the name and the address it became').toContainText('web.example.com');
  await expect(dns).toContainText('192.168.1.10');
});
