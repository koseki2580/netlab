import { test as base } from '@playwright/test';
import { CATEGORIES } from '../../demo/Gallery';
import { CommandBarPage } from '../pages/CommandBarPage';
import { DemoPage } from '../pages/DemoPage';
import { GalleryPage } from '../pages/GalleryPage';
import { NodeDetailPage } from '../pages/NodeDetailPage';
import { SandboxPage } from '../pages/SandboxPage';

interface NetlabFixtures {
  demoPage: DemoPage;
  sandboxPage: SandboxPage;
  galleryPage: GalleryPage;
  nodeDetailPage: NodeDetailPage;
  commandBarPage: CommandBarPage;
}

export const test = base.extend<NetlabFixtures>({
  demoPage: async ({ page }, use) => {
    await use(new DemoPage(page));
  },
  sandboxPage: async ({ page }, use) => {
    await use(new SandboxPage(page));
  },
  galleryPage: async ({ page }, use) => {
    await use(new GalleryPage(page));
  },
  nodeDetailPage: async ({ page }, use) => {
    await use(new NodeDetailPage(page));
  },
  commandBarPage: async ({ page }, use) => {
    await use(new CommandBarPage(page));
  },
});

export const expect = base.expect;
export { CATEGORIES };
