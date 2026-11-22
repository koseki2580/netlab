import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * REQ-416 — the learner writes www's server as an app, curls it from the
 * client, and sees the response arrive in segments (TC-2215, TC-2216).
 */
async function typeCommand(page: Page, command: string) {
  await page.getByTestId('terminal-screen').click();
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
}

const transcript = (page: Page) => page.getByTestId('terminal-transcript');

test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2215: the starter app answers curl, and a 3 KB response arrives in three segments', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/tools/terminal');
  await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
  await page.getByTestId('server-app-reset').click();
  await page.getByTestId('server-app-start').click();
  await expect(page.getByTestId('server-app-status')).toHaveAttribute('data-mode', 'app');

  await typeCommand(page, 'curl http://www.example.test/hello?name=Ada');
  await expect(transcript(page)).toContainText('Hello Ada (visit 1)');
  await expect(page.getByTestId('server-app-log')).toContainText(
    'GET /hello?name=Ada HTTP/1.1 → 200',
  );

  await typeCommand(page, 'curl -v http://www.example.test/big');
  // The 60-line body pushes the headers out of the kept transcript; its last line and the note remain.
  await expect(transcript(page)).toContainText('line 60');
  // The headers and the 2,919-byte body: two full 1400-byte segments and the rest.
  await expect(transcript(page)).toContainText(
    /\* Response sent in 3 segments: 1400 \+ 1400 \+ \d+ bytes/,
  );

  await typeCommand(page, 'curl -i http://www.example.test/nope');
  await expect(transcript(page)).toContainText('HTTP/1.1 404 Not Found');
});

test('TC-2216: a throwing handler gives 500 with its error in the log; Stop refuses connections', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/tools/terminal');
  await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
  await page
    .getByTestId('server-app-code')
    .fill("app.get('/boom', () => { throw new Error('database is down'); });");
  await page.getByTestId('server-app-start').click();
  await expect(page.getByTestId('server-app-status')).toHaveAttribute('data-mode', 'app');

  await typeCommand(page, 'curl -i http://www.example.test/boom');
  await expect(transcript(page)).toContainText('HTTP/1.1 500 Internal Server Error');
  await expect(page.getByTestId('server-app-log')).toContainText('database is down');

  await page.getByTestId('server-app-stop').click();
  await expect(page.getByTestId('server-app-status')).toHaveAttribute('data-mode', 'stopped');
  await typeCommand(page, 'curl http://www.example.test/boom');
  await expect(transcript(page)).toContainText(
    'curl: (7) Failed to connect to www.example.test port 80',
  );

  await page.getByTestId('server-app-builtin').click();
  await typeCommand(page, 'curl http://www.example.test/');
  await expect(transcript(page)).toContainText('<h1>Hello from www</h1>');
});

test('TC-2240: an edit while running asks for a restart, and the jump link brings the card into view', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/tools/terminal');
  await expect(page.getByTestId('terminal-loading')).toHaveCount(0);

  // The card is below the terminal; the link beside the terminal brings it up.
  await page.getByTestId('server-app-jump').click();
  await expect(page.getByTestId('server-app')).toBeInViewport();

  const editor = page.getByTestId('server-app-code');
  await editor.fill("app.get('/v', (req, res) => res.send('one'));");
  await page.getByTestId('server-app-start').click();
  await expect(page.getByTestId('server-app-status')).toHaveAttribute('data-mode', 'app');
  await expect(page.getByTestId('server-app-dirty')).toHaveCount(0);

  // Edited while running: the app keeps the code it started with until Restart.
  await editor.fill("app.get('/v', (req, res) => res.send('two'));");
  await expect(page.getByTestId('server-app-dirty')).toHaveText(
    'コードが変わりました。再起動すると反映されます。',
  );
  await typeCommand(page, 'curl http://www.example.test/v');
  await expect(transcript(page)).toContainText('one');

  await page.getByTestId('server-app-start').click();
  await expect(page.getByTestId('server-app-dirty')).toHaveCount(0);
  await typeCommand(page, 'curl http://www.example.test/v');
  await expect(transcript(page)).toContainText('two');
});
