import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * TC-350 to TC-364 — the beginner lessons can be learned from with no IT
 * background.
 *
 * Five learners with none studied the seven lessons in order. What failed was
 * the same on every one: a small first sentence carrying several unknown
 * words, directions that pointed "right" on a phone, results that did not say
 * the main idea, and text that did not match the screen. Each lesson now opens
 * on one plain line and says what its screen really shows.
 */
const T = {
  lead: 'lesson-lead',
  more: 'lesson-more',
  primary: 'demo-primary-action',
  hop: 'trace-hop',
  bubble: 'canvas-hop-bubble',
  packetViewer: 'packet-viewer-panel',
} as const;

async function inJapanese(page: Page, width = 1366, height = 768) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the text checks below then fail loudly */
    }
  });
}

const LEADS: [string, string][] = [
  ['/learning/subnetting', '太字の数字が同じなら、同じネットワークです。'],
  ['/networking/arp', 'MAC アドレス'],
  ['/routing/client-server', '別のネットワークへ送るときは、まず出口のルータに渡します。'],
  ['/simulation/tcp-handshake', 'TCP は、話す前に「もしもし」と確かめ合ってから送ります。'],
  ['/networking/udp', 'TCP は電話、UDP ははがき。はがきは、届いたかどうかを確かめません。'],
  ['/services/dhcp-dns', 'まず住所をもらう（DHCP）。次に、名前から相手の住所を調べる（DNS）。'],
  ['/simulation/nat', 'NAT は、家のみんなで 1 つの住所を共有するしくみです。'],
];

for (const [width, height] of [
  [1366, 768],
  [390, 844],
] as const) {
  for (const [path, words] of LEADS) {
    test(`TC-350: ${path} opens on one plain line in large type at ${width}px`, async ({
      page,
      demoPage,
    }) => {
      await inJapanese(page, width, height);
      await demoPage.goto(path);
      const lead = page.getByTestId(T.lead);
      await expect(lead).toHaveCount(1);
      await expect(lead).toContainText(words);
      const size = await lead.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
      expect(size, 'the first line is at least 16px').toBeGreaterThanOrEqual(16);
    });
  }
}

test('TC-351: the subnet warm-up prints each pair large, network part bold and underlined', async ({
  page,
}) => {
  await inJapanese(page);
  await page.goto('/#/learning/subnetting');
  const network = page.getByTestId('subnet-starter-q1-a').locator('[data-part="network"]');
  await expect(network).toHaveText('10.1.5');
  await expect(page.getByTestId('subnet-starter-q3-b').locator('[data-part="network"]')).toHaveText(
    '172.16',
  );
  const style = await network.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      weight: Number(computed.fontWeight),
      underline: computed.textDecorationLine,
      size: parseFloat(computed.fontSize),
    };
  });
  expect(style.weight).toBeGreaterThanOrEqual(700);
  expect(style.underline).toContain('underline');
  expect(style.size, 'larger than the explanation').toBeGreaterThanOrEqual(20);
  await expect(page.getByTestId('subnet-starter-rule')).toContainText(
    '/24（マスク 255.255.255.0）',
  );
});

test('TC-352: the choice a learner pressed stays marked', async ({ page }) => {
  await inJapanese(page);
  await page.goto('/#/learning/subnetting');
  const same = page.getByTestId('subnet-starter-q2-same');
  const different = page.getByTestId('subnet-starter-q2-different');
  await expect(same).toHaveAttribute('aria-pressed', 'false');

  await same.click();
  await expect(same).toHaveAttribute('aria-pressed', 'true');
  await expect(same).toContainText('●');
  await expect(different).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('subnet-starter-q2-feedback')).toHaveAttribute(
    'data-correct',
    'no',
  );

  await different.click();
  await expect(different).toHaveAttribute('aria-pressed', 'true');
  await expect(same).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('subnet-starter-q2-feedback')).toHaveAttribute(
    'data-correct',
    'yes',
  );
});

test('TC-353: the ARP lesson says who asks whom here, and its bubble carries the name ARP', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId('arp-who-asks')).toContainText('Router');
  await expect(page.getByTestId(T.primary)).toHaveText('▶ Client から Server へ送ってみる');
  await expect(page.getByTestId('arp-send-hint')).toContainText('ping');
  // The fine print is there, closed.
  await expect(page.getByTestId(T.more)).toHaveJSProperty('open', false);
  await expect(page.getByTestId(T.more)).toContainText('ff:ff:ff:ff:ff:ff');

  // Before a send the table promises nothing about filling up step by step.
  await expect(page.getByTestId('arp-table-empty')).toBeVisible();
  await page.getByTestId(T.primary).click();
  await expect(page.getByTestId('arp-table-note')).toContainText('結果');

  const firstHops = page.getByTestId(T.hop);
  // Row 1 of this lesson's trace is the Router's question (ARP-REQ).
  await firstHops.nth(1).click();
  const bubble = page.getByTestId(T.bubble);
  await expect(bubble).toHaveAttribute('data-kind', 'arpRequest');
  await expect(bubble).toContainText('ARP の質問');
  await expect(bubble).toContainText('203.0.113.10');
});

