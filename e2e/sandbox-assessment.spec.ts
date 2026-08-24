import { test, expect } from './fixtures/harness';

/**
 * The only route into the sandbox that goes through the Gallery, so it boots
 * the app twice: once for the Gallery, then again when the assessment link
 * changes the query string. That second boot is why this was the flakiest spec
 * in the suite; see the expect timeout in playwright.config.ts.
 */
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
