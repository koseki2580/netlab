import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-113 — the spanning-tree lesson delivers the packet it describes.
 *
 * The lesson's own brief reads: "In the initial B → C trace, the blocked B–C
 * segment should not appear; traffic detours through Switch A." It detoured
 * through Switch A and stopped there, on Host A, dropped as "no route" — a
 * host that is neither the sender nor the destination. Switch A had no learned
 * entry for C and no rule about a destination two hops away, so it forwarded
 * to whichever neighbour was listed first.
 *
 * This asks for the arrival, because a trace that merely avoids the blocked
 * segment can do so by dying early — which is what it was doing.
 */
test('the spanning-tree lesson delivers B to C around the blocked segment', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/stp');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(SEL.stp.traceStatus)).toHaveText('Trace status: delivered');
  await expect(page.getByTestId(SEL.stp.blockedSegment)).toHaveText('Blocked segment used: no');
  // The detour is the lesson: the frame passes through the third switch on the
  // way, rather than crossing the segment spanning tree blocked.
  await expect(page.getByTestId(SEL.stp.tracePath)).toHaveText(
    'Host B → Switch B → Switch A → Switch C → Host C',
  );
});
