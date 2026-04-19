import type { Page } from '@playwright/test';
import type { PacketTrace } from '../../src/types/simulation';

export class DemoPage {
  constructor(private page: Page) {}

  async goto(path: string) {
    await this.page.goto(`/#${path}`);
    await this.page.locator('[data-testid="netlab-root"]').waitFor();
  }

  async pressStart() {
    await this.page
      .getByRole('button', { name: /start|play|send|ping/i })
      .first()
      .click();
  }

  async traces(): Promise<PacketTrace[]> {
    return this.page.evaluate(() => (window as any).__NETLAB_TRACE__?.traces ?? []);
  }

  async waitForTraceCount(n: number) {
    await this.page.waitForFunction((n) => {
      const t = (window as any).__NETLAB_TRACE__?.traces ?? [];
      return t.length >= n;
    }, n);
  }
}
