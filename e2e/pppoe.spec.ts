import { expect, test } from './fixtures/harness';

/** REQ-410 — PPPoE: discovery, the PMTUD black hole, MSS clamping and IPoE (TC-2148, TC-2149). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2148: without clamping the page hangs behind an ICMP filter, and clamping to 1452 fixes it', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pppoe');
  await expect(page.getByTestId('pppoe-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('pppoe-result')).toHaveCount(0);
  await page.getByTestId('pppoe-guess-slower').click();
  await page.getByTestId('pppoe-reveal-button').click();
  await expect(page.getByTestId('pppoe-reveal')).toHaveAttribute('data-right', 'false');
  const result = page.getByTestId('pppoe-result');
  await expect(result).toHaveAttribute('data-outcome', 'stalls');
  await expect(result).toHaveAttribute('data-mss', '1460');
  await expect(result).toHaveAttribute('data-dropped', '9');
  await expect(result).toHaveAttribute('data-inorder', '0');
  await page.getByTestId('pppoe-clamp').click();
  await expect(result).toHaveAttribute('data-outcome', 'loads');
  await expect(result).toHaveAttribute('data-mss', '1452');
  await expect(result).toHaveAttribute('data-dropped', '0');
  await expect(result).toHaveAttribute('data-inorder', '10000');
  await expect(page.getByTestId('pppoe-access-pppoe')).toHaveAttribute('data-mtu', '1492');
  await expect(page.getByTestId('pppoe-access-ipoe')).toHaveAttribute('data-mtu', '1500');
});

test('TC-2149: discovery broadcasts a PADI and sends the PADR to the chosen access concentrator', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pppoe');
  await expect(page.getByTestId('pppoe-overhead')).toHaveAttribute('data-mtu', '1492');
  await expect(page.getByTestId('pppoe-disc-0')).toHaveAttribute('data-code', 'PADI');
  await expect(page.getByTestId('pppoe-disc-0')).toHaveAttribute('data-dst', 'ff:ff:ff:ff:ff:ff');
  await expect(page.getByTestId('pppoe-disc-3')).toHaveAttribute('data-code', 'PADR');
  await expect(page.getByTestId('pppoe-disc-3')).toHaveAttribute('data-dst', '00:00:5e:00:53:01');
  await expect(page.getByTestId('pppoe-disc-4')).toHaveAttribute('data-session', String(0x2a17));
  await page.getByTestId('pppoe-ac-1').click();
  await expect(page.getByTestId('pppoe-disc-3')).toHaveAttribute('data-dst', '00:00:5e:00:53:02');
});