test('TC-354: the client-server lesson says the packet arrived, and its TTL sentence matches the rows', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId('client-server-result')).toHaveCount(0);
  await page.getByTestId(T.primary).first().click();
  await expect(page.getByTestId('client-server-result')).toContainText(
    'Client → SW-1 → R-1 → SW-2 → Server',
  );
  await expect(page.getByTestId('client-server-ttl')).toContainText(
    'R-1 の行（FWD R-1）ではまだ 64、次の SW-2 の行から 63 です',
  );

  // What the sentence promises is what the trace holds.
  await demoPage.waitForTraceCount(1);
  const [trace] = await demoPage.traces();
  const r1 = trace!.hops.findIndex((hop) => hop.event === 'forward' && hop.nodeLabel === 'R-1');
  expect(trace!.hops[r1]!.ttl).toBe(64);
  expect(trace!.hops[r1 + 1]!.nodeLabel).toBe('SW-2');
  expect(trace!.hops[r1 + 1]!.ttl).toBe(63);

  // And what the learner reads on pressing those two rows.
  const hops = page.getByTestId(T.hop);
  await hops.nth(r1).click();
  await expect(page.getByTestId(T.packetViewer)).toContainText('64');
  await hops.nth(r1 + 1).click();
  await expect(page.getByTestId(T.packetViewer)).toContainText('63');
});

test('TC-355, TC-356, TC-357: the three handshake messages are tied to the telephone phrases, play at one press each, and both state displays agree', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/simulation/tcp-handshake');
  const gloss = page.getByTestId('tcp-handshake-gloss');
  await expect(gloss).toContainText('SYN＝「もしもし」');
  await expect(gloss).toContainText('SYN-ACK＝「はい、聞こえます」');
  await expect(gloss).toContainText('ACK＝「では話します」');
  await expect(page.getByTestId('tcp-jump-1')).toBeDisabled();

  const diagram = {
    client: page.getByTestId('tcp-client-state-code'),
    server: page.getByTestId('tcp-server-state-code'),
  };
  const panel = {
    client: page.getByTestId('tcp-panel-client-state'),
    server: page.getByTestId('tcp-panel-server-state'),
  };
  const both = async (client: string, server: string) => {
    await expect(diagram.client).toHaveText(client);
    await expect(diagram.server).toHaveText(server);
    await expect(panel.client).toHaveText(client);
    await expect(panel.server).toHaveText(server);
  };

  // Pressing "connect" no longer reads ESTABLISHED anywhere: nothing has been watched yet.
  await page.getByTestId('tcp-connect').click();
  await both('CLOSED', 'LISTEN');
  await expect(page.getByTestId('tcp-speech')).toHaveCount(0);

  const speech = page.getByTestId('tcp-speech');
  await page.getByTestId('tcp-jump-1').click();
  await expect(speech).toHaveAttribute('data-segment', 'syn');
  await expect(speech).toContainText('もしもし');
  await both('SYN_SENT', 'SYN_RECEIVED');

  await page.getByTestId('tcp-jump-2').click();
  await expect(speech).toHaveAttribute('data-speaker', 'server');
  await expect(speech).toContainText('はい、聞こえます');
  await both('ESTABLISHED', 'SYN_RECEIVED');

  await page.getByTestId('tcp-jump-3').click();
  await expect(speech).toContainText('では話します');
  await both('ESTABLISHED', 'ESTABLISHED');
});

test('TC-358: sequence numbers and the byte dump wait behind a closed disclosure', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/simulation/tcp-handshake');
  await page.getByTestId('tcp-connect').click();
  const more = page.getByTestId('tcp-more-detail');
  await expect(more).toHaveJSProperty('open', false);
  await expect(more).toContainText('localSeq=');
  await expect(page.getByTestId('tcp-connection-state')).not.toContainText('localSeq');
  await expect(page.getByTestId('tcp-connection-state')).toContainText(
    '相手の「もしもし」（SYN）を待っている',
  );
});

