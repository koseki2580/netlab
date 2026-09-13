import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * REQ-013 — motion that shows a packet travelling is suppressed for a viewer
 * who prefers reduced motion.
 *
 * The canvas marks a travelling packet by animating its link. A viewer who has
 * asked their system for reduced motion must still be able to follow the
 * lesson, so the animation is dropped rather than the information.
 *
 * `data-edge-animated` is the canvas's own contract for "this link is shown
 * moving", so the test survives a change of graph engine. Reading the engine's
 * generated class instead would tie this behaviour to the library drawing it.
 */
const ANIMATED_LINK = '[data-edge-animated="true"]';
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

    // The packet has to have travelled before "nothing moved" means anything.
    // This used to wait a fixed 1.5s and then check the timeline was not empty —
    // but the timeline always holds its own heading, so on a loaded machine the
    // assertion could pass before any packet had gone anywhere.
    await expect(page.getByTestId(SEL.traceFilter.hop).first()).toBeVisible();
    // A link is marked in motion within tens of milliseconds of the send, so a
    // short settle after the trace exists is ample for one to appear if it would.
    await page.waitForTimeout(500);

    await expect(page.locator(ANIMATED_LINK), 'no link animates under reduced motion').toHaveCount(
      0,
    );
  });
});

test.describe('default motion', () => {
  test('animates a travelling packet when motion is welcome', async ({ page, demoPage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await demoPage.goto('/networking/arp');
    await page.getByTestId('demo-primary-action').click();

    // Without this half, the assertion above would pass on a canvas that never
    // animates anything at all. It waits for the motion rather than sampling
    // once after a fixed pause: the mark stays for as long as the trace is shown,
    // but on a loaded machine the send itself can take longer than the pause did.
    await expect(
      page.locator(ANIMATED_LINK),
      'the travelling packet is shown moving',
    ).not.toHaveCount(0);
  });
});
