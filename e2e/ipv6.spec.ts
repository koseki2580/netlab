import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

test('IPv6 demo delivers ICMPv6 echo through dual-stack routing', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/ipv6');

  await page.getByTestId(SEL.demo.ipv6SendEcho).click();

  // The IPv6 demo prints hop annotations into the per-demo trace log container.
  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('ICMPv6 hops');
  // The node's real label, so this asserts the echo reached the server rather
  // than that the word appears somewhere in some casing.
  await expect(traceLog).toContainText('Dual-stack Server');
  await expect(traceLog).toContainText('2001:db8:2::20');

  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
