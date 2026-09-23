import type { Page } from '@playwright/test';
import type { PacketTrace } from '../../src/types/simulation';
import { SEL } from '../selectors';

export class DemoPage {
  constructor(private page: Page) {}

  async goto(path: string) {
    await this.page.goto(`/#${path}`);
    await this.page.getByTestId(SEL.app.root).waitFor();
  }

  /**
   * Press "start" on the pre-flight brief when a lesson opens with it.
   *
   * A first visit is read as a learner's, so the brief opens as a modal card
   * over the canvas. A learner reads it and starts; a test that goes straight
   * for the canvas finds its clicks landing on the scrim.
   */
  async dismissBrief() {
    const start = this.page.getByTestId(SEL.brief.start);
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await this.page.getByTestId(SEL.brief.fullCard).waitFor({ state: 'hidden' });
    }
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
