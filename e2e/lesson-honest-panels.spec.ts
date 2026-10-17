import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import type { DemoPage } from './pages/DemoPage';
import { SEL } from './selectors';

/**
 * TC-700..TC-712 — what a lesson's panels say agrees with what is on screen.
 *
 * Learner testers found panels that showed the end of an exchange while the
 * step was at its start, labels that did not follow a failover, a brief that
 * contradicted the default screen, numbers side by side with no labels, lines
 * left over from a run the lesson had already thrown away, and two lessons
 * with nothing to read.
 */
const ID = {
  arpSend: 'demo-primary-action',
  step: 'demo-step-action',
  arpRouter: 'arp-table-router-1',
  arpChange: 'arp-change',
  dhcpRun: 'dhcp-run',
  dhcpNext: 'demo-primary-action',
  dhcpNow: 'dhcp-client-now',
  dhcpDetailsHint: 'dhcp-details-hint',
  haFail: 'ha-fail-gateway',
  mplsLdp: 'mpls-ldp-brief',
  mplsPhp: 'mpls-php-disable',
  tcpConnect: 'tcp-connect',
  tcpMore: 'tcp-more-detail',
  tcpTtl: 'tcp-ttl-note',
  tcpSeq: 'tcp-seq-note',
  stpPingBc: 'stp-ping-bc',
  stpPriorityB: 'stp-priority-switch-b',
  stpLastFlow: 'stp-last-flow',
  stpPath: 'stp-trace-path',
  ospfProbe: 'ospf-send-probe',
  ospfFail: 'ospf-fail-link',
  ospfCurrent: 'ospf-route-current',
  ospfPrevious: 'ospf-route-previous',
  vlanDefinitions: 'vlan-definitions',
  vlanResult: 'vlan-latest-result',
  vlanSendAb: 'vlan-send-a1-b1',
  vlanBreak: 'vlan-break-trunk',
  vlanDrop: 'vlan-drop-words',
  subnetDrill: 'subnet-drill',
  brief: 'lesson-brief',
  traceChip: 'trace-selector-chip',
} as const;

async function open(page: Page, demoPage: DemoPage, path: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto(path);
}

async function press(page: Page, testId: string, times: number) {
  for (let i = 0; i < times; i += 1) await page.getByTestId(testId).click();
}

test('TC-700: the ARP tables follow the step', async ({ page, demoPage }) => {
  await open(page, demoPage, '/networking/arp');
  await page.getByTestId(ID.arpSend).click();
  const router = page.getByTestId(ID.arpRouter);
  await expect(router).toBeVisible();
  await expect(router).not.toContainText('203.0.113.10');

  // Step 1 is the Client creating the ping, step 2 the Router's question.
  await press(page, ID.step, 2);
  await expect(router).not.toContainText('203.0.113.10');
  await expect(page.getByTestId(ID.arpChange)).not.toContainText('203.0.113.1 ');

  // Step 3 is the Server's answer: now the Router knows it.
  await press(page, ID.step, 1);
  await expect(router).toContainText('203.0.113.10');
  await expect(page.getByTestId(ID.arpChange)).toContainText('203.0.113.10');
});

test('TC-702: the DHCP client state follows the step', async ({ page, demoPage }) => {
  await open(page, demoPage, '/services/dhcp-dns');
  await page.getByTestId(ID.dhcpRun).click();
  const now = page.getByTestId(ID.dhcpNow);
  await expect(now).toContainText('DISCOVER');
  await expect(now).not.toContainText('BOUND');
  await expect(page.getByTestId(ID.dhcpDetailsHint)).toContainText('end');

  // DISCOVER, OFFER, REQUEST each take a few hops; walk until the ACK.
  const next = page.getByTestId(ID.dhcpNext);
  for (let i = 0; i < 40; i += 1) {
    if ((await now.textContent())?.includes('BOUND')) break;
    if (!(await next.isEnabled())) break;
    await next.click({ timeout: 2_000 }).catch(() => undefined);
  }
  await expect(now).toContainText('BOUND');
  await expect(now).toContainText('192.168.1.10');
});

test('TC-703: the HA canvas labels follow a failover', async ({ page, demoPage }) => {
  await open(page, demoPage, '/networking/ha');
  const nodes = page.getByTestId(SEL.canvas.node);
  await expect(nodes.first()).toBeVisible();
  await expect(nodes).toContainText(['R1 master', 'R2 backup']);

  await page.getByTestId(ID.haFail).click();
  await expect(nodes).toContainText(['R1 down', 'R2 master']);

  await page.getByTestId(ID.haFail).click();
  await expect(nodes).toContainText(['R1 master', 'R2 backup']);
});

test('TC-704: the MPLS brief agrees with PHP on and off', async ({ page, demoPage }) => {
  await open(page, demoPage, '/networking/tunneling/mpls-l3vpn');
  const ldp = page.getByTestId(ID.mplsLdp);
  await expect(ldp).toContainText('pops');
  await expect(ldp).not.toContainText('always');

  await page.getByTestId(ID.mplsPhp).click();
  await expect(ldp).toContainText('swaps 16001 for 16002');
});

