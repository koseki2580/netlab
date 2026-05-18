import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('learner progress is opt-in, exportable, importable, and clearable', async ({
  page,
  galleryPage,
}) => {
  await page.goto('/#/?learnerId=learner-e2e');
  await expect(page.getByTestId(SEL.gallery.heading)).toContainText('Demo gallery');

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

  const progressSection = page.getByTestId(SEL.gallery.progressSection);
  await expect(progressSection).toContainText('Learner progress');
  await expect(progressSection).toContainText('OSPF convergence');
  await expect(progressSection).toContainText('Complete');

  await galleryPage.exportProgressJson();
  await expect(galleryPage.exportedProgressJsonOutput()).toContainText('ospf-convergence');

  await galleryPage.clearProgress();
  await galleryPage.confirmLearnerIdInput().fill('learner-e2e');
  await galleryPage.confirmClear();
  await expect(progressSection).not.toContainText('OSPF convergence');

  await galleryPage.importProgressJsonInput().fill(
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
  await galleryPage.importProgressJson();
  await expect(progressSection).toContainText('OSPF convergence');
});
