import { expect, test } from './fixtures/harness';

function sandboxState(edits: readonly unknown[]): string {
  return Buffer.from(JSON.stringify({ version: 1, edits }), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const annotationEdit = {
  kind: 'trace.annotate.add',
  annotation: {
    id: 'annotation-e2e-1',
    traceEventId: 'trace-1:0',
    author: 'user',
    content: '**Fragmentation happens here**',
    createdAt: 0,
  },
};

test('sandbox annotations appear in the Edits tab and survive session export/import', async ({
  page,
}, testInfo) => {
  await page.goto(
    `/?sandbox=1&sandboxTab=edits&sandboxState=${sandboxState([annotationEdit])}#/networking/mtu-fragmentation`,
  );
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();

  await page.getByLabel('Show annotations only').check();
  await expect(page.locator('[data-testid="annotation-list-item"]')).toContainText(
    'Fragmentation happens here',
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sandbox session' }).click();
  const download = await downloadPromise;
  const sessionPath = testInfo.outputPath('sandbox-annotations-session.json');
  await download.saveAs(sessionPath);

  await page.goto('/?sandbox=1&sandboxTab=edits#/networking/mtu-fragmentation');
  await expect(page.getByRole('tab', { name: /Edits \(0\)/ })).toBeVisible();

  await page.locator('input[aria-label="Import sandbox session file"]').setInputFiles(sessionPath);
  await page.getByRole('button', { name: 'Apply imported sandbox session' }).click();

  await page.getByLabel('Show annotations only').check();
  await expect(page.locator('[data-testid="annotation-list-item"]')).toContainText(
    'Fragmentation happens here',
  );
});
