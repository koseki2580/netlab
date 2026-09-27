import { expect, test } from './fixtures/harness';

/**
 * TC-LESSON-TCP-STATES — the handshake states follow the step the learner is on.
 *
 * Learners pressed 「TCP で接続」 and saw both ends ESTABLISHED while the step
 * log was still on the SYN's ARP hops. The states are now derived from the
 * hops revealed so far, and stepping walks SYN → SYN-ACK → ACK in order.
 */
const TID = {
  connect: 'tcp-connect',
  clientCode: 'tcp-client-state-code',
  serverCode: 'tcp-server-state-code',
  next: 'demo-primary-action',
  position: 'step-exchange-position',
};

test('stepping the handshake changes each side only when a segment reaches it', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/simulation/tcp-handshake');
  await page.getByTestId(TID.connect).click();

  const client = page.getByTestId(TID.clientCode);
  const server = page.getByTestId(TID.serverCode);
  const next = page.getByTestId(TID.next);

  // Connected in the engine, but nothing has been stepped yet.
  await expect(page.getByTestId(TID.position)).toContainText('TCP SYN');
  await expect(client).toHaveText('CLOSED');
  await expect(server).toHaveText('LISTEN');

  await next.click();
  await expect(client).toHaveText('SYN_SENT');
  await expect(server).toHaveText('LISTEN');

  // Step until the server is SYN_RECEIVED: the client must not be ESTABLISHED yet.
  await expect(async () => {
    if ((await server.textContent()) !== 'SYN_RECEIVED') await next.click();
    await expect(server).toHaveText('SYN_RECEIVED', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await expect(client).toHaveText('SYN_SENT');

  // Play the rest through; both ends end ESTABLISHED.
  await expect(async () => {
    if (await next.isEnabled()) await next.click();
    await expect(next).toBeDisabled({ timeout: 500 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByTestId(TID.position)).toContainText('TCP ACK');
  await expect(client).toHaveText('ESTABLISHED');
  await expect(server).toHaveText('ESTABLISHED');
});
