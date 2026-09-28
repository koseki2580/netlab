import type { ExamLevel } from './examQuestions';

/**
 * Level 4 of the final test: exact results where two or three mechanisms
 * meet. Principles narrow each question down, but only carrying the reasoning
 * through to the number, port or path — or reproducing the scenario in the
 * lesson named — settles it. The wrong answers are what one plausible slip
 * gives: a forgotten header, a tie-break skipped, a cost paid in the wrong
 * direction, a real-world default used in place of the lesson's own
 * configuration. Where the simulator's model decides the answer, the question
 * says "in this lesson's network" and the explanation says how a real network
 * could differ.
 */
export const EXAM_LEVEL_4: ExamLevel = {
  level: 4,
  title: { en: 'Level 4 · Expert', ja: 'レベル 4・エキスパート' },
  summary: {
    en: 'Exact results where several mechanisms meet: reproduce each scenario in its lesson and read the numbers it shows.',
    ja: '複数のしくみが重なった場面の、正確な結果を問います。各レッスンで場面を再現し、表示される数値を読んでください。',
  },
  path: [
    {
      id: 'stp',
      path: '/networking/stp',
      title: { en: 'Spanning Tree', ja: 'スパニングツリー' },
      teaches: {
        en: 'How ties between bridges are settled, for the root and for each link',
        ja: 'ルートの選出と各リンクで、ブリッジどうしの同点がどう決着するか',
      },
    },
    {
      id: 'mtu',
      path: '/networking/mtu-fragmentation',
      title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
      teaches: {
        en: 'How much of a packet each fragment can carry at a given MTU',
        ja: 'ある MTU のとき、1 つの断片がパケットのどれだけを運べるか',
      },
    },
    {
      id: 'dhcpv6',
      path: '/networking/dhcpv6',
      title: { en: 'DHCPv6 And SLAAC', ja: 'DHCPv6 と SLAAC' },
      teaches: {
        en: 'How the M and O flags decide a host’s address and DNS server',
        ja: 'M フラグと O フラグが、端末のアドレスと DNS サーバをどう決めるか',
      },
    },
    {
      id: 'dynamic',
      path: '/routing/dynamic',
      title: { en: 'Dynamic Routing', ja: '動的ルーティング' },
      teaches: {
        en: 'How RIP and OSPF measure the same paths',
        ja: 'RIP と OSPF が同じ経路をどう測るか',
      },
    },
    {
      id: 'ospf-convergence',
      path: '/routing/ospf-convergence',
      title: { en: 'OSPF Convergence', ja: 'OSPF の収束' },
      teaches: {
        en: 'Every router’s table after a link fails, in both directions',
        ja: 'リンクが落ちたあとの各ルータの経路表を、行きと帰りの両方で',
      },
    },
    {
      id: 'nat',
      path: '/simulation/nat',
      title: { en: 'NAT / PAT', ja: 'NAT / PAT' },
      teaches: {
        en: 'How the edge router picks a global port for each conversation',
        ja: '出口のルータが、通信ごとのグローバル側のポートをどう選ぶか',
      },
    },
    {
      id: 'acl',
      path: '/simulation/acl',
      title: { en: 'Firewalls & ACLs', ja: 'ファイアウォールと ACL' },
      teaches: {
        en: 'Which packets from outside connection tracking lets in',
        ja: '外から来るパケットのうち、接続の追跡が通すもの',
      },
    },
    {
      id: 'link-qos',
      path: '/networking/link-qos',
      title: { en: 'Per-Link QoS', ja: 'リンクごとの QoS' },
      teaches: {
        en: 'The time to cross a link, and what class weights do',
        ja: 'リンクを渡るのにかかる時間と、クラスの重みの働き',
      },
    },
    {
      id: 'wireless',
      path: '/networking/wireless',
      title: { en: 'Wireless 802.11', ja: '無線 LAN（802.11）' },
      teaches: {
        en: 'How distance sets the signal strength and the loss',
        ja: '距離が電波の強さと損失率をどう決めるか',
      },
    },
    {
      id: 'tcp-congestion',
      path: '/simulation/tcp-congestion',
      title: { en: 'TCP Congestion Control', ja: 'TCP の輻輳制御' },
      teaches: {
        en: 'The window and the threshold through fast recovery',
        ja: '高速リカバリの間のウィンドウとしきい値',
      },
    },
  ],
  questions: [
    {
      id: 'stp-priority-tie',
      prompt: {
        en: 'In the Spanning Tree lesson’s network, Switch A (priority 4096) is the root and Switch B and Switch C are at 32768. You type 4096 into Switch C’s priority, so it ties with Switch A. What do the lesson’s root line and port tables show?',
        ja: 'スパニングツリーのレッスンのネットワークでは、Switch A（優先度 4096）がルートで、Switch B と Switch C は 32768 です。Switch C の優先度に 4096 を入力し、Switch A と同点にします。レッスンのルートブリッジの行と各ポートの表示はどうなりますか？',
      },
      options: [
        {
          en: 'Switch C becomes the root — on a tie the switch changed most recently wins — and the Switch A – Switch B link is blocked',
          ja: 'Switch C がルートになる（同点なら最後に設定を変えたスイッチが勝つ）。遮断されるのは Switch A – Switch B のリンク',
        },
        {
          en: 'Switch A stays the root and nothing else moves: Switch C’s port toward Switch B is still BLOCKED',
          ja: 'Switch A がルートのままで、ほかも変わらない。Switch C の Switch B 向きのポートが BLOCKED のまま',
        },
        {
          en: 'Switch A stays the root, but the blocked end moves: Switch B’s port toward Switch C shows BLOCKED and Switch C’s shows DESIGNATED',
          ja: 'Switch A がルートのままだが、遮断される端が変わる。Switch B の Switch C 向きのポートが BLOCKED に、Switch C 側が DESIGNATED になる',
        },
        {
          en: 'Both switches claim the root, so the link between them, Switch A – Switch C, is blocked',
          ja: '両方がルートを名乗るので、その 2 台の間の Switch A – Switch C のリンクが遮断される',
        },
      ],
      answer: 2,
      explanation: {
        en: 'A tie on priority is broken by MAC address: the root line reads 4096/02:00:00:0a:00:01, Switch A’s lowest port MAC, which is lower than Switch C’s 02:00:00:0c:…, so A stays root. On the B–C link both ends are one link (cost 19) from the root, so the designated port goes to the lower bridge ID — now Switch C’s 4096 beats Switch B’s 32768 — and Switch B’s end blocks; B → C still runs Switch B → Switch A → Switch C. On real switches the bridge MAC is the switch’s base address and the priority must be a multiple of 4096 (plus the VLAN number when the extended system ID is on), so which switch wins such a tie depends on the hardware.',
        ja: '優先度が同点のときは MAC アドレスで決まります。ルートブリッジの行は 4096/02:00:00:0a:00:01 で、これは Switch A のポートの最も小さい MAC です。Switch C の 02:00:00:0c:… より小さいので、A がルートのままです。B–C 間のリンクでは、両端ともルートまで 1 リンク（コスト 19）で同じなので、指定ポートはブリッジ ID の小さい側が取ります。今は Switch C の 4096 が Switch B の 32768 より小さいので、Switch B 側が遮断されます。B → C の通信は引き続き Switch B → Switch A → Switch C を通ります。実機では、ブリッジの MAC はスイッチ本体のアドレスで、優先度は 4096 の倍数（拡張システム ID が有効なら VLAN 番号を足した値）に限られるので、このような同点でどちらが勝つかは機器によって決まります。',
      },
      taughtBy: 'stp',
    },
    {
      id: 'mtu-fragment-thresholds',
      prompt: {
        en: 'In the MTU lesson the ping carries 1200 bytes of ICMP data with DF clear, and the tunnel-MTU slider moves in 8-byte steps (…, 604, 612, 620, 628, … 1220, 1228, 1236, 1244 …). At the default 604 the trace notes show 3 fragments. Raising the MTU, at which slider values does the count first drop to 2 fragments, and then to no fragmentation at all?',
        ja: 'MTU のレッスンの ping は、DF なしで ICMP のデータ部を 1200 バイト運びます。トンネル MTU のスライダーは 8 バイト刻みです（…、604、612、620、628、… 1220、1228、1236、1244 …）。既定の 604 のとき、トレースのメモは断片 3 個です。MTU を上げていくと、断片が初めて 2 個になるのは、そして初めて分割されなくなるのは、スライダーがいくつのときですか？',
      },
      options: [
        {
          en: '2 fragments from 620; no fragmentation from 1220',
          ja: '620 から断片 2 個、1220 から分割なし',
        },
        {
          en: '2 fragments from 628; no fragmentation from 1228',
          ja: '628 から断片 2 個、1228 から分割なし',
        },
        {
          en: '2 fragments from 604; no fragmentation from 1228',
          ja: '604 から断片 2 個、1228 から分割なし',
        },
        {
          en: '2 fragments from 644; no fragmentation from 1244',
          ja: '644 から断片 2 個、1244 から分割なし',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The IP payload is 1208 bytes (1200 of data plus the 8-byte ICMP header) and the whole packet 1228, so it passes whole only from MTU 1228. Split, every fragment repeats the 20-byte IP header and all but the last carry a multiple of 8 bytes, so two fragments need 608 bytes of payload each (604 rounded up to 8) — MTU 628. The lesson’s notes read 断片 3 個 at 620, 断片 2 個 at 628 and still at 1220, and 断片の数: 0 at 1228. Forgetting the ICMP header gives 620/1220, forgetting the per-fragment IP header gives 604, and counting a 14-byte Ethernet header inside the MTU gives 644/1244. Real IPv4 splits the same way; a real tunnel also spends some of the link’s MTU on its own outer header.',
        ja: 'IP のペイロードは 1208 バイト（データ 1200 と ICMP ヘッダ 8 バイト）、パケット全体は 1228 バイトなので、分割せずに通るのは MTU 1228 からです。分割すると、どの断片にも 20 バイトの IP ヘッダが付き、最後以外の断片が運ぶ量は 8 の倍数に限られます。2 個に収めるには 1 個あたり 604 を 8 の倍数に切り上げた 608 バイトが必要で、MTU は 628 です。レッスンのメモは 620 で「断片 3 個」、628 と 1220 で「断片 2 個」、1228 で「断片の数: 0」です。ICMP ヘッダを忘れると 620/1220、断片ごとの IP ヘッダを忘れると 604、14 バイトの Ethernet ヘッダを MTU に数えると 644/1244 になります。実際の IPv4 も同じ計算で分割します。実際のトンネルでは、さらに外側のヘッダの分だけリンクの MTU が使われます。',
      },
      taughtBy: 'mtu',
    },
    {
      id: 'slaac-eui64-dns',
      prompt: {
        en: 'In the DHCPv6 and SLAAC lesson the host’s MAC is 02:00:00:00:00:0a and the router advertises 2001:db8:30::/64. The host starts in M=1 mode with 2001:db8:30::102 and DNS 2001:db8::53. You press “M=0 O=1 SLAAC + DNS”, then “M=0 O=0 Pure SLAAC”. In this lesson’s network, what address and DNS server does the host end with?',
        ja: 'DHCPv6 と SLAAC のレッスンでは、端末の MAC は 02:00:00:00:00:0a で、ルータは 2001:db8:30::/64 を広告しています。端末は M=1 のモードで 2001:db8:30::102 と DNS 2001:db8::53 を持って始まります。「M=0 O=1 SLAAC + DNS」を押し、続いて「M=0 O=0 SLAAC のみ」を押します。このレッスンのネットワークでは、端末に最後に残るアドレスと DNS サーバは何ですか？',
      },
      options: [
        {
          en: '2001:db8:30::200:ff:fe00:a, and no DNS server',
          ja: '2001:db8:30::200:ff:fe00:a で、DNS サーバはなし',
        },
        {
          en: '2001:db8:30::ff:fe00:a, still with DNS 2001:db8::53, because the router keeps announcing it',
          ja: '2001:db8:30::ff:fe00:a で、DNS は 2001:db8::53 のまま。ルータが広告し続けるから',
        },
        {
          en: '2001:db8:30::102, kept from DHCPv6, and no DNS server',
          ja: 'DHCPv6 でもらった 2001:db8:30::102 のままで、DNS サーバはなし',
        },
        {
          en: '2001:db8:30::ff:fe00:a, and no DNS server',
          ja: '2001:db8:30::ff:fe00:a で、DNS サーバはなし',
        },
      ],
      answer: 3,
      explanation: {
        en: 'With M=0 the host makes its own address. EUI-64 puts ff:fe into the middle of the MAC and flips the universal/local bit of the first byte, so 02 becomes 00 and the interface ID is 0000:00ff:fe00:000a — 2001:db8:30::ff:fe00:a (not flipping the bit gives ::200:ff:fe00:a). O=1 only means “ask DHCPv6 for other settings such as DNS”; with O=0 that stops, and the lesson shows DNS: なし. Real hosts differ in two ways: most now use random or stable-private interface IDs (RFC 7217, RFC 8981) instead of EUI-64, and a router can put DNS servers in the advertisement itself (RDNSS, RFC 8106), which this lesson’s router does not do.',
        ja: 'M=0 のとき、端末はアドレスを自分で作ります。EUI-64 は MAC の真ん中に ff:fe を入れ、先頭のバイトのユニバーサル／ローカルのビットを反転するので、02 が 00 になり、インタフェース ID は 0000:00ff:fe00:000a、アドレスは 2001:db8:30::ff:fe00:a です（ビットを反転し忘れると ::200:ff:fe00:a になります）。O=1 が意味するのは「DNS などのほかの設定を DHCPv6 に尋ねる」ことだけで、O=0 にするとそれもなくなり、レッスンの表示は「DNS: なし」です。実際の端末は 2 つの点で違います。今の多くの OS は EUI-64 ではなく、ランダムまたは安定した非公開のインタフェース ID（RFC 7217、RFC 8981）を使います。また、ルータが広告そのものに DNS サーバを入れることもでき（RDNSS、RFC 8106）、このレッスンのルータはそれをしていません。',
      },
      taughtBy: 'dhcpv6',
    },
    {
      id: 'rip-ospf-neighbour-link',
      prompt: {
        en: 'In the Dynamic Routing lesson, R1 connects to R2 and R3, and the link between R3 and R4 is 10.0.34.0/30. Under OSPF, R1’s interface toward R3 has cost 3 and every other interface cost 1. What does R1’s table show for 10.0.34.0/30 with RIP selected, and with OSPF selected?',
        ja: '動的ルーティングのレッスンでは、R1 は R2 と R3 につながり、R3 と R4 の間のリンクは 10.0.34.0/30 です。OSPF では、R1 の R3 向きのインタフェースのコストが 3、ほかのインタフェースはすべて 1 です。RIP を選んだとき、そして OSPF を選んだとき、R1 の経路表の 10.0.34.0/30 はどう表示されますか？',
      },
      options: [
        {
          en: 'RIP: next hop 10.0.13.2 (R3), metric 1. OSPF: next hop 10.0.12.2 (R2), metric 3',
          ja: 'RIP は次ホップ 10.0.13.2（R3）、メトリック 1。OSPF は次ホップ 10.0.12.2（R2）、メトリック 3',
        },
        {
          en: 'RIP: next hop 10.0.13.2, metric 1. OSPF: next hop 10.0.12.2, metric 2 — the cost of reaching R4, which owns that link',
          ja: 'RIP は次ホップ 10.0.13.2、メトリック 1。OSPF は次ホップ 10.0.12.2、メトリック 2。そのリンクを持つ R4 までのコストだから',
        },
        {
          en: 'RIP: next hop 10.0.13.2, metric 1. OSPF: next hop 10.0.13.2, metric 3 — the link is on R3, so R1 reaches it through R3',
          ja: 'RIP は次ホップ 10.0.13.2、メトリック 1。OSPF は次ホップ 10.0.13.2、メトリック 3。そのリンクは R3 につながっているので、R1 は R3 経由で届ける',
        },
        {
          en: 'Both: next hop 10.0.12.2 (R2), metric 2 — R1 sends everything beyond its neighbours through R2',
          ja: 'どちらも次ホップ 10.0.12.2（R2）、メトリック 2。R1 は隣より先へ行くものをすべて R2 経由で送るから',
        },
      ],
      answer: 0,
      explanation: {
        en: 'RIP counts routers: the link is one hop away, through R3. OSPF adds the cost of every interface on the way, including the interface of the router that owns the destination network (RFC 2328, section 16.1). Through R3 that is R1→R3 (3) + R3’s interface on the link (1) = 4; through R2 it is R1→R2 (1) + R2→R4 (1) + R4’s interface on the link (1) = 3. So under OSPF R1 reaches a link on its own neighbour R3 by going round the other side, and the table reads 10.0.12.2, metric 3. Stopping at R4 and leaving out its interface gives 2, which is the cost to the router, not to the network.',
        ja: 'RIP は通るルータの数を数えます。このリンクは R3 経由で 1 ホップ先です。OSPF は途中のインタフェースのコストを足し、宛先のネットワークを持つルータのそのネットワーク上のインタフェースのコストも足します（RFC 2328 の 16.1 節）。R3 経由では R1→R3（3）＋ そのリンク上の R3 のインタフェース（1）＝ 4、R2 経由では R1→R2（1）＋ R2→R4（1）＋ そのリンク上の R4 のインタフェース（1）＝ 3 です。つまり OSPF では、R1 は隣の R3 につながったリンクへ、反対側を回って届けます。経路表は 10.0.12.2、メトリック 3 です。R4 で止めてそのインタフェースを足し忘れると 2 になりますが、それはルータまでのコストで、ネットワークまでのコストではありません。',
      },
      taughtBy: 'dynamic',
    },
    {
      id: 'ospf-reconverged-metrics',
      prompt: {
        en: 'In the OSPF Convergence lesson, R1’s interface toward R3 has cost 3 and every other interface cost 1. You fail the primary link between R2 and R4. In this lesson’s network, what do R2’s table (for C2’s LAN, 10.4.0.0/24) and R4’s table (for C1’s LAN, 10.1.0.0/24) show?',
        ja: 'OSPF の収束のレッスンでは、R1 の R3 向きのインタフェースのコストが 3、ほかのインタフェースはすべて 1 です。R2 と R4 の間の主経路のリンクを落とします。このレッスンのネットワークでは、R2 の経路表（C2 の LAN、10.4.0.0/24）と R4 の経路表（C1 の LAN、10.1.0.0/24）はどう表示されますか？',
      },
      options: [
        {
          en: 'R2: via 10.0.12.1 (R1), metric 5. R4: via 10.0.34.1 (R3), metric 2',
          ja: 'R2 は 10.0.12.1（R1）経由でメトリック 5。R4 は 10.0.34.1（R3）経由でメトリック 2',
        },
        {
          en: 'R2: via 10.0.12.1, metric 6. R4: via 10.0.34.1, metric 6 — both cross the same three links',
          ja: 'R2 は 10.0.12.1 経由でメトリック 6。R4 は 10.0.34.1 経由でメトリック 6。どちらも同じ 3 本のリンクを通るから',
        },
        {
          en: 'R2: via 10.0.12.1, metric 6. R4: via 10.0.34.1, metric 3',
          ja: 'R2 は 10.0.12.1 経由でメトリック 6。R4 は 10.0.34.1 経由でメトリック 3',
        },
        {
          en: 'R2: via 10.0.12.1, metric 4. R4: via 10.0.34.1, metric 3 — every interface has the default cost 1',
          ja: 'R2 は 10.0.12.1 経由でメトリック 4。R4 は 10.0.34.1 経由でメトリック 3。どのインタフェースもデフォルトのコスト 1 だから',
        },
      ],
      answer: 2,
      explanation: {
        en: 'With R2–R4 gone, R2’s only way to C2 is back through R1 and on through R3: 1 (R2→R1) + 3 (R1→R3) + 1 (R3→R4) + 1 (R4’s interface on C2’s LAN) = 6. R4’s way to C1 uses the same links backwards, leaving by R4→R3 (1) and R3→R1 (1), then R1’s interface on C1’s LAN (1): the 3 belongs to R1’s interface toward R3 and is never paid in that direction, so 3. The lesson’s R2 tab reads 10.4.0.0/24 10.0.12.1 6 and its R4 tab 10.1.0.0/24 10.0.34.1 3. Leaving out the destination LAN’s interface gives 5 and 2 — the cost to the router that owns the LAN, not to the LAN itself.',
        ja: 'R2–R4 のリンクがなくなると、R2 から C2 へは R1 まで戻って R3 を通るしかありません。1（R2→R1）＋ 3（R1→R3）＋ 1（R3→R4）＋ 1（C2 の LAN 上の R4 のインタフェース）＝ 6 です。R4 から C1 へは同じリンクを逆向きにたどり、R4→R3（1）と R3→R1（1）から出て、最後に C1 の LAN 上の R1 のインタフェース（1）を足します。3 は R1 の R3 向きのインタフェースのコストなので、この向きでは一度も払わず、3 です。レッスンの R2 のタブは 10.4.0.0/24・10.0.12.1・6、R4 のタブは 10.1.0.0/24・10.0.34.1・3 です。宛先 LAN のインタフェースを足し忘れると 5 と 2 になりますが、それは LAN を持つルータまでのコストで、LAN そのものまでのコストではありません。',
      },
      taughtBy: 'ospf-convergence',
    },
    {
      id: 'nat-port-order',
      prompt: {
        en: 'In the NAT / PAT lesson, starting from an empty table, you press in order: “Client B -> Internet (SNAT)”, “Internet -> Client A (DNAT 8080)”, “Client A -> Internet (SNAT)”, “Client A -> Internet (SNAT)” again, and “Client B -> Internet (SNAT)” again. In this lesson’s network, what global address and port does the NAT table give Client A (192.168.1.10:54321)?',
        ja: 'NAT / PAT のレッスンで、空の変換表から次の順にボタンを押します。「Client B -> インターネット (SNAT)」、「インターネット -> Client A (DNAT 8080)」、「Client A -> インターネット (SNAT)」、もう一度「Client A -> インターネット (SNAT)」、もう一度「Client B -> インターネット (SNAT)」。このレッスンのネットワークでは、変換表で Client A（192.168.1.10:54321）に割り当てられるグローバル側のアドレスとポートは何ですか？',
      },
      options: [
        {
          en: '203.0.113.1:54321 — the router keeps the client’s own port while nobody else uses it; the table has three rows',
          ja: '203.0.113.1:54321。ほかが使っていなければ、ルータはクライアントのポートをそのまま使う。表は 3 行',
        },
        {
          en: '203.0.113.1:1025 — one row per conversation; the table has three rows',
          ja: '203.0.113.1:1025。通信ごとに 1 行で、表は 3 行',
        },
        {
          en: '203.0.113.1:1026 — the port-forward row took 1025; the table has three rows',
          ja: '203.0.113.1:1026。ポートフォワードの行が 1025 を使ったから。表は 3 行',
        },
        {
          en: '203.0.113.1:1025 for the first press and 1026 for the second; the table has five rows',
          ja: '1 回目は 203.0.113.1:1025、2 回目は 1026。表は 5 行',
        },
      ],
      answer: 1,
      explanation: {
        en: 'This router hands out global ports in order from 1024 and keys each row on the whole conversation — inside address and port, outside address and port. Client B’s first send takes 1024; the DNAT row uses the fixed port-forward port 8080 and takes nothing from the counter; Client A then gets 1025, and the second presses from Client A and Client B match their existing rows. The table ends with three rows: 54322 ↔ 1024, 80 ↔ 8080 (DNAT) and 54321 ↔ 1025. Real NAT differs here: Linux and many home routers keep the client’s source port when it is free (port preservation), so there Client A would probably appear as :54321.',
        ja: 'このルータは、グローバル側のポートを 1024 から順に割り当て、各行を通信全体（内側のアドレスとポート、外側のアドレスとポート）で見分けます。Client B の 1 回目が 1024 を取ります。DNAT の行はポートフォワードで決まった 8080 を使い、順番の番号は消費しません。そのあと Client A が 1025 を取り、Client A と Client B の 2 回目はそれぞれ既存の行に一致します。表は最後に 54322 ↔ 1024、80 ↔ 8080（DNAT）、54321 ↔ 1025 の 3 行です。実際の NAT はここが違います。Linux や多くの家庭用ルータは、空いていればクライアントの送信元ポートをそのまま使う（ポート保存）ので、Client A はたいてい :54321 のまま見えます。',
      },
      taughtBy: 'nat',
    },
    {
      id: 'acl-return-count',
      prompt: {
        en: 'In the Firewalls & ACLs lesson, R-FW’s LAN side (eth0) permits inbound TCP to ports 80 and 443, and its Internet side (eth1) has no rules. You press, in order: “Return Traffic”, “SSH (blocked)”, “Return Traffic”, “HTTP (permitted)”, “Return Traffic”, “SSH (blocked)”, “Return Traffic”. Every Return Traffic packet is Server port 80 → Client port 40000; HTTP is Client port 40000 → Server port 80. In this lesson’s network, how many of the four return packets reach the Client?',
        ja: 'ファイアウォールと ACL のレッスンでは、R-FW の LAN 側（eth0）は入ってくるポート 80 と 443 あての TCP を許可し、インターネット側（eth1）にはルールがありません。次の順に押します。「戻りの通信」、「SSH (拒否)」、「戻りの通信」、「HTTP (許可)」、「戻りの通信」、「SSH (拒否)」、「戻りの通信」。戻りの通信はどれも Server のポート 80 → Client のポート 40000、HTTP は Client のポート 40000 → Server のポート 80 です。このレッスンのネットワークでは、4 回の戻りの通信のうち、Client に届くのはいくつですか？',
      },
      options: [
        {
          en: 'All four: eth1 has no rules, and an ACL with no rules filters nothing',
          ja: '4 回とも。eth1 にはルールがなく、ルールのない ACL は何も止めないから',
        },
        {
          en: 'Three: once the Client has tried to open any connection outward, replies from the Server are let in',
          ja: '3 回。Client が外へ何かの接続を始めようとしたあとは、Server からの返事が通されるから',
        },
        {
          en: 'One, the one right after HTTP: connection tracking lets one reply in per request sent',
          ja: '1 回。HTTP の直後の 1 回だけ。接続の追跡は、送った要求 1 つにつき返事を 1 つだけ通すから',
        },
        {
          en: 'Two, the last two: only HTTP opened a tracked connection that port 80 → port 40000 belongs to, and it stays open',
          ja: '2 回。最後の 2 回。ポート 80 → ポート 40000 が属する追跡中の接続を作ったのは HTTP だけで、その接続は開いたままだから',
        },
      ],
      answer: 3,
      explanation: {
        en: 'R-FW denies what no rule permits unless it belongs to a connection started from inside. The SSH attempts (41000 → 22) are themselves dropped at eth0 by the default policy, so they open nothing — and a reply from port 80 to port 40000 would not belong to them anyway. The HTTP packet is permitted and recorded, and from then on every return packet of that connection is let in: the first two returns’ hop details read INBOUND eth1, (既定のポリシー), DENY; the last two read conn-track, PERMIT. On a plain Cisco IOS router an applied ACL with no entries permits everything; real stateful firewalls also expire idle entries and check that a reply fits the TCP exchange so far.',
        ja: 'R-FW は、内側から始めた接続に属するもの以外、どのルールにも許可されないものを拒否します。SSH の試み（41000 → 22）は eth0 で既定のポリシーによって破棄されるので、何も開きません。そもそもポート 80 からポート 40000 への返事は SSH の接続には属しません。HTTP は許可されて記録され、それ以降、その接続の戻りのパケットはすべて通されます。最初の 2 回の戻りのホップの詳細は INBOUND・eth1・（既定のポリシー）・DENY、最後の 2 回は「状態を追跡した戻りの通信 (conn-track)」・PERMIT です。普通の Cisco IOS ルータでは、エントリが 1 つもない ACL を適用するとすべて許可されます。実際の状態追跡型のファイアウォールは、使われなくなった記録を時間で消し、返事がそれまでの TCP のやり取りに合っているかも確かめます。',
      },
      taughtBy: 'acl',
    },
    {
      id: 'qos-lone-packet-weight',
      prompt: {
        en: 'In the Per-Link QoS lesson you set the R2 → R3 link to 80000 bps, 30 ms of delay and 0% loss, and apply it. The QoS burst is one 1500-byte IP packet with DSCP 0, so it goes to the default class, be. You then give the classes weights ef 95 and be 5, apply them, and send the burst. What does the lesson report?',
        ja: 'リンクごとの QoS のレッスンで、R2 → R3 のリンクを帯域 80000 bps・伝搬遅延 30 ms・損失率 0% にして適用します。「QoS を試すパケットを送る」は DSCP 0 の 1500 バイトの IP パケット 1 つなので、既定のクラス be に入ります。続いてクラスの重みを ef 95・be 5 にして適用し、パケットを送ります。レッスンの表示はどうなりますか？',
      },
      options: [
        {
          en: '180 ms: 150 ms to clock 1500 bytes out at 80 kbit/s plus 30 ms of delay — with nothing else queued, be may use the whole link',
          ja: '180 ms。1500 バイトを 80 kbit/s で送り出すのに 150 ms、それに遅延 30 ms。ほかに待っているものがなければ、be もリンク全体を使える',
        },
        {
          en: '3030 ms: be may use only 5% of the link, 4000 bit/s',
          ja: '3030 ms。be が使えるのはリンクの 5%、4000 bit/s だけだから',
        },
        {
          en: '177.2 ms: only the 1472-byte payload is clocked onto the link',
          ja: '177.2 ms。リンクに送り出されるのは 1472 バイトのペイロードだけだから',
        },
        {
          en: '30 ms: a single packet waits only for the delay, not for the bandwidth',
          ja: '30 ms。パケット 1 つなら、待つのは遅延の分だけで、帯域の分は待たないから',
        },
      ],
      answer: 0,
      explanation: {
        en: 'Serialisation takes 1500 × 8 ÷ 80 000 = 150 ms and propagation adds 30 ms; the lesson reads 届きました — リンクの通過に 180 ms かかりました both before and after the classes are applied, and the timeline shows the packet classified into be. The weights are the shares a deficit-round-robin scheduler gives classes that are competing; a packet alone in its queue is sent at the full rate. A real shaper or policer that limits a class to a rate (a token bucket) would slow it even on an idle link — these classes are not that. This lesson also counts the IP packet only; real Ethernet adds its own header, preamble and gap.',
        ja: '送り出し（シリアライズ）に 1500 × 8 ÷ 80 000 ＝ 150 ms、伝搬に 30 ms かかります。レッスンの表示はクラスの適用の前もあとも「届きました — リンクの通過に 180 ms かかりました。」で、タイムラインではパケットが be に分類されています。重みは、競合しているクラスどうしに deficit round robin のスケジューラが配る割合です。キューにパケットが 1 つしかなければ、全速で送られます。クラスの速度そのものを制限する実際のシェーパーやポリサー（トークンバケット）なら、空いているリンクでも遅くなりますが、このクラスはそれとは違います。また、このレッスンは IP パケットの大きさだけを数えます。実際の Ethernet では、ヘッダ・プリアンブル・フレーム間の隙間が加わります。',
      },
      taughtBy: 'link-qos',
    },
    {
      id: 'wifi-distance-loss',
      prompt: {
        en: 'In the Wireless 802.11 lesson, the station at 20 m shows RSSI −46.2 dBm and 0% loss. You slide it out to 200 m. In this lesson’s network, what do the RSSI and loss read?',
        ja: '無線 LAN（802.11）のレッスンでは、20 m の位置の端末は RSSI −46.2 dBm、損失率 0% です。スライダーで 200 m まで離します。このレッスンのネットワークでは、RSSI と損失率はどう表示されますか？',
      },
      options: [
        {
          en: '−76.2 dBm and 45%: about 30 dB weaker, as indoor signal falls with the cube of distance',
          ja: '−76.2 dBm で 45%。屋内の電波は距離の 3 乗で弱まるので、約 30 dB 下がる',
        },
        {
          en: '−66.2 dBm and 5%',
          ja: '−66.2 dBm で 5%',
        },
        {
          en: '−66.2 dBm and 0%: still a usable signal, so nothing is lost yet',
          ja: '−66.2 dBm で 0%。まだ十分使える強さなので、損失は出ない',
        },
        {
          en: '−56.2 dBm and 0%: ten times the distance costs 10 dB',
          ja: '−56.2 dBm で 0%。距離が 10 倍になると 10 dB 下がる',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The lesson uses free-space path loss, which grows by 20 dB for every tenfold distance: −46.2 − 20 = −66.2 dBm. Its loss is 0% down to −65 dBm and rises in a straight line to 100% at −90 dBm, so 1.2 dB past the start gives 1.2 ÷ 25 ≈ 5%. On the way, 160 m still reads −64.3 dBm and 0%, and 300 m reads −69.7 dBm and 19%. Indoors, walls and people make the signal fall faster (a path-loss exponent of about 3 to 4), and real loss depends on the noise and on the data rate the radio chooses, not on RSSI alone.',
        ja: 'このレッスンは自由空間の伝搬損失を使っており、距離が 10 倍になるごとに 20 dB 増えます。−46.2 − 20 ＝ −66.2 dBm です。損失率は −65 dBm までは 0% で、そこから −90 dBm の 100% まで直線的に増えるので、1.2 dB 超えた分は 1.2 ÷ 25 ≈ 5% です。途中では、160 m で −64.3 dBm・0%、300 m で −69.7 dBm・19% です。屋内では壁や人のために電波がもっと速く弱まり（伝搬損失の指数はおよそ 3〜4）、実際の損失は RSSI だけでなく、雑音や無線機が選ぶ通信速度によって決まります。',
      },
      taughtBy: 'wireless',
    },
    {
      id: 'tcp-recovery-levels',
      prompt: {
        en: 'In the TCP Congestion Control lesson (MSS 1000 bytes, initial ssthresh 4000 bytes), cwnd has grown to 4000 bytes and four segments — 3001, 4001, 5001 and 6001 — are out when 3001 is lost. The third duplicate ACK arrives at step 9. What does the cwnd line do at step 9, and at step 10 when the new ACK arrives?',
        ja: 'TCP の輻輳制御のレッスン（MSS 1000 バイト、ssthresh の初期値 4000 バイト）では、cwnd が 4000 バイトまで増え、3001・4001・5001・6001 の 4 セグメントを送った状態で 3001 が失われます。ステップ 9 で 3 つ目の重複 ACK が届きます。cwnd の線はステップ 9 で、そして新しい ACK が届くステップ 10 でどう動きますか？',
      },
      options: [
        {
          en: 'Step 9: drops to 2000, half of 4000, and stays there at step 10',
          ja: 'ステップ 9 で 4000 の半分の 2000 に下がり、ステップ 10 もそのまま',
        },
        {
          en: 'Step 9: drops to 1000, one segment; step 10: grows back to 2000',
          ja: 'ステップ 9 で 1 セグメントの 1000 に下がり、ステップ 10 で 2000 に戻る',
        },
        {
          en: 'Step 9: rises to 5000, its highest point; step 10: falls to 2000 — the same height the line started at',
          ja: 'ステップ 9 で最も高い 5000 に上がり、ステップ 10 で 2000 に下がる。線が始まったときと同じ高さ',
        },
        {
          en: 'Step 9: rises to 7000 (4000 plus three segments); step 10: falls back to 4000, the level just before the loss',
          ja: 'ステップ 9 で 7000（4000 に 3 セグメントを足す）に上がり、ステップ 10 で損失の直前と同じ 4000 に戻る',
        },
      ],
      answer: 2,
      explanation: {
        en: 'RFC 5681 sets ssthresh to half the data in flight: 4000 ÷ 2 = 2000. Fast retransmit then sets cwnd to ssthresh + 3 MSS = 5000 — one MSS for each segment the duplicate ACKs show has left the network — and the new ACK deflates it to ssthresh, 2000. Halving to 2000 at once is what Reno without window inflation, or a modern stack with PRR, would show; dropping to one segment is the RTO response, which this lesson shows later at step 12. On the chart the step-9 peak is 2.5 times the step-10 level, which equals the starting level and is twice the final “cwnd 1000 B”.',
        ja: 'RFC 5681 では、ssthresh は送信中のデータ量の半分、4000 ÷ 2 ＝ 2000 です。高速再送では cwnd を ssthresh ＋ 3 MSS ＝ 5000 にし（重複 ACK が「ネットワークから抜けた」と示す 3 セグメント分）、新しい ACK が届くと ssthresh の 2000 まで縮めます。すぐ 2000 に半減するのはウィンドウを膨らませない実装や PRR を使う今の実装の見え方で、1 セグメントへ下がるのは RTO のときの動きです（このレッスンではステップ 12 で起きます）。グラフでは、ステップ 9 の山はステップ 10 の高さの 2.5 倍で、ステップ 10 の高さは最初の高さと同じ、最後の「cwnd 1000 B」の 2 倍です。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
};
