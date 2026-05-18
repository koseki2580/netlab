import type { Locator, Page } from '@playwright/test';
import { SEL } from '../selectors';

/**
 * POM for the node-detail side panel that auto-mounts when a node is opened
 * during the sandbox flow. Currently just a thin handle around the close
 * button, which is the only stable interaction specs need today.
 */
export class NodeDetailPage {
  constructor(private readonly page: Page) {}

  closeButton(): Locator {
    return this.page.getByTestId(SEL.nodeDetail.closePanel);
  }

  async close() {
    await this.closeButton().click();
  }
}
