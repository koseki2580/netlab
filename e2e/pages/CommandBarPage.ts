import type { Locator, Page } from '@playwright/test';
import { SEL } from '../selectors';

/**
 * POM for the global command palette. Opens with Cmd+K (macOS) / Ctrl+K
 * elsewhere; the rest of the interaction (search, arrow keys, Enter) goes
 * through here so specs don't reach into raw role/text locators.
 */
export class CommandBarPage {
  constructor(private readonly page: Page) {}

  async open() {
    const key = process.platform === 'darwin' ? 'Meta+K' : 'Control+K';
    await this.page.keyboard.press(key);
  }

  searchInput(): Locator {
    return this.page.getByTestId(SEL.commandPalette.search);
  }

  async typeSearch(query: string) {
    await this.searchInput().fill(query);
  }

  optionFirst(): Locator {
    return this.page.getByTestId(SEL.commandPalette.optionFirst).first();
  }

  async pressArrowDown() {
    await this.page.keyboard.press('ArrowDown');
  }
  async pressArrowUp() {
    await this.page.keyboard.press('ArrowUp');
  }
  async submit() {
    await this.page.keyboard.press('Enter');
  }
}
