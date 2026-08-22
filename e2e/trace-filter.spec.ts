import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

test('trace display filter narrows hops, persists through refresh, and clears with Escape', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/udp');
  await demoPage.pressStart();
  await demoPage.waitForTraceCount(1);

  const searchbox = page.getByTestId(SEL.traceFilter.searchbox);
  const rows = page.getByTestId(SEL.traceFilter.hop);
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  await searchbox.fill('protocol == tcp');
  await expect(page.getByTestId(SEL.traceFilter.statusLabel)).toContainText(
    `0 of ${initialCount} hops shown`,
  );
  await expect
    .poll(() =>
      page.evaluate(() => new URLSearchParams(window.location.search).get('trace_filter')),
    )
    .toBe('protocol == tcp');

  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.reload();
  await page.getByTestId(SEL.app.root).waitFor();
  await demoPage.pressStart();
  await demoPage.waitForTraceCount(1);
  await expect(page.getByTestId(SEL.traceFilter.searchbox)).toHaveValue('protocol == tcp');
  await expect(page.getByTestId(SEL.traceFilter.statusLabel)).toContainText(
    `0 of ${initialCount} hops shown`,
  );

  await page.getByTestId(SEL.traceFilter.searchbox).press('Escape');
  await expect(page.getByTestId(SEL.traceFilter.statusLabel)).toContainText(
    `${initialCount} of ${initialCount} hops shown`,
  );
  await expect
    .poll(() =>
      page.evaluate(() => new URLSearchParams(window.location.search).get('trace_filter')),
    )
    .toBeNull();
});
