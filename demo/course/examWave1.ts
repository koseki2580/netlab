/**
 * Final-test questions for the first wave of deeper basics (BGP LOCAL_PREF,
 * IGMP snooping, the stateful firewall flag), offered as new entries for the
 * owner of the level files to place: every level holds exactly ten questions,
 * so these are not wired into one here. `lesson` is the lesson that teaches
 * each; `taughtBy` is the path-stop id to give it in the level it joins.
 *
 * Each right answer is what the simulator does on the scenario below (see
 * `examWave1.test.ts`) and what the standard gives: RFC 4271 §9.1 (BGP),
 * RFC 4541 (snooping), and stateful inspection as firewalls do it.
 */

import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import { ipToMulticastMac } from '../../src/utils/multicastMac';
import type { ExamQuestion } from './examQuestions';

export interface ExamCandidate extends ExamQuestion {
  /** The lesson that teaches it (a manifest path). */
  readonly lesson: string;
}

export const EXAM_WAVE1: readonly ExamCandidate[] = [
  {
    id: 'bgp-local-pref-exit',
    prompt: {
      en: 'A site router learns the server’s network from two providers over eBGP. Through provider A the AS_PATH is 65010 65040; through provider B it is 65020 65030 65040. Both routes have LOCAL_PREF 100. You give the routes learned from provider B LOCAL_PREF 150. Which way does the site’s traffic to the server leave, and why?',
      ja: '拠点のルータは、サーバーのネットワークへの経路を 2 つのプロバイダから eBGP で教わっています。プロバイダ A 経由の AS_PATH は 65010 65040、プロバイダ B 経由は 65020 65030 65040 で、どちらの LOCAL_PREF も 100 です。プロバイダ B から教わった経路の LOCAL_PREF を 150 にします。サーバーへの通信はどちらから出ていきますか。それはなぜですか。',
    },
    options: [
      {
        en: 'Through provider A: the shorter AS_PATH is compared first',
        ja: 'プロバイダ A から。短い AS_PATH が先に比べられるから',
      },
      {
        en: 'Through provider A: the lower LOCAL_PREF wins, as a cost does',
        ja: 'プロバイダ A から。コストと同じで LOCAL_PREF は小さいほうが勝つから',
      },
      {
        en: 'Through provider B: the higher LOCAL_PREF is compared first',
        ja: 'プロバイダ B から。大きい LOCAL_PREF が先に比べられるから',
      },
      {
        en: 'Through both, half each: each attribute favours one route',
        ja: '両方から半分ずつ。それぞれの属性が別の経路を選ぶから',
      },
    ],
    answer: 2,
    explanation: {
      en: 'BGP compares LOCAL_PREF before anything else, and the higher wins (RFC 4271 §9.1). Only between routes of equal LOCAL_PREF does the shorter AS_PATH decide; that is why the traffic left by provider A before. LOCAL_PREF is the usual way for a network to choose its own way out. It is not a cost: unlike an OSPF cost, more is better. Two routes are used together only where the router is set to share load between equal routes, and these two are not equal.',
      ja: 'BGP は何よりも先に LOCAL_PREF を比べ、大きいほうが勝ちます（RFC 4271 §9.1）。LOCAL_PREF が同じ経路どうしのときだけ、短い AS_PATH が決め手になります。前にプロバイダ A から出ていたのはそのためです。LOCAL_PREF は、自分のネットワークの出口を選ぶときのふつうの方法です。コストではありません。OSPF のコストとちがい、大きいほうが選ばれます。2 つの経路をいっしょに使うのは、同じ値の経路で負荷を分けるよう設定したときだけで、この 2 つは同じ値ではありません。',
    },
    taughtBy: 'dynamic-routing',
    lesson: '/routing/dynamic',
  },
  {
    id: 'igmp-snooping-ports',
    prompt: {
      en: 'Four hosts are on one switch, all in VLAN 10, on ports 1 to 4. The switch does IGMP snooping and there is no multicast router. The host on port 3 has sent an IGMP membership report for 239.1.1.1; nobody has joined 239.2.2.2. The host on port 1 sends a stream to each group. Out of which ports does the switch send each stream?',
      ja: '1 台のスイッチのポート 1〜4 に 4 台の機器があり、すべて VLAN 10 です。スイッチは IGMP スヌーピングをしていて、マルチキャストルータはありません。ポート 3 の機器は 239.1.1.1 への参加報告（IGMP メンバーシップレポート）を送っています。239.2.2.2 にはだれも参加していません。ポート 1 の機器が、それぞれのグループへ映像を流します。スイッチは、それぞれをどのポートから送り出しますか。',
    },
    options: [
      {
        en: '239.1.1.1 to port 3 only; 239.2.2.2 to ports 2, 3 and 4',
        ja: '239.1.1.1 はポート 3 だけ。239.2.2.2 はポート 2・3・4',
      },
      {
        en: '239.1.1.1 to port 3 only; 239.2.2.2 to no port at all',
        ja: '239.1.1.1 はポート 3 だけ。239.2.2.2 はどのポートにも出さない',
      },
      {
        en: 'Both streams to ports 2, 3 and 4: multicast always floods',
        ja: 'どちらもポート 2・3・4。マルチキャストはいつも全ポートに出るから',
      },
      {
        en: '239.1.1.1 to ports 2, 3 and 4; 239.2.2.2 to no port',
        ja: '239.1.1.1 はポート 2・3・4。239.2.2.2 はどのポートにも出さない',
      },
    ],
    answer: 0,
    explanation: {
      en: 'IGMP snooping lets the switch read the membership reports that pass through it and remember which ports want which group. A stream to a group with a known member goes only to the member ports (and to the ports of multicast routers, of which there are none here). A stream to a group nobody has joined is not known to anyone, so the switch floods it within the VLAN, as RFC 4541 recommends by default; some switches can be set to drop it instead.',
      ja: 'IGMP スヌーピングでは、スイッチが通り過ぎる参加報告を読んで、どのポートがどのグループを受けたいかを覚えます。参加者がわかっているグループへの映像は、参加したポートにだけ送ります（マルチキャストルータのポートにも送りますが、ここにはありません）。だれも参加していないグループへの映像は、行き先がわからないので、VLAN 内の全ポートに送ります。RFC 4541 がすすめる標準のふるまいです。捨てるように設定できるスイッチもあります。',
    },
    taughtBy: 'multicast',
    lesson: '/networking/multicast',
  },
  {
    id: 'stateful-firewall-reply',
    prompt: {
      en: 'A router’s interface toward the internet has an inbound list with one rule, “deny everything”, and an outbound list that permits TCP from the office to anywhere. The router’s stateful firewall is on. A PC in the office opens a TCP connection to a web server on port 443. Later the web server tries to open its own TCP connection to the PC on port 22. What happens?',
      ja: 'ルータのインターネット側のインターフェースには、受信の一覧に「すべて止める」の 1 行だけがあり、送信の一覧はオフィスから任意の宛先への TCP を通します。ルータのステートフルファイアウォールは有効です。オフィスの PC が、Web サーバーのポート 443 に TCP でつなぎます。そのあと Web サーバーが、PC のポート 22 へ自分から TCP でつなごうとします。どうなりますか。',
    },
    options: [
      {
        en: 'Both are refused: the inbound list stops replies as well',
        ja: 'どちらも止められる。受信の一覧は返事も止めるから',
      },
      {
        en: 'Replies on 443 get in; the new connection to 22 is refused',
        ja: '443 の返事は届き、22 への新しい接続は止められる',
      },
      {
        en: 'Both get in: once they have talked, the server may connect too',
        ja: 'どちらも届く。一度やりとりしたので、サーバーからもつなげるから',
      },
      {
        en: 'The replies are refused; the new connection to 22 gets in',
        ja: '返事は止められ、22 への新しい接続は届く',
      },
    ],
    answer: 1,
    explanation: {
      en: 'A stateful firewall remembers each connection the outbound list let out (addresses, ports and protocol) and lets in what comes back on it, whatever the inbound list says. A connection the server opens itself is not a reply to anything, so it still meets the inbound list, which refuses it. That is the point of the flag: replies come home without opening the network to the internet. Without the flag, the inbound list would refuse the replies too. (This simulator tracks TCP and UDP; real firewalls also track ping.)',
      ja: 'ステートフルファイアウォールは、送信の一覧が通した接続（アドレス・ポート・プロトコル）を覚えておき、その接続への返事は受信の一覧にかかわらず通します。サーバーが自分から始めた接続は何かへの返事ではないので、受信の一覧にかかり、止められます。返事だけは帰ってきて、インターネットからネットワークを開けずにすむ、というのがこの機能の目的です。この機能がなければ、受信の一覧は返事も止めます。（このシミュレータが覚えるのは TCP と UDP です。実際のファイアウォールは ping も覚えます。）',
    },
    taughtBy: 'acl',
    lesson: '/simulation/acl',
  },
];

