import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';

function sandboxState(edits: readonly unknown[]): string {
  return Buffer.from(JSON.stringify({ version: 1, edits }), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

test('annotation list is keyboard reachable and axe-clean', async ({ page }) => {
  await page.goto(
    `/?sandbox=1&sandboxTab=edits&sandboxState=${sandboxState([
      {
        kind: 'trace.annotate.add',
        annotation: {
          id: 'annotation-a11y-1',
          traceEventId: 'trace-1:0',
          author: 'user',
          content: 'Learner note',
          createdAt: 0,
        },
      },
    ])}#/networking/mtu-fragmentation`,
  );
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await page.getByLabel('Show annotations only').check();
  const item = page.locator('[data-testid="annotation-list-item"]').first();
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('aria-label', /Annotation by user/);
  await item.focus();
  await expect(item).toBeFocused();

  const results = await new AxeBuilder({ page }).include('[data-testid="sandbox-panel"]').analyze();
  expect(results.violations).toEqual([]);
});
