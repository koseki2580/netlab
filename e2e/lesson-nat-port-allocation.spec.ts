import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-232 — the NAT lesson says how its own NAT picks public ports.
 *
 * It hands out 1024, 1025, … in order and never keeps the client's port, but
 * did not say so, which quietly implied every NAT behaves that way.
 */
test('the NAT brief says ports are allocated from 1024 and that many NATs keep the port', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/nat');

  const brief = page.getByTestId(SEL.lesson.brief);
  await expect(brief).toContainText('allocates public ports in order starting at 1024');
  await expect(brief).toContainText('Linux MASQUERADE');
  await expect(brief).toContainText('Cisco PAT');
  await expect(brief).toContainText("keep the client's own port when it is free");

  // And what it says is what the table shows: Client A's 54321 becomes 1024.
  await page.getByTestId('nat-send-client-a').click();
  await expect(page.getByTestId('nat-inside-global')).toHaveText('203.0.113.1:1024');
});

test('the NAT brief says the same in Japanese', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* no storage means no choice, which this test would then catch */
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/nat');

  const brief = page.getByTestId(SEL.lesson.brief);
  await expect(brief).toContainText('1024 から順に');
  await expect(brief).toContainText('Linux の MASQUERADE');
});