// --- The scenarios, as the simulator runs them (examWave1.test.ts) ----------------

const node = (id: string, ip: string, role: 'client' | 'server' = 'client') => ({
  id,
  type: role,
  position: { x: 0, y: 0 },
  data: { label: id, role, layerId: 'l7' as const, ip },
});

const packetOf = (
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  dstMac: string,
  l4: Record<string, unknown>,
  protocol: number,
): InFlightPacket =>
  ({
    id: `exam-${srcNodeId}-${dstNodeId}-${dstIp}-${String(l4.dstPort)}`,
    srcNodeId,
    dstNodeId,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:00',
      dstMac,
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol,
        payload: { layer: 'L4', ...l4, payload: { layer: 'raw', data: '' } },
      },
    },
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: 0,
  }) as unknown as InFlightPacket;

/** Four hosts on one switch, VLAN 10, ports 1 to 4; the sender is on port 1. */
export const IGMP_SCENARIO = {
  topology: {
    nodes: [
      node('h1', '10.0.10.1'),
      node('h2', '10.0.10.2'),
      node('h3', '10.0.10.3'),
      node('h4', '10.0.10.4'),
      {
        id: 'sw',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw',
          role: 'switch',
          layerId: 'l2' as const,
          vlans: [{ vlanId: 10, name: 'v10' }],
          ports: ['p1', 'p2', 'p3', 'p4'].map((id, index) => ({
            id,
            name: id,
            macAddress: `02:00:00:10:00:0${index + 1}`,
            vlanMode: 'access' as const,
            accessVlan: 10,
          })),
        },
      },
    ],
    edges: ['h1', 'h2', 'h3', 'h4'].map((id, index) => ({
      id: `e-${id}`,
      source: id,
      target: 'sw',
      targetHandle: `p${index + 1}`,
    })),
    areas: [],
  } as unknown as NetworkTopology,
  /** The host on port 3, the only member of the joined group. */
  member: 'h3',
  others: ['h2', 'h4'] as const,
  joined: '239.1.1.1',
  unjoined: '239.2.2.2',
  /** A packet of a stream from port 1 to `group`, followed toward host `to`. */
  packet: (to: string, group: string) =>
    packetOf(
      'h1',
      to,
      '10.0.10.1',
      group,
      ipToMulticastMac(group),
      {
        srcPort: 5000,
        dstPort: 7000,
        checksum: 0,
      },
      17,
    ),
};

