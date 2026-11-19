import { expect, test } from './fixtures/harness';

/** REQ-389 — Network operations: predict the first event from unsynced logs, then compare NTP and SNMP (TC-1935). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1935: a wrong prediction is marked, NTP restores the true order, and a poll misses a short flap', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/net-ops');
  await expect(page.getByTestId('ops-log')).toContainText('<189>1');
  await expect(page.getByTestId('ops-reveal-button')).toBeDisabled();
  // The clocks' errors and the true order stay hidden until a prediction is revealed.
  await expect(page.getByTestId('ops-timeline')).toHaveCount(0);
  await page.getByTestId('ops-guess-router').click();
  await page.getByTestId('ops-reveal-button').click();
  await expect(page.getByTestId('ops-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ops-reveal')).toHaveAttribute('data-first', 'switch');
  // Without NTP the router sorts first and the switch last.
  await expect(page.getByTestId('ops-row-0')).toHaveAttribute('data-device', 'router');
  await expect(page.getByTestId('ops-row-3')).toHaveAttribute('data-device', 'switch');
  // With NTP the switch, which started it, sorts first.
  await page.getByTestId('ops-mode-ntp').click();
  await expect(page.getByTestId('ops-row-0')).toHaveAttribute('data-device', 'switch');
  await expect(page.getByTestId('ops-row-3')).toHaveAttribute('data-device', 'server');
  await expect(page.getByTestId('ops-pri-switch')).toHaveAttribute('data-pri', '187');
  await expect(page.getByTestId('ops-pri-firewall')).toHaveAttribute('data-pri', '164');
  // A 40 s flap is missed by the 5-minute poll; the trap reports it at once.
  await expect(page.getByTestId('ops-poll')).toHaveAttribute('data-learns', 'never');
  await expect(page.getByTestId('ops-trap')).toHaveAttribute('data-learns', '0');
  // A longer outage is still down at the next poll, 60 s in.
  await page.getByTestId('ops-flap').fill('120');
  await expect(page.getByTestId('ops-poll')).toHaveAttribute('data-learns', '60');
});