test('TC-359, TC-360: UDP is contrasted with TCP, says first that it went with no greeting and no check, and its large send is not red', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/networking/udp');
  const compare = page.getByTestId('udp-compare');
  await expect(compare).toContainText('TCP（電話）');
  await expect(compare).toContainText('UDP（はがき）');
  await expect(compare).toContainText('しない');

  const large = page.getByTestId('udp-send-large');
  const [red, green, blue] = await large.evaluate(
    (el) =>
      (window.getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).map(Number) as number[],
  );
  expect(red! > 100 && green! < 80 && blue! < 60, 'the large send is not painted red').toBe(false);
  await expect(page.getByTestId('udp-large-hint')).toContainText('押して大丈夫です');

  await page.getByTestId(T.primary).click();
  const sent = page.getByTestId('udp-sent-result');
  await expect(sent).toContainText('あいさつなしで');
  await expect(sent).toContainText('確かめていません');
  await expect(sent).toContainText('送り直しません');
  const sentBox = await sent.boundingBox();
  const sizeBox = await page.getByTestId('udp-size-result').boundingBox();
  expect(sentBox!.y, 'the main idea comes before the byte sum').toBeLessThan(sizeBox!.y);
  expect(
    sizeBox!.x + sizeBox!.width,
    'the panel is not cut by the screen edge',
  ).toBeLessThanOrEqual(1366);
});

test('TC-361, TC-362: DHCP and DNS are two cards with their own ordered actions, and the ⚠ is explained', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/services/dhcp-dns');
  const dhcpCard = page.getByTestId('dhcp-card');
  const dnsCard = page.getByTestId('dns-card');
  await expect(dhcpCard).toContainText('① DHCP＝住所をくれる係');
  await expect(dnsCard).toContainText('② DNS＝名前から住所を調べる電話帳');
  await expect(dhcpCard).toContainText('デフォルトゲートウェイ（外への出口）');

  const dhcp = page.getByTestId('dhcp-run');
  const dns = page.getByTestId('dns-run');
  await expect(dhcp).toHaveAttribute('data-emphasised', 'yes');
  await expect(dns).toBeDisabled();
  await expect(page.getByTestId('dns-wait-hint')).toBeVisible();
  await expect(page.getByTestId('dhcp-warning-caption')).toContainText('まだ住所がない');

  await dhcp.click();
  await expect(page.getByTestId('dhcp-result')).toContainText('外への出口');
  await expect(page.getByTestId('dhcp-warning-caption')).toHaveCount(0);
  await expect(dns).toBeEnabled();
  await expect(dns).toHaveAttribute('data-emphasised', 'yes');
  await expect(dhcp).toHaveAttribute('data-emphasised', 'no');

  await dns.click();
  await expect(page.getByTestId('dns-result')).toContainText('192.168.1.10');
});

test('TC-363: the NAT lesson is short, with the real-device detail folded away, and says what NAT is for', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page);
  await demoPage.goto('/simulation/nat');
  const note = page.getByTestId('nat-port-allocation-note');
  await expect(note).toContainText('1024 から順に');
  const more = page.getByTestId(T.more);
  await expect(more).toHaveJSProperty('open', false);
  await expect(more).toContainText('Linux の MASQUERADE');

  await expect(page.getByTestId('nat-send-client-a')).toHaveText('▶ Client A から外へ送る');
  await expect(page.getByTestId('nat-send-inbound')).toHaveText(
    '▶ 外から Client A へ送る（ポート 8080）',
  );

  await page.getByTestId('nat-send-client-a').click();
  await expect(page.getByTestId(T.bubble)).toContainText('家のみんなで 1 つの住所を共有');
  await expect(page.getByTestId('nat-result')).toContainText('家のみんなで 1 つの住所を共有');
  await page.getByTestId('nat-send-client-b').click();
  await expect(page.getByTestId('nat-result')).toHaveAttribute('data-machines', '2');
  await expect(page.getByTestId('nat-result')).toContainText(
    'どちらも 203.0.113.1 から来たように見えます',
  );
  await expect(page.getByTestId('nat-table-grid')).toContainText('プライベート（内部ローカル）');
  await expect(page.getByTestId('nat-table-grid')).toContainText('グローバル（内部グローバル）');
});

test('TC-364: on a phone no NAT address breaks mid-number, and B, inbound, A, A, B leaves three rows with Client A on 1025', async ({
  page,
  demoPage,
}) => {
  await inJapanese(page, 390, 844);
  await demoPage.goto('/simulation/nat');
  const globals = page.getByTestId('nat-inside-global');
  const order = [
    ['nat-send-client-b', 1],
    ['nat-send-inbound', 2],
    ['nat-send-client-a', 3],
    ['nat-send-client-a', 3],
    ['nat-send-client-b', 3],
  ] as const;
  for (const [button, rows] of order) {
    await page.getByTestId(button).click();
    await expect(globals).toHaveCount(rows);
  }

  const locals = await page.getByTestId('nat-inside-local').allTextContents();
  const shown = await globals.allTextContents();
  expect(shown[locals.indexOf('192.168.1.10:54321')]).toBe('203.0.113.1:1025');
  expect(shown[locals.indexOf('192.168.1.20:54322')]).toBe('203.0.113.1:1024');

  for (let row = 0; row < 3; row += 1) {
    const box = await globals.nth(row).boundingBox();
    expect(box!.height, 'one line: the address is not broken').toBeLessThan(26);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
});
