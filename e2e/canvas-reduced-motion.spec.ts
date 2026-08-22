import { expect, test } from './fixtures/harness';

/**
 * REQ-013 — motion that shows a packet travelling is suppressed for a viewer
 * who prefers reduced motion.
 *
 * The canvas marks a travelling packet by animating its edge. A viewer who has
 * asked their system for reduced motion must still be able to follow the
 * lesson, so the animation is dropped rather than the information.
 */
test.describe('reduced motion', () => {
  test('animates no edge when the viewer prefers reduced motion', async ({ page, demoPage }) => {
    // Set explicitly rather than through `test.use`: the media query still read
    // false under the fixture option, and a preference the page never sees would
    // make this assert nothing.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await demoPage.goto('/networking/arp');
    expect(
      await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      'the page really sees the preference',
    ).toBe(true);
    await page.getByTestId('demo-primary-action').click();
    await page.waitForTimeout(1500);

    const animated = await page.evaluate(
      () => document.querySelectorAll('.react-flow__edge.animated').length,
    );
    expect(animated, 'no edge animates under prefers-reduced-motion').toBe(0);

    // The packet is still reported — the lesson survives without the motion.
    await expect(page.getByTestId('demo-trace-log').first()).not.toBeEmpty();
  });
});

test.describe('default motion', () => {
  test('animates a travelling packet when motion is welcome', async ({ page, demoPage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await demoPage.goto('/networking/arp');
    await page.getByTestId('demo-primary-action').click();
    await page.waitForTimeout(1500);

    // Without this half, the assertion above would pass on a canvas that never
    // animates anything at all.
    const animated = await page.evaluate(
      () => document.querySelectorAll('.react-flow__edge.animated').length,
    );
    expect(animated, 'the travelling packet is shown moving').toBeGreaterThan(0);
  });
});
