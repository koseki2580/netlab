import { expect, test } from './fixtures/harness';

/** Lessons true to their screens (REQ-340 to REQ-345). */

/** Index of the router step in the course: the fifth. */
const ROUTER_STEP = 4;

test.describe('the course', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('TC-1398: the router step says it crossed one router, 1 hop', async ({ page, demoPage }) => {
    await page.addInitScript((index) => {
      window.localStorage.setItem('netlab-course-step', String(index));
    }, ROUTER_STEP);
    await demoPage.goto('/course');
    await page.getByTestId('course-send').click();
    await page.getByTestId('course-more-toggle').click();
    await expect(page.getByTestId('course-more')).toContainText('It crossed one router: 1 hop.');
    await expect(page.getByTestId('course-points')).not.toContainText('4 hops');
  });

  test('TC-1384: opened from a test, "A little more" is open', async ({ page, demoPage }) => {
    await demoPage.goto('/course?fromExam=5');
    await page.getByTestId('course-send').click();
    await expect(page.getByTestId('course-more-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('course-more')).toBeVisible();
  });
});

test.describe('the BGP view', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('TC-1399: ?protocol=bgp opens BGP with a summary that matches its list', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/routing/dynamic?protocol=bgp');
    await expect(page.getByTestId('dynamic-summary')).toContainText(
      'AS_PATH より先に LOCAL_PREF を比べます',
    );
    await expect(page.getByTestId('dynamic-protocol-bgp')).toHaveAttribute('aria-pressed', 'true');
  });
});
