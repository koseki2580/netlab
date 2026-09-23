import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const ENT = {
  step: (id: string) => `enterprise-step-${id}`,
  result: (id: string) => `enterprise-step-${id}-result`,
} as const;

/**
 * The enterprise lesson's step list advances as each step succeeds, and a
 * later step does not erase what an earlier one showed: the NAT translation
 * from step 3 is still there after the ACL probe of step 4.
 */
test('the enterprise steps advance and keep their results', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/simulation/enterprise');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(ENT.step('dhcp'))).toHaveAttribute('data-status', 'current');
  await expect(page.getByTestId(ENT.step('dns'))).toHaveAttribute('data-status', 'todo');

  for (const id of ['dhcp', 'dns', 'browse', 'acl']) {
    await page.getByTestId(ENT.step(id)).locator('button').click();
    await expect(page.getByTestId(ENT.step(id))).toHaveAttribute('data-status', 'done');
  }

  await expect(page.getByTestId(ENT.result('browse'))).toContainText('→ 10.0.2.1:');
  await expect(page.getByTestId(ENT.result('browse'))).toContainText('203.0.113.80:80');
  await expect(page.getByTestId(ENT.result('acl'))).toContainText('Dropped at GW-Router');
});
