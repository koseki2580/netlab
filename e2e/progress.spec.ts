import { expect, test } from '@playwright/test';

test('learner progress is opt-in, exportable, importable, and clearable', async ({ page }) => {
  await page.goto('/#/?learnerId=learner-e2e');
  await expect(page.getByText('Demo gallery')).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem(
      'netlab-progress:v1:learner-e2e',
      JSON.stringify({
        schemaVersion: 1,
        learnerId: 'learner-e2e',
        completions: [
          {
            kind: 'assessment',
            id: 'ospf-convergence',
            label: 'OSPF convergence',
            completedAt: '2026-05-11T00:00:00.000Z',
            score: { passed: 3, total: 3 },
          },
        ],
        updatedAt: '2026-05-11T00:00:00.000Z',
      }),
    );
  });
  await page.reload();

  await expect(page.getByText('Learner progress')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'OSPF convergence' })).toBeVisible();
  await expect(page.getByText('Completed').first()).toBeVisible();

  await page.getByRole('button', { name: 'Export JSON' }).click();
  await expect(page.getByLabel('Exported progress JSON')).toContainText('ospf-convergence');

  await page.getByRole('button', { name: 'Clear progress' }).click();
  await page.getByLabel('Confirm learner id').fill('learner-e2e');
  await page.getByRole('button', { name: 'Confirm clear' }).click();
  await expect(page.getByRole('cell', { name: 'OSPF convergence' })).not.toBeVisible();

  await page.getByLabel('Import progress JSON').fill(
    JSON.stringify({
      schemaVersion: 1,
      learnerId: 'learner-e2e',
      completions: [
        {
          kind: 'assessment',
          id: 'ospf-convergence',
          label: 'OSPF convergence',
          completedAt: '2026-05-11T00:00:00.000Z',
          score: { passed: 3, total: 3 },
        },
      ],
      updatedAt: '2026-05-11T00:00:00.000Z',
    }),
  );
  await page.getByRole('button', { name: 'Import JSON' }).click();
  await expect(page.getByRole('cell', { name: 'OSPF convergence' })).toBeVisible();
});
