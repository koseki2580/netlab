import { expect, test } from './fixtures/harness';

/** REQ-413 — Wi-Fi roaming: predict the call, time the roams, move the threshold, trace CAPWAP paths (TC-2178, TC-2179). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2178: full 802.1X takes 260 ms and breaks the call, 802.11r takes 10 ms, and a nearer RADIUS server or a sticky threshold changes the result', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/wifi-roaming');
  await expect(page.getByTestId('roam-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('roam-times')).toHaveCount(0);
  await page.getByTestId('roam-guess-both').click();
  await page.getByTestId('roam-reveal-button').click();
  await expect(page.getByTestId('roam-reveal')).toHaveAttribute('data-right', 'false');
  const full = page.getByTestId('roam-total-full-8021x');
  await expect(full).toHaveAttribute('data-ms', '260');
  await expect(full).toHaveAttribute('data-survives', 'false');
  await expect(page.getByTestId('roam-total-ft')).toHaveAttribute('data-ms', '10');
  await expect(page.getByTestId('roam-total-ft')).toHaveAttribute('data-survives', 'true');
  await page.getByTestId('roam-radius').fill('10');
  await expect(full).toHaveAttribute('data-ms', '100');
  await expect(full).toHaveAttribute('data-survives', 'true');
  await expect(page.getByTestId('roam-points')).toHaveAttribute('data-points', '33,68');
  await page.getByTestId('roam-threshold').fill('-85');
  await expect(page.getByTestId('roam-points')).toHaveAttribute('data-points', '42,77');
});

test('TC-2179: central switching sends a packet through the WLC; local switching keeps it on the shortest wired path', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/wifi-roaming');
  await page.getByTestId('roam-guess-only-ft').click();
  await page.getByTestId('roam-reveal-button').click();
  await expect(page.getByTestId('roam-reveal')).toHaveAttribute('data-right', 'true');
  const path = page.getByTestId('roam-path');
  await expect(path).toHaveAttribute(
    'data-hops',
    'Phone A > AP1 > SW1 > Core > WLC > Core > SW2 > AP3 > Phone B',
  );
  await expect(path).toHaveAttribute('data-via-wlc', 'true');
  await page.getByTestId('roam-mode-local').click();
  await page.getByTestId('roam-dst-AP2').click();
  await expect(path).toHaveAttribute('data-hops', 'Phone A > AP1 > SW1 > AP2 > Phone B');
  await expect(path).toHaveAttribute('data-links', '2');
  await expect(path).toHaveAttribute('data-via-wlc', 'false');
});
