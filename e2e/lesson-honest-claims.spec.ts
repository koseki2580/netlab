import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * TC-623, TC-625 to TC-631 — a learner who checks every sentence against the
 * screen finds them in agreement.
 *
 * A reader with no IT background went through the course and the beginner
 * lessons testing each claim: "an answer is remembered" beside an ARP question
 * asked again on every send, "data follows the three messages" before a GET
 * sent with none, "the switch does not know" one step before "the PC decides".
 * Where the screen can show the real behaviour it now does; where it cannot,
 * the lesson says once what a real network does and what this screen does.
 */
test.use({ appLocale: 'ja' });

async function atSize(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
}

test('TC-623: the mark on the failing course step gives the missing way out as the cause', async ({
  page,
  demoPage,
}) => {
  test.setTimeout(120_000);
  await atSize(page, 1500, 950);
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-course-step', '3');
    } catch {
      /* the title check below then fails loudly */
    }
  });
  await demoPage.goto('/course');
  await expect(page.getByTestId('course-title')).toContainText('つながっていない');
  await page.getByTestId('course-send').click();
  const outcome = page.getByTestId('course-outcome');
  await expect(outcome).toHaveAttribute('data-tone', 'planned-failure');
  await expect(outcome).toContainText('ネットワークどうしをつなぐ機器');
  await expect(outcome).toContainText('本物の PC-A は、渡す相手がいないので送り出しません');
  await expect(outcome).not.toContainText('しか知りません');
  await expect(page.getByTestId('course-diagram')).toContainText(
    '別のネットワークへ出る道がありません',
  );
  await expect(page.getByTestId('course-diagram')).not.toContainText('捨てられました');
});

test('TC-625, TC-626: the page is fetched over a connection opened after the name is looked up', async ({
  page,
  demoPage,
}) => {
  await atSize(page);
  await demoPage.goto('/services/dhcp-dns');
  await expect(page.getByTestId('dhcp-ack-note')).toContainText('TCP の ACK とは別');

  await page.getByTestId('dhcp-run').click();
  const lease = page.getByTestId('dhcp-result');
  await expect(lease).toContainText('192.168.1.101');
  await expect(page.getByTestId('dhcp-result-where')).toContainText('DHCP Client の下');
  // The first device drawn is the DHCP client; its leased address is under it.
  await expect
    .poll(() =>
      page
        .getByTestId('topology-node')
        .first()
        .evaluate((node) => window.getComputedStyle(node, '::after').content),
    )
    .toContain('192.168.1.101');

  await page.getByTestId('dns-run').click();
  await expect(page.getByTestId('dns-result')).toContainText('192.168.1.10');
  await expect(page.getByTestId('fetch-story-lookup')).toContainText('DNS QUERY');
  const handshake = page.getByTestId('fetch-handshake');
  await expect(handshake).toHaveJSProperty('open', false);
  await expect(page.getByTestId('fetch-handshake-summary')).toHaveText(
    'TCP の接続（3 回のやり取り）',
  );
  await page.getByTestId('fetch-handshake-summary').click();
  await expect(page.getByTestId('fetch-handshake-detail')).toBeVisible();
  await expect(page.getByTestId('fetch-handshake-detail')).toContainText('SYN-ACK');
  await expect(page.getByTestId('fetch-story-page')).toContainText('200');
  await expect(page.getByTestId('fetch-story-steps')).toContainText('7 通');

  // A second press: the name is remembered, so nothing is asked of DNS, and
  // the lesson says that rather than "DNS answered".
  await page.getByTestId('dns-run').click();
  await expect(page.getByTestId('fetch-story-steps')).toContainText('5 通');
  await expect(page.getByTestId('dns-result')).toContainText('覚えています');
  await expect(page.getByTestId('fetch-story-lookup')).toContainText('今回は不要');
});

test('TC-627: the ARP lesson says what a real device remembers and what this screen replays', async ({
  page,
  demoPage,
}) => {
  await atSize(page);
  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId('arp-brief-mac')).not.toContainText('最初のパケットを送る前');
  await expect(page.getByTestId('arp-already-known')).toContainText(
    '前もって知っていることはありません',
  );
  await expect(page.getByTestId('arp-remember-note')).toHaveCount(0);

  await page.getByTestId('demo-primary-action').click();
  const note = page.getByTestId('arp-remember-note');
  await expect(note).toContainText('数分のあいだ覚えていて');
  await expect(note).toContainText('送るたびに聞き直します');
  await expect(page.getByTestId('arp-table-kept')).toContainText('本物の機器が覚えておく内容');
  await expect(page.getByTestId('arp-table-kept')).toContainText('相手の質問から覚えた');

  // The same question is on screen again after a second send, as the note says.
  await page.getByTestId('demo-primary-action').click();
  await expect(page.getByTestId('lesson-trace-timeline')).toContainText('ARP-REQ');
  await expect(note).toBeVisible();
});

