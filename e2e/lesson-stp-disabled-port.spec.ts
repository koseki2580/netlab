import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const STP = {
  blockedLink: 'stp-blocked-link',
  disablePort: (portId: string) => `stp-disable-port-${portId}`,
  port: (portId: string) => `stp-port-${portId}`,
} as const;

/**
 * TC-259 — shutting one end of a link takes it down at both ends.
 *
 * Disabling Switch A → Switch B left Switch B's port toward Switch A reading
 * "DESIGNATED (FORWARDING)": a port forwarding into a dead one. The far end
 * now reads the link as down, in either direction, and the ping goes round
 * through Switch C without touching the dead link.
 */
for (const [shut, far] of [
  ['ab', 'ba'],
  ['ba', 'ab'],
] as const) {
  test(`disabling port ${shut} takes port ${far} down with it`, async ({ page, demoPage }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await demoPage.goto('/networking/stp');
    await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

    await page.getByTestId(STP.disablePort(shut)).check();

    await expect(page.getByTestId(STP.port(shut))).toContainText('DISABLED (DISABLED)');
    await expect(page.getByTestId(STP.port(far))).toContainText('DISABLED (link down)');
    await expect(page.getByTestId(STP.port(far))).not.toContainText('FORWARDING');
    // The loop is gone with the link, so nothing is left to block.
    await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: none');
    await expect(page.getByTestId(STP.port('bc'))).toContainText('ROOT (FORWARDING)');

    await page.getByTestId(SEL.stp.ping('ab')).click();
    await expect(page.getByTestId(SEL.stp.traceStatus)).toHaveText('Trace status: delivered');
    await expect(page.getByTestId(SEL.stp.tracePath)).toHaveText(
      'Host A → Switch A → Switch C → Switch B → Host B',
    );

    // Enabling the port again brings both ends back.
    await page.getByTestId(STP.disablePort(shut)).uncheck();
    await expect(page.getByTestId(STP.port('ab'))).toContainText('DESIGNATED (FORWARDING)');
    await expect(page.getByTestId(STP.port('ba'))).toContainText('ROOT (FORWARDING)');
  });
}
