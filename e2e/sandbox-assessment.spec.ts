import { test, expect } from './fixtures/harness';

test('opens the OSPF backup-path assessment from the Gallery', async ({
  page,
  sandboxPage,
  galleryPage,
}) => {
  await page.goto('/');
  await galleryPage.assessmentEntryLink().first().click();

  await expect(sandboxPage.panel()).toBeVisible();
  await expect(sandboxPage.tab('assessment')).toHaveAttribute('aria-selected', 'true');
  await expect(sandboxPage.tabpanel()).toContainText(
    'Make C1 reach C2 through the OSPF backup path',
  );
});
