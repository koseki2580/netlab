import { expect, test } from '@playwright/test';

test('controlled sandbox proposals accept and reject through parent-owned topology', async ({
  page,
}) => {
  await page.goto('/?sandbox=1&controlledSandboxHarness=1#/topology/controlled');

  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  await expect(page.getByTestId('controlled-sandbox-pending')).toContainText(
    'Pending sandbox proposal: none',
  );

  await page.getByTestId('controlled-sandbox-propose-down').click();
  await expect(page.getByTestId('controlled-sandbox-pending')).toContainText(
    'Pending sandbox proposal: link.state',
  );
  await expect(page.getByTestId('controlled-topology-json')).not.toContainText('"state": "down"');

  await page.getByTestId('controlled-sandbox-accept').click();
  await expect(page.getByTestId('controlled-sandbox-pending')).toContainText(
    'Pending sandbox proposal: none',
  );
  await expect(page.getByTestId('controlled-topology-json')).toContainText('"state": "down"');

  await page.getByTestId('controlled-sandbox-propose-up').click();
  await expect(page.getByTestId('controlled-sandbox-pending')).toContainText(
    'Pending sandbox proposal: link.state',
  );
  await page.getByTestId('controlled-sandbox-reject').click();

  await expect(page.getByTestId('controlled-sandbox-pending')).toContainText(
    'Pending sandbox proposal: none',
  );
  await expect(page.getByTestId('controlled-topology-json')).toContainText('"state": "down"');
});
