import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const STP = {
  blockedLink: 'stp-blocked-link',
  priority: (switchId: string) => `stp-priority-${switchId}`,
  disablePort: (portId: string) => `stp-disable-port-${portId}`,
} as const;

/**
 * The spanning-tree lesson names the link it blocks, opens without a ping the
 * learner did not send, and follows a re-election when a priority changes.
 */
test('the spanning-tree lesson opens idle and names the blocked link', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: Switch B – Switch C');
  // Nothing has been sent yet, so there is no trace status to report.
  await expect(page.getByTestId(SEL.stp.traceStatus)).toHaveCount(0);
  await expect(page.getByTestId(SEL.stp.tracePath)).toHaveText('No trace yet');
});

test('re-electing the root moves the blocked link', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(STP.priority('switch-c')).fill('0');
  await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: Switch A – Switch B');
});

test('a port checkbox is named by the devices it joins', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const hostPort = page.locator('label', { has: page.getByTestId(STP.disablePort('ah')) });
  await expect(hostPort).toHaveText('Switch A → Host A');
});
