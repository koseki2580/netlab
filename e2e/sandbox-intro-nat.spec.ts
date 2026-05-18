import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox intro guides the learner through the NAT rule flow', async ({
  page,
  sandboxPage,
  nodeDetailPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(sandboxPage.introOverlay()).toBeVisible();

  await sandboxPage.startIntro();
  await sandboxPage.clickTab('node');

  const openNodePopover = async () => {
    await sandboxPage.rightClickNodeByLabel('R-Edge');
  };

  await openNodePopover();
  await sandboxPage.popoverNatKind().selectOption('dnat');
  await sandboxPage.popoverNatTranslateTo().fill('192.168.1.10');
  await sandboxPage.popoverNatAdd();
  // Close the co-mounted NodeDetailPanel so the next right-click reaches the
  // node instead of the overlay panel covering the canvas right band.
  await nodeDetailPage.close();

  await sandboxPage.clickTab('traffic');
  await sandboxPage.trafficSource().selectOption({ label: 'Internet Host' });
  await sandboxPage.trafficDestination().selectOption({ label: 'R-Edge' });
  await sandboxPage.launchTraffic();

  await sandboxPage.clickTab('node');
  await openNodePopover();
  await sandboxPage.popoverNatEditorRemoveFirst().click();

  await sandboxPage.clickTab('traffic');
  await sandboxPage.trafficSource().selectOption({ label: 'Internet Host' });
  await sandboxPage.trafficDestination().selectOption({ label: 'R-Edge' });
  await sandboxPage.launchTraffic();

  await expect(sandboxPage.introOverlay()).toHaveCount(0);
});
