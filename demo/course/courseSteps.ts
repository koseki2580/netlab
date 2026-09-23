import type { NetworkTopology } from '../../src/types/topology';

export type CourseLocale = 'en' | 'ja';

/** What the step's one packet is meant to do. Both are lessons. */
export type CourseOutcome = 'deliver' | 'drop';

export interface CourseCopy {
  /** Short name, shown in the step list. */
  readonly title: string;
  /** What this step is about, in one sentence. */
  readonly goal: string;
  /** The single thing to do, phrased as an instruction. */
  readonly task: string;
  /** What just happened and why, shown after the packet has run. */
  readonly takeaway: string;
}

export interface CourseStep {
  readonly id: string;
  readonly topology: NetworkTopology;
  readonly from: string;
  readonly to: string;
  readonly expect: CourseOutcome;
  readonly copy: Record<CourseLocale, CourseCopy>;
}

function host(
  id: string,
  label: string,
  ip: string,
  mac: string,
  x: number,
  y: number,
  role: 'client' | 'server' = 'client',
) {
  return {
    id,
    type: role,
    position: { x, y },
    data: { label, role, layerId: 'l7' as const, ip, mac },
  };
}

function switchNode(id: string, label: string, x: number, y: number, portCount: number) {
  return {
    id,
    type: 'switch',
    position: { x, y },
    data: {
      label,
      role: 'switch' as const,
      layerId: 'l2' as const,
      ports: Array.from({ length: portCount }, (_, index) => ({
        id: `p${index}`,
        name: `fa0/${index}`,
        macAddress: `00:00:00:0${index}:00:0${index}`,
      })),
    },
  };
}

function topology(nodes: NetworkTopology['nodes'], edges: NetworkTopology['edges']) {
  return { nodes, edges, areas: [], routeTables: new Map() } satisfies NetworkTopology;
}

const ROUTER = {
  id: 'router',
  type: 'router',
  position: { x: 430, y: 200 },
  data: {
    label: 'Router',
    role: 'router' as const,
    layerId: 'l3' as const,
    interfaces: [
      {
        id: 'eth0',
        name: 'eth0',
        ipAddress: '10.0.0.1',
        prefixLength: 24,
        macAddress: '00:00:00:09:00:00',
      },
      {
        id: 'eth1',
        name: 'eth1',
        ipAddress: '192.168.1.1',
        prefixLength: 24,
        macAddress: '00:00:00:09:00:01',
      },
    ],
    staticRoutes: [
      { destination: '10.0.0.0/24', nextHop: 'direct' },
      { destination: '192.168.1.0/24', nextHop: 'direct' },
    ],
  },
};

/**
 * Six steps, each one network you can read at a glance and one thing to press.
 *
 * The order is the argument: two machines on a wire, then the box that joins
 * more of them, then why that box is not enough, then the box that is. Step 4
 * is meant to fail, and says so first — a beginner who sees an unexplained
 * error decides the tool is broken rather than that the network is.
 */
