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
  sandboxPage,
}, testInfo) => {
  await page.goto(
    `/?sandbox=1&sandboxTab=edits&sandboxState=${sandboxState([annotationEdit])}#/networking/mtu-fragmentation`,
  );
  await expect(sandboxPage.panel()).toBeVisible();
  await sandboxPage.expectEditsCount(1);

  await sandboxPage.showAnnotationsOnly();
  await expect(sandboxPage.annotationListItem()).toContainText('Fragmentation happens here');

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.exportSession();
  const download = await downloadPromise;
  const sessionPath = testInfo.outputPath('sandbox-annotations-session.json');
  await download.saveAs(sessionPath);

  await page.goto('/?sandbox=1&sandboxTab=edits#/networking/mtu-fragmentation');
  await sandboxPage.expectEditsCount(0);

  await sandboxPage.importSessionInput().setInputFiles(sessionPath);
  await sandboxPage.applyImportedSession();

  await sandboxPage.showAnnotationsOnly();
  await expect(sandboxPage.annotationListItem()).toContainText('Fragmentation happens here');
});
