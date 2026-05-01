import { expect, test } from './fixtures/harness';

test('embedded sandbox posts edit-count updates to the parent page', async ({ page }) => {
  const messages: unknown[] = [];
  await page.exposeFunction('recordNetlabEmbedMessage', (message: unknown) => {
    messages.push(message);
  });

  await page.goto('/');

  const iframeSrc =
    '/?sandbox=1&sandboxTab=node&embedMode=compact&parentOrigin=http%3A%2F%2Flocalhost%3A5173#/networking/mtu-fragmentation';
  await page.setContent(`
    <main>
      <script>
        window.addEventListener('message', (event) => {
          window.recordNetlabEmbedMessage(event.data);
        });
      </script>
      <iframe title="netlab sandbox" src="${iframeSrc}" style="width: 960px; height: 640px; border: 0"></iframe>
    </main>
  `);

  const frame = page.frameLocator('iframe[title="netlab sandbox"]');
  await expect(frame.locator('[data-testid="sandbox-panel"]')).toBeVisible();
  await expect(frame.locator('[data-testid="sandbox-panel"]')).toHaveAttribute(
    'data-embed-mode',
    'compact',
  );
  await expect(frame.getByText('Gallery')).toHaveCount(0);

  await expect
    .poll(() => messages.some((message) => (message as { type?: string }).type === 'sandbox-ready'))
    .toBe(true);

  await frame.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await frame.getByLabel('MTU bytes').fill('500');
  await frame.getByRole('button', { name: 'Apply MTU' }).click();

  await expect
    .poll(() =>
      messages.some(
        (message) =>
          (message as { type?: string; count?: number }).type === 'sandbox-edit-count-changed' &&
          (message as { count?: number }).count === 1,
      ),
    )
    .toBe(true);
});
