import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-213 — the firewall lesson's return traffic matches the flow it returns for.
 *
 * The lesson offered two ways to send "HTTP from the client": its own button,
 * and the generic 「▶ パケットを送る」, which sends a different flow the
 * connection tracker has never seen. A learner who used the generic one saw
 * the return dropped and concluded the firewall blocks replies. The lesson now
 * offers only its own buttons, and a return after its HTTP arrives.
 */
test('the firewall lesson returns traffic for its own HTTP flow and offers no other send', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/acl');
  await expect(page.getByTestId('acl-send-http')).toBeVisible();
  await expect(
    page.getByTestId(SEL.demo.primaryAction),
    'no generic send that starts an untracked flow',
  ).toHaveCount(0);

  await page.getByTestId('acl-send-http').click();
  await page.getByTestId('acl-send-return').click();
  const hops = page.getByTestId(SEL.traceFilter.hop);
  await expect(hops.last(), 'the return is delivered').toHaveAttribute('data-event', 'deliver');
});
