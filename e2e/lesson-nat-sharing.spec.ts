import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-198 — the NAT lesson shows many machines sharing one address.
 *
 * Five simulated learners passed the NAT question in the final test, and all
 * five said the "shared by many machines" half came from the test page's own
 * summary, not the lesson: only Client A ever sent, so the table only ever
 * held one row. The lesson now explains NAT and lets Client B send too.
 */
test('two clients leave through the same global address, told apart by port', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/nat');
  await expect(page.getByTestId(SEL.lesson.brief)).toBeVisible();

  await page.getByTestId('nat-send-client-a').click();
  await expect(page.getByTestId('nat-inside-global')).toHaveCount(1);
  await page.getByTestId('nat-send-client-b').click();
  await expect(page.getByTestId('nat-inside-global')).toHaveCount(2);

  const locals = await page.getByTestId('nat-inside-local').allTextContents();
  const globals = await page.getByTestId('nat-inside-global').allTextContents();
  expect(new Set(locals.map((l) => l.split(':')[0])).size, 'two different machines').toBe(2);
  const globalIps = new Set(globals.map((g) => g.split(':')[0]));
  const globalPorts = new Set(globals.map((g) => g.split(':')[1]));
  expect(globalIps.size, 'one shared global address').toBe(1);
  expect(globalPorts.size, 'kept apart by port').toBe(2);
});
