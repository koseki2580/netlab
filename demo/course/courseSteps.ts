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
  /**
   * The one idea of the step, in plain words and short enough to be read by a
   * learner who reads nothing else. Shown first and largest once the packet
   * has run.
   */
  readonly headline: string;
  /** What happened and why, after the headline: short sentences, one idea each. */
  readonly points: readonly string[];
  /**
   * What a beginner does not need yet but a later lesson relies on, behind a
   * toggle that starts closed.
   */
  readonly more: readonly string[];
}

/**
 * Something the step's text mentions that the library's device boxes do not
 * draw: a router's two addresses, a host's MAC address. Drawn under the box.
 */
export interface DiagramNote {
  readonly nodeId: string;
  readonly place: 'below' | 'below-left' | 'below-right';
  readonly text: string;
}

export interface CourseStep {
  readonly id: string;
  readonly topology: NetworkTopology;
  readonly from: string;
  readonly to: string;
  readonly expect: CourseOutcome;
  readonly notes?: readonly DiagramNote[];
  readonly copy: Record<CourseLocale, CourseCopy>;
}

/** Every host in the course is a PC, and is drawn as one. */
function host(id: string, label: string, ip: string, mac: string, x: number, y: number) {
  return {
    id,
    type: 'client',
    position: { x, y },
    data: { label, role: 'client', layerId: 'l7' as const, ip, mac },
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

/** The router's address on each side, drawn where that side's cable leaves it. */
const ROUTER_NOTES: readonly DiagramNote[] = [
  { nodeId: 'router', place: 'below-left', text: '← 10.0.0.1' },
  { nodeId: 'router', place: 'below-right', text: '192.168.1.1 →' },
];

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
        task: 'Send a **packet** (one small parcel of data) from PC-A to PC-B. The round mark that moves across the picture is the packet.',
        headline: 'An IP address is a machine’s address.',
        points: [
          'The number under PC-A, 10.0.0.11, and the one under PC-B, 10.0.0.12, are **IP addresses**.',
          'A packet is delivered to an address, the way a letter is.',
          'Both addresses start with the same three numbers, 10.0.0.',
          'That means the two machines are on the **same network**, so one reaches the other directly, with nothing in between.',
        ],
        more: [
          'This split — the first three numbers name the network, the last number names the machine — is written /24. It goes after the address: 10.0.0.11/24. The picture now shows it that way.',
          'The same thing can be written as the mask 255.255.255.0. Later lessons and the final test use both.',
        ],
      },
      ja: {
        title: '2台をつなぐ',
        goal: '一番小さいネットワークです。2台のPCをケーブル1本でつないでいます。',
        task: 'PC-A から PC-B へ、**パケット**（送るデータのひとかたまり）を送ってみましょう。図の中を動く丸い印がパケットです。',
        headline: 'IP アドレスは、機器の住所です。',
        points: [
          'PC-A の下の 10.0.0.11 と、PC-B の下の 10.0.0.12 が **IP アドレス**です。',
          'パケットは手紙のように、この住所あてに届きます。',
          '2つの住所は、最初の3つの数（10.0.0）が同じです。',
          'これは**同じネットワーク**にいるという印です。同じネットワークなら、間に何もなくても直接届きます。',
        ],
        more: [
          '「最初の3つの数がネットワーク、最後の数が機器」という区切りを /24 と書きます。住所の後ろに付けて 10.0.0.11/24 のように書きます。いま、図の住所にも付けました。',
          '同じことを「マスク 255.255.255.0」とも書きます。あとのレッスンと修了テストでは、どちらも出てきます。',
        ],
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
        goal: 'One cable joins only two machines. To join more, a switch goes in the middle. Here it joins the same two machines first.',
        task: 'Send the same packet again, now through the switch.',
        headline: 'Through a switch, it arrives just the same.',
        points: [
          'The packet went PC-A → Switch → PC-B: it was passed along twice.',
          'Each pass from one device to the next is called one **hop**. Last time it took 1 hop; this time, 2.',
          'A switch passes the packet on without changing what is written in it.',
          'So as far as PC-A and PC-B are concerned, nothing changed.',
        ],
        more: [
          '"Without changing" means the sender’s and the destination’s IP addresses, written in the packet, stay exactly as PC-A wrote them.',
          'A switch has several sockets for cables. The next step plugs a third machine into one.',
        ],
      },
      ja: {
        title: 'スイッチを挟む',
        goal: 'ケーブル1本でつなげるのは2台までです。もっと増やせるように、真ん中にスイッチを置きます。まずは同じ2台をつないでみます。',
        task: '同じようにパケットを送ってみましょう。今度はスイッチを通ります。',
        headline: 'スイッチを通っても、同じように届きます。',
        points: [
          'パケットは PC-A → スイッチ → PC-B と、2回渡されました。',
          '機器から次の機器へ1回渡ることを「**ホップ**」と呼びます。さっきは1ホップ、今回は2ホップです。',
          'スイッチは、中身を書き換えずに次へ渡すだけです。',
          'だから PC-A と PC-B から見れば、何も変わりません。',
        ],
        more: [
          '「書き換えない」とは、パケットに書かれた送り主と宛先の IP アドレスが、PC-A が書いたままだという意味です。',
          'スイッチにはケーブルの差し込み口がいくつもあります。次のステップで3台目をつなぎます。',
        ],
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
    // The step is where "MAC address" is first said, so each PC shows its own.
    notes: [
      { nodeId: 'pc-a', place: 'below', text: 'MAC aa:00:00:00:00:01' },
      { nodeId: 'pc-b', place: 'below', text: 'MAC aa:00:00:00:00:02' },
      { nodeId: 'pc-c', place: 'below', text: 'MAC aa:00:00:00:00:03' },
    ],
    copy: {
      en: {
        title: 'A third machine',
        goal: 'Now three machines share one switch, and only one of them is the destination.',
        task: 'Send from PC-A to PC-B, and watch where the packet goes.',
        headline: 'A switch copies what it cannot place out of every port.',
        points: [
          'The packet reached PC-B. The switch also sent a copy to PC-C, which saw the packet was not for it and threw it away.',
          'Besides its IP address, every machine has a second number of its own, its **MAC address**. In the picture it is the line starting "MAC" under each PC.',
          'The three lines leaving the switch end in its three sockets for cables, called **ports**.',
          'This switch has just started and does not yet know which port leads to PC-B, so it sends the packet out of every port except the one it came in on. Once it knows, it sends to that one machine only.',
          'On the cable, a packet travels inside an envelope with the MAC addresses written on it. That envelope is called a **frame**.',
        ],
        more: [
          'The switch learns as it goes: each time a frame comes in, it notes the sender’s MAC address against the port the frame came in on.',
          'Once PC-B sends something, the switch knows its port and sends frames for PC-B down that one cable only.',
          'In a real network PC-A first asks for PC-B’s MAC address, and PC-B’s answer would already have taught the switch. This screen does not draw that question and PC-B only receives, so if you send again the packet is copied to PC-C again. The picture follows the packet to PC-B and does not draw the copy.',
        ],
      },
      ja: {
        title: '3台目をつなぐ',
        goal: '3台が1台のスイッチにつながっています。宛先はそのうち1台だけです。',
        task: 'PC-A から PC-B へ送って、どこを通るか見てみましょう。',
        headline: 'スイッチは、行き先の分からないものを全部の口に写します。',
        points: [
          'パケットは PC-B に届きました。スイッチは PC-C にも写しを送りましたが、PC-C は自分宛てではないと見て捨てました。',
          '機器には IP アドレスのほかに、もう1つ「**MAC アドレス**」という番号が付いています。図では、各 PC の下の「MAC」で始まる行です。',
          'スイッチから出ている3本の線の付け根が、ケーブルの**差し込み口（ポート）**です。',
          'このスイッチは動き始めたばかりで、PC-B の場所をまだ知りません。だから、入ってきた口以外の全部の差し込み口に流します。場所を覚えたら、宛先の1台にだけ流します。',
          'ケーブルの上では、パケットは MAC アドレスを書いた封筒に入って運ばれます。この封筒を「**フレーム**」と呼びます。',
        ],
        more: [
          'スイッチは、フレームを受け取るたびに「送り主の MAC アドレス」と「入ってきた差し込み口」を組にして覚えていきます。',
          'PC-B が何かを送れば、スイッチは PC-B の差し込み口を覚え、それからは PC-B 宛てのフレームをその1本にだけ流します。',
          '本物のネットワークでは、PC-A がまず PC-B の MAC アドレスを尋ね、PC-B の返事でスイッチは覚えます。この画面はその問い合わせを描かず、PC-B は受け取るだけなので、もう一度送っても PC-C に写しが出ます。図は PC-B へ向かうパケットを追い、写しは描きません。',
        ],
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
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 840, 200),
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
        goal: 'PC-A is on the 10.0.0 network, PC-D is on the 192.168.1 network, and nothing connects the two switches.',
        task: 'Send a packet to PC-D. It is meant to fail — watch where it stops.',
        headline: 'Across two networks, switches alone cannot deliver.',
        points: [
          'PC-A’s address starts 10.0.0 and PC-D’s starts 192.168.1. The first three numbers differ, so these are different networks.',
          'PC-A compares the two addresses and sees that the destination is outside its own network.',
          'A packet for outside has to be handed to a device that joins one network to another. There is no such device here.',
          'A switch passes packets along inside one network. Two switches side by side do not join two networks.',
          'The picture draws the packet stopping at Switch-1. A real PC-A, with nobody to hand it to, would not send it at all.',
        ],
        more: [
          'The red note on the picture marks where the packet ended. A packet that cannot be delivered is thrown away; later lessons call this a **drop**.',
          'The cause is not that Switch-1 failed to find PC-D. It is that nothing here leads out of the 10.0.0 network.',
          'This failure is why the next step adds a new kind of device: a way out.',
        ],
      },
      ja: {
        title: '2つのネットワーク、つながっていない',
        goal: 'PC-A は 10.0.0 のネットワーク、PC-D は 192.168.1 のネットワークにいます。2台のスイッチの間は何もつながっていません。',
        task: 'PC-D へ送ってみましょう。これは失敗する例です。どこで止まるか見てください。',
        headline: 'ネットワークが違うと、スイッチだけでは届きません。',
        points: [
          'PC-A の住所は 10.0.0 で、PC-D の住所は 192.168.1 で始まります。最初の3つの数が違うので、別のネットワークです。',
          'PC-A は2つの住所を見比べて、宛先が自分のネットワークの外だと分かります。',
          '外あてのパケットは、ネットワークどうしをつなぐ機器に渡します。ここには、その機器がありません。',
          'スイッチは、同じネットワークの中で渡す機器です。2台並べても、2つのネットワークはつながりません。',
          '図では、スイッチ1 で止まるように描いています。本物の PC-A は、渡す相手がいないので送り出しません。',
        ],
        more: [
          '図の赤い印は、パケットがそこで終わったという印です。届けられないパケットは捨てられます。あとのレッスンでは、これを「**ドロップ**」と呼びます。',
          '原因は、スイッチ1 が PC-D を見つけられなかったことではありません。10.0.0 のネットワークから外へ出る道が、ここにないことです。',
          'この失敗があるので、次のステップで新しい種類の機器を足します。それが「外への出口」になります。',
        ],
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
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 860, 200),
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
    notes: ROUTER_NOTES,
    copy: {
      en: {
        title: 'A router fills the gap',
        goal: 'The same two networks, with a router between them. It has two addresses, one on each side.',
        task: 'Send to PC-D again, now that something joins the two sides.',
        headline: 'A router joins one network to another.',
        points: [
          'PC-A sees that the destination, 192.168.1.11, is outside its own network (10.0.0), so it hands the packet to the router.',
          'That way out is called the **default gateway**. Here it is 10.0.0.1, the address on the router’s left.',
          'The router has an address on each network: 10.0.0.1 on its left, 192.168.1.1 on its right.',
          'So it can take a packet off one network and put it onto the other. A switch cannot do that.',
        ],
        more: [
          'A PC’s network settings have a box named "default gateway". This address (here 10.0.0.1) is what goes in it.',
          'The packet went PC-A → Switch-1 → Router → Switch-2 → PC-D: 4 hops.',
        ],
      },
      ja: {
        title: 'ルータが間を埋める',
        goal: 'さきほどと同じ2つのネットワークの間に、ルータを1台置きました。ルータは左右に1つずつ、アドレスを2つ持っています。',
        task: 'もう一度 PC-D へ送ってみましょう。今度は両側をつなぐものがあります。',
        headline: 'ルータは、ネットワークどうしをつなぎます。',
        points: [
          'PC-A は、宛先 192.168.1.11 が自分のネットワーク（10.0.0）の外だと分かるので、パケットをルータに渡します。',
          'この「外への出口」を「**デフォルトゲートウェイ**」と呼びます。ここでは、ルータの左側の 10.0.0.1 です。',
          'ルータは左に 10.0.0.1、右に 192.168.1.1 と、両方のネットワークに住所を持っています。',
          'だから、片方で受け取ったパケットをもう片方へ渡せます。これはスイッチにはできない仕事です。',
        ],
        more: [
          'PC のネットワーク設定には「デフォルト ゲートウェイ」という欄があります。そこに書くのが、このアドレス（ここでは 10.0.0.1）です。',
          'パケットは PC-A → スイッチ1 → ルータ → スイッチ2 → PC-D と、4ホップで届きました。',
        ],
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
        host('pc-d', 'PC-D', '192.168.1.11', 'aa:00:00:00:00:04', 860, 200),
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
    notes: ROUTER_NOTES,
    copy: {
      en: {
        title: 'How the router decides',
        goal: 'A router does not guess. It reads a table, called its routing table.',
        task: 'Send once more, then read the routing table just below.',
        headline: 'A router looks up its routing table to decide.',
        points: [
          'Each row of the **routing table** is a rule: "for destinations in this range, send it this way".',
          '192.168.1.0/24 is a way of writing a range: every address that starts 192.168.1.',
          'The destination, 192.168.1.11, is in that range. So the router used the row now marked in green, and sent the packet out of its right side.',
          '"Direct" is short for directly connected: the router itself is on that network.',
          'That is the whole idea. More networks only mean more rows.',
        ],
        more: [
          '/24 means the first three numbers name the network. It is the same split as in step 1.',
          'A real routing table has two more columns, now shown in the table above. AF is the kind of address (v4 or v6). AD is the administrative distance. A router can learn the way to the same place from two sources, such as a setting typed in by hand and a neighbouring router. When that happens, the row with the smaller AD is used.',
        ],
      },
      ja: {
        title: 'ルータはどう決めているか',
        goal: 'ルータは当てずっぽうで送っているわけではありません。「経路表」という表を見て決めています。',
        task: 'もう一度送ってから、すぐ下の経路表を読んでみましょう。',
        headline: 'ルータは、経路表を見て送り先を決めます。',
        points: [
          '**経路表**の1行は、「この範囲の宛先なら、こちらへ送る」という決まりです。',
          '192.168.1.0/24 は範囲の書き方で、「192.168.1 で始まるアドレス全部」という意味です。',
          '宛先 192.168.1.11 はこの範囲に入ります。だからルータは緑の印が付いた行を使い、右側へ送りました。',
          '「直結」は、ルータ自身がそのネットワークにつながっているという意味です。',
          '仕組みはこれだけです。ネットワークが増えると、行が増えていきます。',
        ],
        more: [
          '/24 は「最初の3つの数がネットワーク」という区切りです。ステップ1の「もう少し詳しく」と同じものです。',
          '本物の経路表には、あと2つ列があります。上の表にも出しました。AF はアドレスの種類（v4 か v6）です。AD は管理距離です。ルータは、同じ場所への行き方を2つの情報源から知ることがあります（たとえば、人が手で書いた設定と、隣のルータからの知らせ）。そのときは、AD が小さいほうの行が使われます。',
        ],
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
