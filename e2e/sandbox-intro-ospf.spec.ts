import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox intro guides the learner through the OSPF convergence flow', async ({
  page,
  sandboxPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node&intro=sandbox-intro-ospf#/routing/ospf-convergence');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(sandboxPage.introOverlay()).toBeVisible();

  await sandboxPage.startIntro();
  await sandboxPage.clickTab('node');

  await page.getByTestId(SEL.demo.ospfFailLink).click({ force: true });

  await sandboxPage.clickTab('traffic');
  await sandboxPage.trafficSource().selectOption({ label: 'C1' });
  await sandboxPage.trafficDestination().selectOption({ label: 'C2' });
  await sandboxPage.launchTraffic();

  await sandboxPage.clickTab('node');
  await sandboxPage.rightClickNodeByLabel('R1');
  await sandboxPage.popoverRouteNetwork().fill('10.4.0.0/24');
  await sandboxPage.popoverRouteNextHop().fill('10.0.13.2');
  await sandboxPage.popoverRouteInterface().selectOption({ label: 'to-r3' });
  await sandboxPage.popoverRouteAdd();

  await sandboxPage.clickTab('traffic');
  await sandboxPage.trafficSource().selectOption({ label: 'C1' });
  await sandboxPage.trafficDestination().selectOption({ label: 'C2' });
  await sandboxPage.launchTraffic();

  await expect(sandboxPage.introOverlay()).toHaveCount(0);
});
