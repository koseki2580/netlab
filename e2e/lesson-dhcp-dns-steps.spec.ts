import { expect, test } from './fixtures/harness';
import type { LessonPage } from './pages/LessonPage';

/**
 * TC-LESSON-DHCP-STEP — stepping walks the whole exchange the lesson just ran.
 *
 * After 「DHCP を実行」 the step control replayed only the DHCP ACK (the last of
 * four traces), and after the DNS run only the HTTP GET. It now starts at the
 * first message and carries on from each message into the next. The fetch is
 * a TCP connection followed by the GET and its answer (TC-625).
 */
const TID = {
  dhcpRun: 'dhcp-run',
  dnsRun: 'dns-run',
  position: 'step-exchange-position',
  brief: 'lesson-brief',
};

/** Every exchange position the step control passes through, in order. */
async function walkToEnd(lesson: LessonPage): Promise<string[]> {
  const seen: string[] = [];
  await lesson.stepToEnd({
    onStep: async () => {
      const text = await lesson.readPosition();
      if (seen[seen.length - 1] !== text) seen.push(text);
    },
  });
  return seen;
}

test.use({ viewportPreset: 'desktop' });

test('DHCP steps through DISCOVER, OFFER, REQUEST, ACK; DNS through query, answer, connect, fetch', async ({
  page,
  lessonPage,
}) => {
  const lesson = lessonPage.using({ position: page.getByTestId(TID.position) });
  await lesson.open('/services/dhcp-dns');

  // The explanation card floats over the canvas and says so.
  await expect(
    page.locator('[data-canvas-overlay]').filter({ has: page.getByTestId(TID.brief) }),
  ).toHaveCount(1);

  await page.getByTestId(TID.dhcpRun).click();
  await expect(page.getByTestId(TID.position)).toContainText('DHCP DISCOVER');
  const dhcp = await walkToEnd(lesson);
  expect(dhcp.map((line) => line.replace(/^.*[:：]\s*/, ''))).toEqual([
    'DHCP DISCOVER',
    'DHCP OFFER',
    'DHCP REQUEST',
    'DHCP ACK',
  ]);

  await page.getByTestId(TID.dnsRun).click();
  await expect(page.getByTestId(TID.position)).toContainText('DNS QUERY');
  const dns = await walkToEnd(lesson);
  // TC-625 — the GET waits for TCP's three messages, and its answer is shown.
  expect(dns.map((line) => line.replace(/^.*[:：]\s*/, ''))).toEqual([
    'DNS QUERY',
    'DNS RESPONSE',
    'TCP SYN',
    'TCP SYN-ACK',
    'TCP ACK',
    'HTTP GET',
    'HTTP 200',
  ]);
});
