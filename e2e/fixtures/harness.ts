import { test as base } from '@playwright/test';
import { CATEGORIES } from '../../demo/Gallery';
import { CommandBarPage } from '../pages/CommandBarPage';
import { DemoPage } from '../pages/DemoPage';
import { GalleryPage } from '../pages/GalleryPage';
import { LessonPage } from '../pages/LessonPage';
import { NodeDetailPage } from '../pages/NodeDetailPage';
import { SandboxPage } from '../pages/SandboxPage';

/** The language a learner chose in the gallery (`netlab-locale`). */
export type AppLocale = 'en' | 'ja';
/** The theme a learner chose in the gallery (`netlab-theme-mode`). */
export type AppTheme = 'light' | 'dark';
/** The screens the suite lays lessons out on. */
export type ViewportPreset = 'desktop' | 'wide' | 'phone';

/**
 * The named screen sizes. `phone` is also a touch screen; see the
 * `viewportPreset` option below.
 */
export const VIEWPORTS = {
  /** A laptop-sized desktop window. */
  desktop: { width: 1440, height: 900 },
  /** A large desktop window, where every panel fits beside the canvas. */
  wide: { width: 1600, height: 1000 },
  /** A phone held upright. */
  phone: { width: 390, height: 844 },
} as const satisfies Record<ViewportPreset, { width: number; height: number }>;

interface NetlabOptions {
  /**
   * Seed the learner's language before any page script runs. Unset leaves
   * storage alone, so the app picks its own default.
   */
  appLocale: AppLocale | undefined;
  /** Seed the learner's theme before any page script runs. Unset leaves storage alone. */
  appTheme: AppTheme | undefined;
  /**
   * Open the browser at a named screen size. `phone` is also a touch screen.
   * Unset keeps Playwright's `viewport` / `hasTouch`.
   */
  viewportPreset: ViewportPreset | undefined;
}

interface NetlabFixtures {
  demoPage: DemoPage;
  lessonPage: LessonPage;
  sandboxPage: SandboxPage;
  galleryPage: GalleryPage;
  nodeDetailPage: NodeDetailPage;
  commandBarPage: CommandBarPage;
}

export const test = base.extend<NetlabFixtures & NetlabOptions>({
  appLocale: [undefined, { option: true }],
  appTheme: [undefined, { option: true }],
  viewportPreset: [undefined, { option: true }],

  viewport: async ({ viewport, viewportPreset }, use) => {
    await use(viewportPreset ? { ...VIEWPORTS[viewportPreset] } : viewport);
  },
  hasTouch: async ({ hasTouch, viewportPreset }, use) => {
    await use(viewportPreset === 'phone' ? true : hasTouch);
  },
  context: async ({ context, appLocale, appTheme }, use) => {
    if (appLocale !== undefined || appTheme !== undefined) {
      await context.addInitScript(
        ({ locale, theme }) => {
          try {
            if (locale) window.localStorage.setItem('netlab-locale', locale);
            if (theme) window.localStorage.setItem('netlab-theme-mode', theme);
          } catch {
            /* no storage: the app falls back to its defaults, which the test then catches */
          }
        },
        { locale: appLocale, theme: appTheme },
      );
    }
    await use(context);
  },

  demoPage: async ({ page }, use) => {
    await use(new DemoPage(page));
  },
  lessonPage: async ({ page }, use) => {
    await use(new LessonPage(page));
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