export const COURSE_STEPS: readonly CourseStep[] = [
  {
    id: 'two-machines',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 170, 200),
        host('pc-b', 'PC-B', '10.0.0.12', 'aa:00:00:00:00:02', 620, 200),
      ],
      [{ id: 'e1', source: 'pc-a', target: 'pc-b', type: 'smoothstep' }],
    ),
    from: 'pc-a',
    to: 'pc-b',
    expect: 'deliver',
    copy: {
      en: {
        title: 'Two machines on a wire',
        goal: 'The smallest network there is: two machines joined by one cable.',
        task: 'Send a packet from PC-A to PC-B.',
        takeaway:
          'It arrived.\n\n10.0.0.11 and 10.0.0.12 are IP addresses: each is one machine’s address, and a packet is sent to an address the way a letter is.\n\n/24 (mask 255.255.255.0) means: the first three numbers are the network (here 10.0.0), the last number is the machine. Same first three numbers, same network — so one reaches the other directly.',
      },
      ja: {
        title: '2台をつなぐ',
        goal: '一番小さいネットワークです。2台のPCをケーブル1本でつないでいます。',
        task: 'PC-A から PC-B へパケットを送ってみましょう。',
        takeaway:
          '届きました。\n\n10.0.0.11 や 10.0.0.12 が IP アドレスです。機器ごとの住所で、パケットは手紙のように、この住所あてに送られます。\n\n/24（マスク 255.255.255.0）は「最初の 3 つの数（ここでは 10.0.0）がネットワーク、最後の数が機器」という意味です。最初の 3 つが同じなので同じネットワークにいて、間に何もなくても直接やり取りできます。',
      },
    },
  },
  {
    id: 'add-a-switch',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 150, 200),
        switchNode('sw', 'Switch', 420, 200, 2),
        host('pc-b', 'PC-B', '10.0.0.12', 'aa:00:00:00:00:02', 690, 200),
      ],
      [
        { id: 'e1', source: 'pc-a', target: 'sw', type: 'smoothstep' },
        { id: 'e2', source: 'sw', target: 'pc-b', type: 'smoothstep' },
      ],
    ),
    from: 'pc-a',
    to: 'pc-b',
    expect: 'deliver',
    copy: {
      en: {
        title: 'Put a switch in the middle',
        goal: 'Two machines can share a cable. Three cannot, so a switch joins them.',
        task: 'Send the same packet again, now through the switch.',
        takeaway:
          'It still arrives, one hop longer. A switch passes frames along without changing the addresses — as far as PC-A and PC-B are concerned, nothing changed.',
      },
      ja: {
        title: 'スイッチを挟む',
        goal: '2台ならケーブル1本で足りますが、3台以上をつなぐにはスイッチが要ります。',
        task: '同じようにパケットを送ってみましょう。今度はスイッチを通ります。',
        takeaway:
          '1ホップ増えましたが、やはり届きます。スイッチは中身を書き換えずに転送するだけなので、PC-A と PC-B から見れば何も変わりません。',
      },
    },
  },
  {
    id: 'three-machines',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 150, 120),
        switchNode('sw', 'Switch', 420, 200, 3),
        host('pc-b', 'PC-B', '10.0.0.12', 'aa:00:00:00:00:02', 690, 120),
        host('pc-c', 'PC-C', '10.0.0.13', 'aa:00:00:00:00:03', 690, 300),
      ],
      [
        { id: 'e1', source: 'pc-a', target: 'sw', type: 'smoothstep' },
        { id: 'e2', source: 'sw', target: 'pc-b', type: 'smoothstep' },
        { id: 'e3', source: 'sw', target: 'pc-c', type: 'smoothstep' },
      ],
    ),
    from: 'pc-a',
    to: 'pc-b',
    expect: 'deliver',
    copy: {
      en: {
        title: 'A third machine',
        goal: 'Now three machines share one switch, and only one of them is the destination.',
        task: 'Send from PC-A to PC-B, and watch where the packet goes.',
        takeaway:
          'It went to PC-B and not to PC-C. On the cable a packet travels inside a frame, which carries the machines’ MAC addresses. The switch learns which machine is on which port from the sender of each frame it receives, so it sends the frame down one cable rather than shouting down all of them.',
      },
      ja: {
        title: '3台目をつなぐ',
        goal: '3台が1台のスイッチにつながっています。宛先はそのうち1台だけです。',
        task: 'PC-A から PC-B へ送って、どこを通るか見てみましょう。',
        takeaway:
          'PC-B にだけ届き、PC-C には行きませんでした。ケーブルの上では、パケットは機器の MAC アドレスを書いた「フレーム」に入って運ばれます。スイッチは、受け取ったフレームの送り主から「どのポートの先にどの機器がいるか」を覚えていき、全部に配るのではなく 1 本のケーブルにだけ流します。',
      },
    },
  },
  {
    id: 'another-network',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 120, 200),
        switchNode('sw-left', 'Switch-1', 340, 200, 2),
        switchNode('sw-right', 'Switch-2', 620, 200, 2),
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 840, 200, 'server'),
      ],
      [
        { id: 'e1', source: 'pc-a', target: 'sw-left', type: 'smoothstep' },
        // Nothing joins the two switches. That gap is the step.
        { id: 'e2', source: 'sw-right', target: 'pc-d', type: 'smoothstep' },
      ],
    ),
    from: 'pc-a',
    to: 'pc-d',
    expect: 'drop',
    copy: {
      en: {
        title: 'Two networks, not joined',
        goal: 'PC-A is on 10.0.0, PC-D is on 192.168.1, and nothing connects the two switches.',
        task: 'Send a packet to PC-D. It is meant to fail — watch where it stops.',
        takeaway:
          'It got as far as its own switch and stopped. A switch only knows the machines plugged into it; it has no idea another network exists, let alone how to reach it.',
      },
      ja: {
        title: '2つのネットワーク、つながっていない',
        goal: 'PC-A は 10.0.0 のネットワーク、PC-D は 192.168.1 のネットワークにいます。2台のスイッチの間は何もつながっていません。',
        task: 'PC-D へ送ってみましょう。これは失敗する例です。どこで止まるか見てください。',
        takeaway:
          '自分のスイッチまでは行きましたが、そこで止まりました。スイッチは自分につながっている機器しか知らないので、別のネットワークがあることも、そこへの行き方も分かりません。',
      },
    },
  },
  {
    id: 'add-a-router',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 100, 200),
        switchNode('sw-left', 'Switch-1', 300, 200, 2),
        ROUTER,
        switchNode('sw-right', 'Switch-2', 660, 200, 2),
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 860, 200, 'server'),
      ],
      [
        { id: 'e1', source: 'pc-a', target: 'sw-left', type: 'smoothstep' },
        { id: 'e2', source: 'sw-left', target: 'router', type: 'smoothstep' },
        { id: 'e3', source: 'router', target: 'sw-right', type: 'smoothstep' },
        { id: 'e4', source: 'sw-right', target: 'pc-d', type: 'smoothstep' },
      ],
    ),
    from: 'pc-a',
    to: 'pc-d',
    expect: 'deliver',
    copy: {
      en: {
        title: 'A router fills the gap',
        goal: 'The same two networks, with a router between them. It holds an address on each.',
        task: 'Send to PC-D again, now that something joins the two sides.',
        takeaway:
          'It arrived. The router has a foot in both networks — 10.0.0.1 on one side, 192.168.1.1 on the other — so it can take a packet off one and put it onto the other. That is the job a switch cannot do. PC-A sees that 192.168.1.11 is not on its own 10.0.0 network, so it hands the packet to the router’s 10.0.0.1: that exit is its default gateway — the address typed as "default gateway" in a PC’s network settings.',
      },
      ja: {
        title: 'ルータが間を埋める',
        goal: 'さきほどと同じ2つのネットワークの間に、ルータを1台置きました。ルータは両方にアドレスを1つずつ持っています。',
        task: 'もう一度 PC-D へ送ってみましょう。今度は両側をつなぐものがあります。',
        takeaway:
          '届きました。ルータは両方のネットワークに足をかけていて（片側が 10.0.0.1、もう片側が 192.168.1.1）、一方で受け取ったパケットをもう一方へ渡せます。これはスイッチにはできない仕事です。PC-A は、宛先 192.168.1.11 が自分のネットワーク（10.0.0）の外だと分かるので、ルータの 10.0.0.1 に渡します。この「外へ出る出口」がデフォルトゲートウェイで、PC のネットワーク設定の「デフォルト ゲートウェイ」に書くアドレスです。',
      },
    },
  },
  {
    id: 'how-it-decides',
    topology: topology(
      [
        host('pc-a', 'PC-A', '10.0.0.11', 'aa:00:00:00:00:01', 100, 200),
        switchNode('sw-left', 'Switch-1', 300, 200, 2),
        ROUTER,
        switchNode('sw-right', 'Switch-2', 660, 200, 2),
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 860, 200, 'server'),
      ],
      [
        { id: 'e1', source: 'pc-a', target: 'sw-left', type: 'smoothstep' },
        { id: 'e2', source: 'sw-left', target: 'router', type: 'smoothstep' },
        { id: 'e3', source: 'router', target: 'sw-right', type: 'smoothstep' },
        { id: 'e4', source: 'sw-right', target: 'pc-d', type: 'smoothstep' },
      ],
    ),
    from: 'pc-a',
    to: 'pc-d',
    expect: 'deliver',
    copy: {
      en: {
        title: 'How the router decides',
        goal: 'A router does not guess. It reads a table, and the table is on screen.',
        task: 'Send once more, then read the routing table beside the diagram.',
        takeaway:
          'Each row says "for this range of addresses, go this way". The router matched 192.168.1.11 against the 192.168.1.0/24 row — /24 again: every address starting 192.168.1 — and sent the packet out that side. "Directly connected" means the router sits on that network itself. That is the whole idea; everything else is more rows.',
      },
      ja: {
        title: 'ルータはどう決めているか',
        goal: 'ルータは当てずっぽうで送っているわけではありません。経路表を見て決めています。画面に出ています。',
        task: 'もう一度送ってから、図の横にある経路表を読んでみましょう。',
        takeaway:
          '各行は「このアドレスの範囲ならこちらへ」という意味です。ルータは 192.168.1.11 を 192.168.1.0/24 の行（/24 なので「192.168.1 で始まるアドレス全部」）に当てはめて、その側へ送りました。「直結」は、ルータ自身がそのネットワークにつながっているという意味です。仕組みはこれだけで、あとは行が増えていくだけです。',
      },
    },
  },
];

/**
 * The id a finished course step is recorded under in learner progress. The
 * gallery's learning map reads the same ids, so the course counts there.
 */
export function courseProgressId(stepId: string): string {
  return `course:${stepId}`;
}
