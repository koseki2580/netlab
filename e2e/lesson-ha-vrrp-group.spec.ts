import { expect, test } from './fixtures/harness';

/**
 * TC-264 — the gateway HA lesson names its VRRP group.
 *
 * The virtual MAC ends in 0a because the group is 10, and the lesson never
 * said which group it was.
 */
const HA = {
  brief: 'lesson-brief',
  virtualMac: 'virtual-mac',
  virtualMacNote: 'virtual-mac-note',
} as const;

test('the gateway HA lesson names VRRP group 10 and explains the virtual MAC', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ha');

  await expect(page.getByTestId(HA.brief)).toContainText('form VRRP group 10');
  await expect(page.getByTestId(HA.virtualMac)).toHaveText('Virtual MAC: 00:00:5e:00:01:0a');
  await expect(page.getByTestId(HA.virtualMacNote)).toContainText(
    '00:00:5e:00:01 followed by the group number in hexadecimal',
  );
  await expect(page.getByTestId(HA.virtualMacNote)).toContainText('group 10 is 0a');
});

test('the VRRP group is named in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/ha');

  await expect(page.getByTestId(HA.brief)).toContainText('VRRP グループ 10');
  await expect(page.getByTestId(HA.virtualMacNote)).toContainText(
    '00:00:5e:00:01 の後ろにグループ番号を 16 進数で',
  );
  await expect(page.getByTestId(HA.virtualMacNote)).toContainText('グループ 10 は 0a');
});
