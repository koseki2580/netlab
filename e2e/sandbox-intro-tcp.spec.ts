import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox intro guides the learner through the TCP packet edit flow', async ({
  page,
  sandboxPage,
}) => {
  await page.goto(
    '/?sandbox=1&sandboxTab=packet&intro=sandbox-intro-tcp#/simulation/tcp-handshake',
  );
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(sandboxPage.introOverlay()).toBeVisible();

  await sandboxPage.startIntro();
  await sandboxPage.clickTab('packet');

  await sandboxPage.clickTab('traffic');
  await sandboxPage.trafficProtocol().selectOption('tcp');
  await sandboxPage.launchTraffic();
  await sandboxPage.clickTab('packet');

  await page.getByTestId(SEL.sandbox.editPopover.tcpSynFlag).click();
  await page.getByTestId(SEL.sandbox.editPopover.tcpRstFlag).click();
  await page.getByTestId(SEL.sandbox.editPopover.tcpFlagsApply).click();

  await expect(sandboxPage.introOverlay()).toHaveCount(0);
});
