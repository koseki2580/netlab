import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('controlled sandbox proposals accept and reject through parent-owned topology', async ({
  page,
}) => {
  await page.goto('/?sandbox=1&controlledSandboxHarness=1#/topology/controlled');

  await expect(page.getByTestId(SEL.sandbox.panel)).toBeVisible();
  await expect(page.getByTestId(SEL.controlledSandbox.pending)).toContainText(
    'Pending sandbox proposal: none',
  );

  await page.getByTestId(SEL.controlledSandbox.proposeDown).click();
  await expect(page.getByTestId(SEL.controlledSandbox.pending)).toContainText(
    'Pending sandbox proposal: link.state',
  );
  await expect(page.getByTestId(SEL.controlledSandbox.topologyJson)).not.toContainText(
    '"state": "down"',
  );

  await page.getByTestId(SEL.controlledSandbox.accept).click();
  await expect(page.getByTestId(SEL.controlledSandbox.pending)).toContainText(
    'Pending sandbox proposal: none',
  );
  await expect(page.getByTestId(SEL.controlledSandbox.topologyJson)).toContainText(
    '"state": "down"',
  );

  await page.getByTestId(SEL.controlledSandbox.proposeUp).click();
  await expect(page.getByTestId(SEL.controlledSandbox.pending)).toContainText(
    'Pending sandbox proposal: link.state',
  );
  await page.getByTestId(SEL.controlledSandbox.reject).click();

  await expect(page.getByTestId(SEL.controlledSandbox.pending)).toContainText(
    'Pending sandbox proposal: none',
  );
  await expect(page.getByTestId(SEL.controlledSandbox.topologyJson)).toContainText(
    '"state": "down"',
  );
});
