import { expect, test } from './fixtures/harness';

/** REQ-399 — DHCP relay: predict the offered address, follow each hop, break the relay, option 82 (TC-2036). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2036: the server offers from the giaddr pool, each hop carries its own addresses, misconfigurations get no OFFER, and option 82 picks by port', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/dhcp-relay');
  await expect(page.getByTestId('relay-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('relay-trace')).toHaveCount(0);
  await page.getByTestId('relay-guess-first-pool').click();
  await page.getByTestId('relay-reveal-button').click();
  await expect(page.getByTestId('relay-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('relay-reveal')).toHaveAttribute('data-offered', '10.0.20.100');

  const toServer = page.getByTestId('relay-hops-relay-to-server');
  await expect(toServer).toHaveAttribute('data-dst', '10.0.100.5');
  await expect(toServer).toHaveAttribute('data-giaddr', '10.0.20.1');
  await expect(toServer).toHaveAttribute('data-hops', '1');
  await expect(page.getByTestId('relay-hops-client-to-relay')).toHaveAttribute(
    'data-dst',
    '255.255.255.255',
  );
  await expect(page.getByTestId('relay-hops-server-to-relay')).toHaveAttribute(
    'data-dst',
    '10.0.20.1',
  );

  await page.getByTestId('relay-scenario-vlan10-only').click();
  await expect(page.getByTestId('relay-outcome')).toHaveAttribute('data-outcome', 'no-helper');
  await expect(page.getByTestId('relay-outcome')).toHaveAttribute('data-packets', '1');
  await page.getByTestId('relay-scenario-no-pool').click();
  await expect(page.getByTestId('relay-outcome')).toHaveAttribute('data-outcome', 'no-pool');
  await expect(page.getByTestId('relay-hops-relay-to-server')).toHaveAttribute(
    'data-giaddr',
    '10.0.30.1',
  );

  await expect(page.getByTestId('relay-port-result')).toHaveAttribute(
    'data-offered',
    '10.0.20.100',
  );
  await page.getByTestId('relay-port-Gi1-0-7').click();
  await expect(page.getByTestId('relay-port-result')).toHaveAttribute('data-offered', '10.0.20.50');
  await expect(page.getByTestId('relay-port-result')).toHaveAttribute(
    'data-selected-by',
    'circuit-id',
  );
});
