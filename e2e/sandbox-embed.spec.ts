import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

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
  const panel = frame.getByTestId(SEL.sandbox.panel);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-embed-mode', 'compact');

  await expect
    .poll(() => messages.some((message) => (message as { type?: string }).type === 'sandbox-ready'))
    .toBe(true);

  await frame
    .getByTestId(SEL.canvas.node)
    .filter({ hasText: 'R1' })
    .first()
    .click({ button: 'right', force: true });
  await frame.getByTestId(SEL.sandbox.editPopover.mtuInput).fill('500');
  await frame.getByTestId(SEL.sandbox.editPopover.mtuApply).click();

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
