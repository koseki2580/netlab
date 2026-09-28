import { expect, test } from './fixtures/harness';

/** Lesson-local test ids. */
const STP = {
  bridgeId: (switchId: string) => `stp-bridge-id-${switchId}`,
  priority: (switchId: string) => `stp-priority-${switchId}`,
  rootBridge: 'stp-root-bridge',
  electionRule: 'stp-election-rule',
  loopDanger: 'stp-loop-danger',
} as const;

/**
 * TC-233 — the spanning-tree lesson shows every switch's bridge ID, so a
 * priority tie visibly goes to the lower MAC.
 *
 * Only the root's bridge ID was shown. Giving Switch B the same priority as
 * Switch A left A as root with nothing on the page saying why.
 */
test('each switch shows its bridge ID, and a priority tie goes to the lower MAC', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');

  await expect(page.getByTestId(STP.bridgeId('switch-a'))).toHaveText(
    'Bridge ID 4096/02:00:00:0a:00:01',
  );
  await expect(page.getByTestId(STP.bridgeId('switch-b'))).toHaveText(
    'Bridge ID 32768/02:00:00:0b:00:01',
  );
  await expect(page.getByTestId(STP.bridgeId('switch-c'))).toHaveText(
    'Bridge ID 32768/02:00:00:0c:00:01',
  );

  // A tie on priority: the card follows the change, and A's lower MAC wins.
  await page.getByTestId(STP.priority('switch-b')).fill('4096');
  await expect(page.getByTestId(STP.bridgeId('switch-b'))).toHaveText(
    'Bridge ID 4096/02:00:00:0b:00:01',
  );
  await expect(page.getByTestId(STP.rootBridge)).toHaveText('Root bridge: 4096/02:00:00:0a:00:01');

  await expect(page.getByTestId(STP.electionRule)).toContainText(
    'The lower bridge ID wins — priority first, then MAC',
  );
  await expect(page.getByTestId(STP.loopDanger)).toContainText('broadcast storm');
  await expect(page.getByTestId(STP.loopDanger)).toContainText('MAC table');
});

test('the bridge IDs and the election rule are in Japanese too', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');

  await expect(page.getByTestId(STP.bridgeId('switch-a'))).toHaveText(
    'ブリッジ ID 4096/02:00:00:0a:00:01',
  );
  await expect(page.getByTestId(STP.electionRule)).toContainText('ブリッジ ID が小さいほうが勝ち');
  await expect(page.getByTestId(STP.loopDanger)).toContainText('ブロードキャストストーム');
});