const tcp = (
  from: string,
  to: string,
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
  syn: boolean,
) =>
  packetOf(
    from,
    to,
    srcIp,
    dstIp,
    '00:00:00:00:00:00',
    {
      srcPort,
      dstPort,
      seq: 0,
      ack: 0,
      flags: { syn, ack: !syn, fin: false, rst: false, psh: false, urg: false },
    },
    6,
  );

/** An office PC, a router with lists on its internet side, a web server; the flag as given. */
export const STATEFUL_SCENARIO = {
  topology: (stateful: boolean) =>
    ({
      nodes: [
        node('pc', '10.0.1.10'),
        {
          id: 'r1',
          type: 'router',
          position: { x: 0, y: 0 },
          data: {
            label: 'r1',
            role: 'router',
            layerId: 'l3' as const,
            statefulFirewall: stateful,
            interfaces: [
              {
                id: 'lan',
                name: 'lan',
                ipAddress: '10.0.1.1',
                prefixLength: 24,
                macAddress: '02:00:00:00:01:01',
              },
              {
                id: 'out',
                name: 'out',
                ipAddress: '203.0.113.1',
                prefixLength: 24,
                macAddress: '02:00:00:00:01:02',
                inboundAcl: [{ id: 'deny-all', priority: 10, action: 'deny', protocol: 'any' }],
                outboundAcl: [
                  {
                    id: 'office-out',
                    priority: 10,
                    action: 'permit',
                    protocol: 'tcp',
                    srcIp: '10.0.1.0/24',
                  },
                ],
              },
            ],
          },
        },
        node('srv', '203.0.113.10', 'server'),
      ],
      edges: [
        { id: 'e-pc', source: 'pc', target: 'r1', targetHandle: 'lan' },
        { id: 'e-srv', source: 'r1', target: 'srv', sourceHandle: 'out' },
      ],
      areas: [],
    }) as unknown as NetworkTopology,
  outbound: tcp('pc', 'srv', '10.0.1.10', '203.0.113.10', 50000, 443, true),
  reply: tcp('srv', 'pc', '203.0.113.10', '10.0.1.10', 443, 50000, false),
  unsolicited: tcp('srv', 'pc', '203.0.113.10', '10.0.1.10', 40000, 22, true),
};
