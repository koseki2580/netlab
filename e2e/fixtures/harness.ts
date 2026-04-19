import { test as base } from '@playwright/test';
import { CATEGORIES } from '../../demo/Gallery';
import { DemoPage } from '../pages/DemoPage';

export const test = base.extend<{ demoPage: DemoPage }>({
  demoPage: async ({ page }, use) => {
    const demoPage = new DemoPage(page);
    await use(demoPage);
  },
});

export const expect = base.expect;
export { CATEGORIES };
