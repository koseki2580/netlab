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
  position: 'step-exchange-position',
};

test.use({ viewportPreset: 'wide' });

test(
  'stepping the handshake changes each side only when a segment reaches it',
  { tag: '@smoke' },
  async ({ page, lessonPage }) => {
    await lessonPage.open('/simulation/tcp-handshake');
    await page.getByTestId(TID.connect).click();

    const client = page.getByTestId(TID.clientCode);
    const server = page.getByTestId(TID.serverCode);

    // Connected in the engine, but nothing has been stepped yet.
    await expect(page.getByTestId(TID.position)).toContainText('TCP SYN');
    await expect(client).toHaveText('CLOSED');
    await expect(server).toHaveText('LISTEN');

    await lessonPage.stepOnce();
    await expect(client).toHaveText('SYN_SENT');
    await expect(server).toHaveText('LISTEN');

    // Step until the server is SYN_RECEIVED: the client must not be ESTABLISHED yet.
    await lessonPage.stepUntil(async () => (await server.textContent()) === 'SYN_RECEIVED');
    await expect(server).toHaveText('SYN_RECEIVED');
    await expect(client).toHaveText('SYN_SENT');

    // Play the rest through; both ends end ESTABLISHED.
    await lessonPage.stepToEnd();
    await expect(lessonPage.next).toBeDisabled();
    await expect(page.getByTestId(TID.position)).toContainText('TCP ACK');
    await expect(client).toHaveText('ESTABLISHED');
    await expect(server).toHaveText('ESTABLISHED');
  },
);