test('TC-628: the NAT lesson shows the reply, says where the inbound rule came from, and lists no ARP rows', async ({
  page,
  demoPage,
}) => {
  await atSize(page);
  await demoPage.goto('/simulation/nat');
  await expect(page.getByTestId('nat-port-gloss')).toContainText(
    'ケーブルの差し込み口ではなく、機器の中の窓口の番号',
  );
  await expect(page.getByTestId('nat-inbound-note')).toContainText(
    '前もって「ポート 8080 に来たものは Client A のポート 80 へ渡す」',
  );
  const reply = page.getByTestId('nat-send-reply');
  await expect(reply).toBeDisabled();

  await page.getByTestId('nat-send-client-a').click();
  await expect(page.getByTestId('nat-inside-global')).toHaveText('203.0.113.1:1024');
  await expect(reply).toBeEnabled();
  await expect(reply).toContainText('Client A あて');
  const timeline = page.getByTestId('demo-trace-log');
  await expect(timeline).toContainText('DELIVER');
  await expect(timeline).not.toContainText('ARP-REQ');
  await expect(page.getByTestId('nat-arp-note')).toContainText('ARP の行を省いています');

  await reply.click();
  const result = page.getByTestId('nat-reply-result');
  await expect(result).toContainText('203.0.113.1:1024 あてに戻ってきました');
  await expect(result).toContainText('192.168.1.10:54321 に戻し、Client A に渡しました');
  await expect(timeline).toContainText('TCP SYN-ACK');
  // The reply used the row that was there; it did not add one.
  await expect(page.getByTestId('nat-inside-global')).toHaveCount(1);
});

test('TC-629: the TCP lesson shows a connection’s numbers once its three messages have been watched', async ({
  page,
  demoPage,
}) => {
  test.setTimeout(120_000);
  await atSize(page);
  await demoPage.goto('/simulation/tcp-handshake');
  await expect(page.getByTestId('tcp-arp-note')).toHaveCount(0);
  await page.getByTestId('tcp-connect').click();
  await expect(page.getByTestId('tcp-arp-note')).toContainText(
    '尋ねるのは最初の SYN のときだけです',
  );

  const more = page.getByTestId('tcp-more-detail');
  await expect(more).toContainText('セグメント＝TCP が送る 1 通');
  await expect(more).not.toContainText('localSeq=');
  await expect(page.getByTestId('tcp-numbers-pending')).toContainText('3 回目まで進めると');

  for (const [jump, client, server] of [
    ['tcp-jump-1', 'SYN_SENT', 'SYN_RECEIVED'],
    ['tcp-jump-2', 'ESTABLISHED', 'SYN_RECEIVED'],
    ['tcp-jump-3', 'ESTABLISHED', 'ESTABLISHED'],
  ] as const) {
    if (jump === 'tcp-jump-3') await expect(more).not.toContainText('localSeq=');
    await page.getByTestId(jump).click();
    await expect(page.getByTestId('tcp-panel-client-state')).toHaveText(client, {
      timeout: 30_000,
    });
    await expect(page.getByTestId('tcp-panel-server-state')).toHaveText(server, {
      timeout: 30_000,
    });
  }
  await expect(page.getByTestId('tcp-connection-numbers')).toContainText('localSeq=');
  await expect(page.getByTestId('tcp-numbers-pending')).toHaveCount(0);
});

test('TC-630: the client–server areas are named for whose network each is', async ({
  page,
  demoPage,
}) => {
  await atSize(page, 1600, 950);
  await demoPage.goto('/routing/client-server');
  const legend = page.getByTestId('area-legend');
  await expect(legend).toContainText('Client のネットワーク');
  await expect(legend).toContainText('Server のネットワーク');
  await expect(legend).not.toContainText(/Private|Public/i);
  const scope = page.getByTestId('client-server-scope');
  await expect(scope).toContainText('最初の 1 通だけ');
  await expect(scope).toContainText('NAT のレッスン');
});

test('TC-631: the UDP lesson bridges "port" and says what a real network does with a large send first', async ({
  page,
  demoPage,
}) => {
  await atSize(page);
  await demoPage.goto('/networking/udp');
  await expect(page.getByTestId('udp-port-gloss')).toContainText(
    'ケーブルの差し込み口ではなく、機器の中の窓口の番号',
  );
  await expect(page.getByTestId('udp-large-hint')).toContainText(
    '本物のネットワークは、それより大きいデータを小さく分けて送ります',
  );
  await page.getByTestId('udp-send-large').click();
  const pieces = page.getByTestId('udp-size-pieces');
  await expect(pieces).toContainText('本物のネットワークなら、3 個に分けて送る大きさです');
  await expect(pieces).toContainText('この画面では分けずに、1 個のまま届きました');
});