test('TC-705, TC-706: the TCP lesson labels its two TTLs and its two sequence numbers', async ({
  page,
  demoPage,
}) => {
  await open(page, demoPage, '/simulation/tcp-handshake');
  await page.getByTestId(ID.tcpConnect).click();
  await page.getByTestId(ID.tcpMore).click();

  // Create, the Router's question, the Server's answer, then the Router forwards.
  await press(page, 'demo-primary-action', 4);
  const ttl = page.getByTestId(ID.tcpTtl);
  await expect(ttl).toContainText('64');
  await expect(ttl).toContainText('63');
  await expect(ttl).toContainText('Router');

  // On through the SYN-ACK and the ACK.
  // The last press disables the button; stop there rather than wait on it.
  const next = page.getByTestId('demo-primary-action');
  for (let i = 0; i < 20; i += 1) {
    if (await page.getByTestId(ID.tcpSeq).isVisible()) break;
    if (!(await next.isEnabled())) break;
    await next.click({ timeout: 2_000 }).catch(() => undefined);
  }
  const seq = page.getByTestId(ID.tcpSeq);
  await expect(seq).toContainText('SYN');
  await expect(seq).toContainText('+ 1');
});

test('TC-707: a priority change clears the STP flow line with its trace', async ({
  page,
  demoPage,
}) => {
  await open(page, demoPage, '/networking/stp');
  await page.getByTestId(ID.stpPingBc).click();
  await expect(page.getByTestId(ID.stpLastFlow)).toContainText('B → C');

  await page.getByTestId(ID.stpPriorityB).fill('4096');
  await expect(page.getByTestId(ID.stpPath)).toContainText('No trace yet');
  await expect(page.getByTestId(ID.stpLastFlow)).not.toContainText('B → C');
});

test('TC-708: failing the OSPF link retires the up-link route line', async ({ page, demoPage }) => {
  await open(page, demoPage, '/routing/ospf-convergence');
  await demoPage.dismissBrief();
  await page.getByTestId(ID.ospfProbe).click();
  await expect(page.getByTestId(ID.ospfCurrent)).toContainText('(link up)');

  await page.getByTestId(ID.ospfFail).click();
  await expect(page.getByTestId(ID.ospfCurrent)).not.toContainText('link up');
  await expect(page.getByTestId(ID.ospfPrevious)).toContainText('(link up)');
});

test('TC-709, TC-710: the VLAN lesson defines its words, waits, and says a drop plainly', async ({
  page,
  demoPage,
}) => {
  await open(page, demoPage, '/networking/vlan');
  const words = page.getByTestId(ID.vlanDefinitions);
  await expect(words).toContainText('VLAN');
  await expect(words).toContainText('access');
  await expect(words).toContainText('trunk');
  await expect(page.getByTestId(ID.vlanResult)).toContainText('nothing sent yet');
  await expect(page.getByTestId(ID.traceChip)).toHaveCount(0);

  await page.getByTestId(ID.vlanBreak).click();
  await page.getByTestId(ID.vlanSendAb).click();
  const drop = page.getByTestId(ID.vlanDrop);
  await expect(drop).toContainText('no port in the packet’s VLAN');
  await expect(drop).not.toContainText('no-egress-in-vlan:');
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`TC-711: the subnet practice card is as tall as its content at ${viewport.width}px`, async ({
    page,
    demoPage,
  }) => {
    await page.setViewportSize(viewport);
    await demoPage.goto('/learning/subnetting');
    const drill = page.getByTestId(ID.subnetDrill);
    await expect(drill).toBeVisible();
    const size = await drill.evaluate((el) => ({ shown: el.clientHeight, full: el.scrollHeight }));
    expect(size.shown).toBeGreaterThanOrEqual(size.full - 1);
  });
}

test('TC-712: the Step-by-Step and Trace Inspector lessons each say what to look at', async ({
  page,
  demoPage,
}) => {
  await open(page, demoPage, '/simulation/step');
  const stepBrief = page.getByTestId(ID.brief);
  await expect(stepBrief).toContainText('203.0.113.0/24');
  await expect(stepBrief).toContainText('0.0.0.0/0');
  await expect(stepBrief).toContainText('longest');
  // One packet was sent, so one trace is recorded, not two.
  await demoPage.waitForTraceCount(1);
  expect(await demoPage.traces()).toHaveLength(1);
  // What the brief says is what R-1's table shows: /24 is the row used.
  await press(page, 'demo-primary-action', 2);
  await expect(page.getByTestId('step-route-verdict')).toContainText('203.0.113.0/24');

  await demoPage.goto('/simulation/trace-inspector');
  const traceBrief = page.getByTestId(ID.brief);
  await expect(traceBrief).toContainText('TTL');
  await expect(traceBrief).toContainText('61');
  await expect(traceBrief).toContainText('MAC');
});
