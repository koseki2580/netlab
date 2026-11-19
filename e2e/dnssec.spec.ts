import { expect, test } from './fixtures/harness';

/** REQ-394 — DNSSEC: predict the validator's verdict, see each check, move the clock (TC-1986, TC-1987). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1986: a changed A record fails its signature at step 6 and the client gets SERVFAIL', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/dnssec');
  await expect(page.getByTestId('dnssec-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('dnssec-chain')).toHaveCount(0);
  await page.getByTestId('dnssec-scenario-tampered').click();
  await page.getByTestId('dnssec-guess-secure').click();
  await page.getByTestId('dnssec-reveal-button').click();
  await expect(page.getByTestId('dnssec-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('dnssec-step-5')).toHaveAttribute('data-result', 'pass');
  await expect(page.getByTestId('dnssec-step-6')).toHaveAttribute('data-failure', 'mismatch');
  await expect(page.getByTestId('dnssec-verdict')).toHaveAttribute('data-verdict', 'bogus');
  await expect(page.getByTestId('dnssec-verdict')).toHaveAttribute('data-rcode', 'SERVFAIL');
  await expect(page.getByTestId('dnssec-verdict')).toHaveAttribute('data-address', '');

  await page.getByTestId('dnssec-scenario-no-ds').click();
  await expect(page.getByTestId('dnssec-reveal-button')).toBeDisabled();
  await page.getByTestId('dnssec-guess-insecure').click();
  await page.getByTestId('dnssec-reveal-button').click();
  await expect(page.getByTestId('dnssec-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('dnssec-step-4')).toHaveAttribute('data-result', 'no-ds');
  await expect(page.getByTestId('dnssec-verdict')).toHaveAttribute('data-address', '192.0.2.10');
  await expect(page.getByTestId('dnssec-verdict')).toHaveAttribute('data-ad', 'false');
});

test('TC-1987: an expired signature is Bogus on day 40 and Secure again when the clock is moved inside its window', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/dnssec');
  await page.getByTestId('dnssec-scenario-expired').click();
  await expect(page.getByTestId('dnssec-clock')).toHaveCount(0);
  await page.getByTestId('dnssec-guess-secure').click();
  await page.getByTestId('dnssec-reveal-button').click();
  await expect(page.getByTestId('dnssec-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('dnssec-step-6')).toHaveAttribute('data-failure', 'expired');
  await expect(page.getByTestId('dnssec-clock-verdict')).toHaveAttribute('data-verdict', 'bogus');
  await page.getByTestId('dnssec-clock').fill('20');
  await expect(page.getByTestId('dnssec-clock-verdict')).toHaveAttribute('data-verdict', 'secure');
  await page.getByTestId('dnssec-clock').fill('0');
  await expect(page.getByTestId('dnssec-clock-verdict')).toHaveAttribute(
    'data-failure',
    'not-yet-valid',
  );
});
