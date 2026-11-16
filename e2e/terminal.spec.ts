import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * REQ-360 — a terminal on the client, drawn with xterm.js, runs commands on the
 * simulator; the servers that answer run in the page (TC-1710..TC-1714).
 */
async function typeCommand(page: Page, command: string) {
  await page.getByTestId('terminal-screen').click();
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
}

const transcript = (page: Page) => page.getByTestId('terminal-transcript');

test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('TC-1710: ping prints the reply, and the packet is in the timeline', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await typeCommand(page, 'ping -c 1 www');
    await expect(transcript(page)).toContainText('64 bytes from 10.0.2.80: icmp_seq=1 ttl=63');
    await expect(transcript(page)).toContainText(
      '1 packets transmitted, 1 received, 0% packet loss',
    );
    await expect(page.getByTestId('demo-trace-log')).toContainText('10.0.2.80');
  });

  test('TC-1711: curl prints the page the web server answers with', async ({ page, demoPage }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await typeCommand(page, 'curl http://www.example.test/');
    await expect(transcript(page)).toContainText('<h1>Hello from www</h1>');
    await expect(page.getByTestId('terminal-screen')).toContainText('Hello from www');
  });

  test('TC-1714: no accessibility violations, and output is in the live transcript', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await expect(transcript(page)).toHaveAttribute('aria-live', 'polite');
    await page.getByTestId('terminal-suggest-nslookup-www-example-test').click();
    await expect(transcript(page)).toContainText('Address: 10.0.2.80');
    const results = await new AxeBuilder({ page })
      .include('[data-testid="terminal-web-pages"]')
      .include('[data-testid="terminal-transcript"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('tasks', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('TC-1723: a task is met by its command, on the device chosen, and then explained', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    const reach = page.getByTestId('terminal-mission-reach');
    await expect(reach).toHaveAttribute('data-done', 'false');
    await typeCommand(page, 'ping -c 1 www');
    await expect(reach).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('terminal-mission-reach-explain')).toContainText('ttl=63');

    // dhclient on the client only says DHCP is off there; on the laptop it gets an address.
    const dhcp = page.getByTestId('terminal-mission-dhcp');
    await typeCommand(page, 'dhclient');
    await expect(transcript(page)).toContainText('DHCP は使っていません');
    await expect(dhcp).toHaveAttribute('data-done', 'false');
    await page.getByTestId('terminal-device').selectOption('laptop');
    await expect(transcript(page)).toContainText('-- laptop --');
    await typeCommand(page, 'dhclient');
    await expect(transcript(page)).toContainText('bound to 10.0.1.');
    await expect(dhcp).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('terminal-mission-dhcp-explain')).toContainText('DISCOVER');
  });
});

test.describe('faults', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('TC-1732: a fault is found with commands: a wrong pick says what it would show, the right one explains', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/tools/terminal?fault=f2');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await expect(page.getByTestId('terminal-fault-symptom')).toBeVisible();
    // A cause is chosen only after a command.
    await expect(page.getByTestId('terminal-fault-pick-web-down')).toBeDisabled();
    await typeCommand(page, 'curl http://www.example.test/');
    await expect(transcript(page)).toContainText("Couldn't connect to server");
    await typeCommand(page, 'nslookup www.example.test');
    await expect(transcript(page)).toContainText('Address: 10.0.2.80');

    await page.getByTestId('terminal-fault-pick-dns-unreachable').click();
    const feedback = page.getByTestId('terminal-fault-feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(feedback).toContainText('nslookup がタイムアウト');

    await page.getByTestId('terminal-fault-pick-web-down').click();
    await expect(feedback).toHaveAttribute('data-correct', 'true');
    await expect(feedback).toContainText('80 番');

    await page.getByTestId('terminal-fault-end').click();
    await expect(page.getByTestId('terminal-fault-start')).toBeVisible();
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('TC-1712: an unknown command, and help in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await typeCommand(page, 'foo');
    await expect(transcript(page)).toContainText('foo: command not found');
    await typeCommand(page, 'help');
    await expect(transcript(page)).toContainText('使えるコマンド');
  });
});

test.describe('phone', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'phone' });

  test('TC-1713: the input line under the terminal runs a command', async ({ page, demoPage }) => {
    await demoPage.goto('/tools/terminal');
    await expect(page.getByTestId('terminal-loading')).toHaveCount(0);
    await page.getByTestId('terminal-input').fill('ip addr');
    await page.getByTestId('terminal-run').click();
    await expect(transcript(page)).toContainText('inet 10.0.1.10/24');
    const widths = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1] as number);
  });
});
