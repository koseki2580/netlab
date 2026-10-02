import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const STP = {
  blockedLink: 'stp-blocked-link',
  blockedEnd: 'stp-blocked-end',
  priority: (switchId: string) => `stp-priority-${switchId}`,
  disablePort: (portId: string) => `stp-disable-port-${portId}`,
} as const;

/**
 * TC-305 — the blocked-link summary says which end of the link blocks.
 *
 * "Blocked link: Switch A – Switch B" left the learner scrolling to the
 * port-role list to find out which switch holds the blocking port.
 */
test('the blocked-link summary names the end that blocks, and follows a re-election', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: Switch B – Switch C');
  await expect(page.getByTestId(STP.blockedEnd)).toHaveText("(blocked at Switch C's end)");

  await page.getByTestId(STP.priority('switch-c')).fill('0');
  await page.getByTestId(STP.priority('switch-b')).fill('4096');
  await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: Switch A – Switch B');
  await expect(page.getByTestId(STP.blockedEnd)).toHaveText("(blocked at Switch B's end)");

  // With no loop left there is no blocked link, and so no end to name.
  await page.getByTestId(STP.disablePort('ab')).check();
  await expect(page.getByTestId(STP.blockedLink)).toHaveText('Blocked link: none');
  await expect(page.getByTestId(STP.blockedEnd)).toHaveCount(0);
});

test('the blocked-link summary names the blocking end in Japanese', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(STP.blockedLink)).toHaveText(
    '遮断しているリンク: Switch B – Switch C',
  );
  await expect(page.getByTestId(STP.blockedEnd)).toHaveText('（Switch C 側で遮断）');
});
