import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-044 — an assessment sub-goal responds to the learner's edit.
 *
 * Taking the primary link down is the assessment's first required sub-goal, and
 * the sandbox link editor is where it reads the learner's edits from. This
 * covers that much, and it addresses the link by id — before drawn links
 * carried one, a test could only right-click "some link", which is how this
 * was first mistaken for the sub-goal not working at all.
 *
 * It stops at two of four on purpose. The second required sub-goal waits for an
 * `ospf:reconverged` event that nothing in the browser emits — see the
 * specification's open questions. That is a design decision about what
 * reconvergence means in an engine that has no discrete recompute, not
 * something to guess at, and the CLI's guess ("a link went down, call it
 * reconverged") is the guess being avoided.
 */
test('an assessment sub-goal passes when the learner makes the edit it asks for', async ({
  page,
  sandboxPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(
    '/?learnerId=e2e-assessment&assessment=ospf-convergence&sandbox=1&sandboxTab=assessment#/routing/ospf-convergence',
  );
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.sandbox.panel)).toBeVisible();

  const panel = sandboxPage.tabpanel();
  await expect(panel).toContainText('sub-goals');

  // Take the primary link down through the sandbox, which is where the
  // assessment reads the learner's edits from.
  await page.locator('[data-edge-id="e-r2-r4"]').first().click({ button: 'right', force: true });
  await expect(page.getByTestId(SEL.sandbox.editPopover.root)).toBeVisible();
  await page.getByTestId(SEL.sandbox.linkEditor.stateDown).click();
  await page.getByTestId(SEL.sandbox.linkEditor.apply).click();

  await sandboxPage.clickTab('assessment');
  await expect(panel, 'the sub-goal saw the edit').toContainText('2 / 4 sub-goals');
  await expect(panel).toContainText('Disable the primary link');
});

/**
 * TC-045 — the control the goal describes is the one that satisfies it.
 *
 * "Disable the primary link" is the sub-goal; "Fail link" sits in the lesson's
 * own toolbar and does exactly that. It changed the topology directly and
 * recorded nothing, so the assessment — which reads the learner's sandbox
 * edits — never saw it, and the sandbox's history of what the learner changed
 * was missing the change. The controlled-topology demo's buttons have always
 * pushed their edits; this one now does too.
 */
test("the lesson's own control satisfies the goal it describes", async ({ page, sandboxPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(
    '/?learnerId=e2e-fail&assessment=ospf-convergence&sandbox=1&sandboxTab=assessment#/routing/ospf-convergence',
  );
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.sandbox.panel)).toBeVisible();
  const panel = sandboxPage.tabpanel();
  await expect(panel).toContainText('1 / 4 sub-goals');

  await page.getByTestId('ospf-fail-link').click();
  await page.waitForTimeout(1200);
  await sandboxPage.clickTab('assessment');
  await expect(panel, "the lesson's own control satisfies the goal it describes").toContainText(
    '2 / 4 sub-goals',
  );
});
