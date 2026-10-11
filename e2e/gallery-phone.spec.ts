import { expect, test } from './fixtures/harness';

/**
 * TC-565 — the lesson list on a phone.
 *
 * At 390px the navigation kept its 248px beside the catalogue, which was left
 * a 94px column: the page was 545px wide and 29,000px tall, and the heading
 * was set one character to a line.
 */
test.describe('the lesson list at 390px wide', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('gives the cards the width of the screen and keeps the navigation in a drawer', async ({
    page,
  }) => {
    await page.goto('/#/');
    const card = page.getByTestId('gallery-card').first();
    await expect(card).toBeVisible();
    expect((await card.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(300);
    expect((await page.getByTestId('gallery-heading').boundingBox())?.width ?? 0).toBeGreaterThan(
      200,
    );

    const scroll = await page.getByTestId('gallery-heading').evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);

    const sidebar = page.getByTestId('gallery-sidebar');
    await expect(sidebar).toBeHidden();
    const menu = page.getByTestId('gallery-menu');
    expect((await menu.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await menu.tap();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).toBeInViewport({ ratio: 1 });

    // Choosing somewhere to go puts the drawer away again.
    await page.getByTestId('gallery-menu-scrim').tap({ position: { x: 370, y: 400 } });
    await expect(sidebar).toBeHidden();
  });

  test('keeps the navigation beside the catalogue on a wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/#/');
    await expect(page.getByTestId('gallery-sidebar')).toBeInViewport();
    await expect(page.getByTestId('gallery-menu')).toBeHidden();
    expect((await page.getByTestId('gallery-sidebar').boundingBox())?.width).toBe(248);
  });
});
