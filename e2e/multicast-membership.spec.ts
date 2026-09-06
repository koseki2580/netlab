import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-110 — the IGMP lesson's subject actually happens.
 *
 * The lesson is called "join/leave groups and observe VLAN-scoped delivery",
 * and no delivery ever occurred: every group datagram was dropped as "no
 * route" whether or not anyone had joined, so joining changed no outcome the
 * learner could see. Two things were wrong at once — a host had no way to
 * accept an address it does not own, and the worker engine, which is the one
 * every browser uses, discarded the join without a word. Either alone leaves
 * the lesson silent, so this asks the question through the whole chain.
 */
test('a receiver that joins the group receives the multicast', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/multicast');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  const hops = page.getByTestId(SEL.traceFilter.hop);

  // Nobody has joined: the traffic reaches the receivers and they discard it,
  // which is what a host does with a group it is not a member of.
  await expect(hops.filter({ hasText: 'not-group-member' }).first()).toBeVisible();

  // The lesson sends one datagram per VLAN-10 receiver, so both must join
  // before the run is free of drops.
  for (const label of ['a', 'b']) {
    await page.getByTestId(SEL.multicast.membership(label)).click();
  }
  await page.getByTestId(SEL.multicast.send).click();

  await expect(hops.filter({ hasText: 'DELIVER' }).first()).toBeVisible();
  await expect(hops.filter({ hasText: 'not-group-member' })).toHaveCount(0);
});
