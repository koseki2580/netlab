import type { Page } from '@playwright/test';
import type { PacketTrace } from '../../src/types/simulation';
import { SEL } from '../selectors';

export class DemoPage {
  constructor(private page: Page) {}

  async goto(path: string) {
    await this.page.goto(`/#${path}`);
    await this.page.getByTestId(SEL.app.root).waitFor();
  }

  /** Click the demo's primary action button (Send / Run / Connect / Step). */
  async pressStart() {
    await this.page.getByTestId(SEL.demo.primaryAction).first().click();
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
