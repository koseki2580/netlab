import { expect, test } from './fixtures/harness';

/** REQ-406 — NAT traversal: predict hole punching, see STUN/ICE/TURN outcomes (TC-2108, TC-2109). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2108: symmetric to port-restricted cone cannot connect directly, and ICE falls back to B’s relay', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/nat-traversal');
  await expect(page.getByTestId('nt-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('nt-trace')).toHaveCount(0);
  await page.getByTestId('nt-guess-direct').click();
  await page.getByTestId('nt-reveal-button').click();
  await expect(page.getByTestId('nt-reveal')).toHaveAttribute('data-right', 'false');
  const traceA = page.getByTestId('nt-trace-A');
  await expect(traceA).toHaveAttribute('data-reflexive', '198.51.100.1:40000');
  await expect(traceA).toHaveAttribute('data-used', '198.51.100.1:40001');
  await expect(traceA).toHaveAttribute('data-arrived', 'false');
  await expect(page.getByTestId('nt-grid-symmetric-port-restricted-cone')).toHaveAttribute(
    'data-works',
    'false',
  );
  await expect(page.getByTestId('nt-grid-symmetric-full-cone')).toHaveAttribute(
    'data-works',
    'true',
  );
  await expect(page.getByTestId('nt-priority-host')).toHaveAttribute('data-priority', '2130706431');
  await expect(page.getByTestId('nt-selected')).toHaveAttribute('data-pair', 'host>relay');
  await expect(page.getByTestId('nt-pair-host>relay')).toHaveAttribute(
    'data-priority',
    '72057594004373503',
  );
  const cost = page.getByTestId('nt-cost-result');
  await expect(cost).toHaveAttribute('data-rtt', '110');
  await expect(cost).toHaveAttribute('data-turn', '4000');
  await page.getByTestId('nt-bitrate').fill('4000');
  await expect(cost).toHaveAttribute('data-turn', '8000');
});

test('TC-2109: changing the NATs changes the pair ICE selects', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/nat-traversal');
  await page.getByTestId('nt-guess-relay').click();
  await page.getByTestId('nt-reveal-button').click();
  await expect(page.getByTestId('nt-reveal')).toHaveAttribute('data-right', 'true');
  await page.getByTestId('nt-nat-B-full-cone').click();
  await expect(page.getByTestId('nt-selected')).toHaveAttribute('data-pair', 'host>srflx');
  await expect(page.getByTestId('nt-cost-result')).toHaveAttribute('data-rtt', '40');
  await expect(page.getByTestId('nt-cost-result')).toHaveAttribute('data-turn', '0');
  await page.getByTestId('nt-nat-A-full-cone').click();
  await page.getByTestId('nt-nat-B-symmetric').click();
  await expect(page.getByTestId('nt-selected')).toHaveAttribute('data-pair', 'host>prflx');
});
