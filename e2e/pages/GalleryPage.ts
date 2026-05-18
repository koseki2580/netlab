import type { Locator, Page } from '@playwright/test';
import { SEL } from '../selectors';

/**
 * POM for the Gallery shell — locale toggle, learner-progress panel,
 * assessment entry-point card.
 */
export class GalleryPage {
  constructor(private readonly page: Page) {}

  async goto(query = '') {
    const search = query.length > 0 ? `?${query}` : '';
    await this.page.goto(`/${search}#/`);
  }

  async toggleJapaneseLocale() {
    await this.page.getByTestId(SEL.gallery.localeToggleJa).click();
  }

  // -- learner progress -----------------------------------------------------

  async exportProgressJson() {
    await this.page.getByTestId(SEL.gallery.progressExport).click();
  }
  exportedProgressJsonOutput(): Locator {
    return this.page.getByTestId(SEL.gallery.progressExportJsonOutput);
  }
  async clearProgress() {
    await this.page.getByTestId(SEL.gallery.progressClear).click();
  }
  confirmLearnerIdInput(): Locator {
    return this.page.getByTestId(SEL.gallery.progressConfirmId);
  }
  async confirmClear() {
    await this.page.getByTestId(SEL.gallery.progressConfirmClear).click();
  }
  importProgressJsonInput(): Locator {
    return this.page.getByTestId(SEL.gallery.progressImportJsonInput);
  }
  async importProgressJson() {
    await this.page.getByTestId(SEL.gallery.progressImport).click();
  }

  // -- assessment entry -----------------------------------------------------

  assessmentEntryLink(): Locator {
    return this.page.getByTestId(SEL.gallery.assessmentEntryLink);
  }
}
