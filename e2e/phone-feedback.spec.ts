import { expect, test } from './fixtures/harness';

/**
 * TC-1601..TC-1605 — what a nurse on a 390×844 phone met in persona run 2: a
 * result cut off under the step button, a detail opening below the screen,
 * the diagram scrolled away while the packet moved, a problem lost on reload,
 * and targets smaller than a fingertip.
 */
test.use({ viewportPreset: 'phone', isMobile: true });

test('TC-1601: after a send the course verdict is above the next bar, and "more" opens in view', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/course');
  await page.getByTestId('course-send').tap();
  const above = async (testId: string) => {
    const box = await page.getByTestId(testId).boundingBox();
    const next = await page.getByTestId('course-next').boundingBox();
    return box !== null && next !== null && box.y >= 0 && box.y + box.height <= next.y + 1;
  };
  // Once the packet has come to rest and the panel has scrolled.
  await expect(async () => expect(await above('course-headline')).toBe(true)).toPass({
    timeout: 8000,
  });
  await page.getByTestId('course-more-toggle').tap();
  await expect(async () => expect(await above('course-more')).toBe(true)).toPass({
    timeout: 4000,
  });
});

test('TC-1602: the diagram stays on screen while a checked packet moves', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/exercises/packet/do/p1-where~0');
  const options = page.locator('[data-testid^="packet-pick-"][data-testid*="-option-"]');
  await options.first().tap();
  await page.getByTestId('packet-check').tap();
  await expect(page.getByTestId('packet-result')).toBeVisible();
  const box = await page.getByTestId('exercise-diagram').boundingBox();
  expect(box && box.y + box.height > 0 && box.y < 844).toBe(true);
});

test('TC-1604: a packet problem left unanswered is the one offered again', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/exercises/packet/level/1');
  await page.getByTestId('packet-level-start').tap();
  await expect(page).toHaveURL(/exercises\/packet\/do\//);
  const first = page.url();
  await demoPage.goto('/exercises/packet/level/1');
  await page.getByTestId('packet-level-start').tap();
  await expect(page).toHaveURL(/exercises\/packet\/do\//);
  expect(page.url()).toBe(first);
});

test('TC-1605: the controls left under 44px are a fingertip now', async ({ page, demoPage }) => {
  for (const path of [
    '/routing/ospf-areas',
    '/networking/ipv6',
    '/networking/observability',
    '/routing/ospf-convergence',
    '/exercises/do/l1-host-address~0',
  ]) {
    await demoPage.goto(path);
    const small = await page.locator('body').evaluate((element) =>
      [
        ...element.querySelectorAll<HTMLElement>(
          'button, a[href], summary, select, [role="tab"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"])',
        ),
      ]
        .filter((el) => {
          if (el.closest('[data-testid="topology-node"]')) return false;
          if (el.closest('[data-testid="netlab-canvas"]')) return false;
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (box.width === 0 || box.height === 0 || box.bottom <= 0) return false;
          if (style.visibility === 'hidden' || style.display === 'none') return false;
          return box.width < 43.5 || box.height < 43.5;
        })
        .map((el) => {
          const box = el.getBoundingClientRect();
          const name = el.dataset['testid'] ?? el.getAttribute('aria-label') ?? el.tagName;
          return `${name} ${Math.round(box.width)}×${Math.round(box.height)}`;
        }),
    );
    expect(small, path).toEqual([]);
  }
});
