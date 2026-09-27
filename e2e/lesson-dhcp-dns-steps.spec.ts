import { expect, test } from './fixtures/harness';

/**
 * TC-LESSON-DHCP-STEP — stepping walks the whole exchange the lesson just ran.
 *
 * After 「DHCP を実行」 the step control replayed only the DHCP ACK (the last of
 * four traces), and after the DNS run only the HTTP GET. It now starts at the
 * first message and carries on from each message into the next.
 */
const TID = {
  dhcpRun: 'dhcp-run',
  dnsRun: 'dns-run',
  next: 'demo-primary-action',
  position: 'step-exchange-position',
  brief: 'lesson-brief',
};

async function walkToEnd(page: import('@playwright/test').Page): Promise<string[]> {
  const next = page.getByTestId(TID.next);
  const position = page.getByTestId(TID.position);
  const seen: string[] = [];
  for (let i = 0; i < 60 && (await next.isEnabled()); i += 1) {
    await next.click();
    const text = (await position.textContent()) ?? '';
    if (seen[seen.length - 1] !== text) seen.push(text);
  }
  return seen;
}

test('DHCP steps through DISCOVER, OFFER, REQUEST, ACK; DNS through query, answer, fetch', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/services/dhcp-dns');

  // The explanation card floats over the canvas and says so.
  await expect(
    page.locator('[data-canvas-overlay]').filter({ has: page.getByTestId(TID.brief) }),
  ).toHaveCount(1);

  await page.getByTestId(TID.dhcpRun).click();
  await expect(page.getByTestId(TID.position)).toContainText('DHCP DISCOVER');
  const dhcp = await walkToEnd(page);
  expect(dhcp.map((line) => line.replace(/^.*[:：]\s*/, ''))).toEqual([
    'DHCP DISCOVER',
    'DHCP OFFER',
    'DHCP REQUEST',
    'DHCP ACK',
  ]);

  await page.getByTestId(TID.dnsRun).click();
  await expect(page.getByTestId(TID.position)).toContainText('DNS QUERY');
  const dns = await walkToEnd(page);
  expect(dns.map((line) => line.replace(/^.*[:：]\s*/, ''))).toEqual([
    'DNS QUERY',
    'DNS RESPONSE',
    'HTTP GET',
  ]);
});
