import type { ExamLevel } from './examQuestions';

/**
 * Level 4 of the final test: exact results where two or three mechanisms
 * meet, on each lesson's own network. Principles narrow a question down, but
 * the prompts leave out the lesson's costs, defaults, limits and constants on
 * purpose, so only reproducing the scenario in the lesson named — and reading
 * the number, port or path it shows — settles it. The wrong answers are what
 * a strong engineer's reasoning gives with a plausible default in place of the
 * lesson's configuration: equal costs, an even hash, a threshold halved once
 * too often. Every right answer is also what a real network configured the
 * same way would do; where the simulator's own model decides it, the question
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
      id: 'ecmp',
      path: '/networking/ecmp',
      title: { en: 'ECMP Multipath', ja: 'ECMP（等コスト複数経路）' },
      teaches: {
        en: 'Which of two equal paths each flow takes, and whether it takes it again',
        ja: '同じコストの 2 経路のうち、各フローがどちらを通るか。もう一度送るとどうなるか',
      },
    },
    {
      id: 'mtu',
      path: '/networking/mtu-fragmentation',
      title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
      teaches: {
        en: 'What a small MTU does to one packet, with the DF bit clear and set',
        ja: '小さい MTU が 1 つのパケットに何をするか。DF ビットがないときと、あるとき',
      },
    },
    {
      id: 'ha',
      path: '/networking/ha',
      title: {
        en: 'Gateway HA And Link Aggregation',
        ja: 'ゲートウェイの冗長化とリンク束ね',
      },
      teaches: {
        en: 'Who answers for the gateway, and which link a flow uses, through a run of failures',
        ja: '障害が続いたとき、ゲートウェイとして応答するのはどれか、通信はどのリンクを使うか',
      },
    },
    {
      id: 'dynamic',
      path: '/routing/dynamic',
      title: { en: 'Dynamic Routing', ja: '動的ルーティング' },
      teaches: {
        en: 'What OSPF and BGP each put in a router’s table on the same network',
        ja: '同じネットワークで、OSPF と BGP がそれぞれルータの経路表に何を入れるか',
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
      id: 'stp',
      path: '/networking/stp',
      title: { en: 'Spanning Tree', ja: 'スパニングツリー' },
      teaches: {
        en: 'How priorities move the root, the blocked port and the path of a frame',
        ja: '優先度を変えると、ルート・遮断されるポート・フレームの通り道がどう動くか',
      },
    },
    {
      id: 'link-qos',
      path: '/networking/link-qos',
      title: { en: 'Per-Link QoS', ja: 'リンクごとの QoS' },
      teaches: {
        en: 'The two parts of the time a packet takes to cross a link',
        ja: 'パケットがリンクを渡るのにかかる時間の、2 つの内訳',
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
        en: 'The window and the threshold at every step, through both kinds of loss',
        ja: '2 種類の損失を通した、各ステップのウィンドウとしきい値',
      },
    },
  ],
  questions: [
    {
      id: 'ecmp-exact-split',
      prompt: {
        en: 'In the ECMP lesson, Leaf A has two equal-cost routes to the Server: next hop 10.0.12.2 (Spine 1) and next hop 10.0.13.2 (Spine 2). “Send ECMP flows” sends eight UDP flows that differ only in source port. You press it twice. In this lesson’s network, what does the ECMP Decisions list show?',
        ja: 'ECMP のレッスンでは、Leaf A から Server への同じコストの経路が 2 本あります。次ホップ 10.0.12.2（Spine 1）と、次ホップ 10.0.13.2（Spine 2）です。「ECMP のフローを送る」は、送信元ポートだけが違う UDP のフローを 8 つ送ります。これを 2 回押します。このレッスンのネットワークでは、「ECMP の振り分け結果」の一覧はどうなりますか？',
      },
      options: [
        {
          en: 'Four via each spine, alternating flow by flow; the second press adds the same eight lines',
          ja: 'Spine ごとに 4 つずつで、フローごとに交互。2 回目は同じ 8 行が追加される',
        },
        {
          en: 'All eight via 10.0.12.2, because every flow has the same source and destination address; the second press adds eight more the same',
          ja: '8 つとも 10.0.12.2 経由。どのフローも送信元と宛先のアドレスが同じだから。2 回目も同じ 8 行が追加される',
        },
        {
          en: 'Five via 10.0.12.2 and three via 10.0.13.2 — the 3rd, 5th and 8th flows; the second press repeats the pattern exactly, 10 and 6 of 16 lines',
          ja: '10.0.12.2 経由が 5 つ、10.0.13.2 経由が 3 つ（3・5・8 番目のフロー）。2 回目もまったく同じ並びで、16 行のうち 10 行と 6 行になる',
        },
        {
          en: 'Five via 10.0.12.2 and three via 10.0.13.2 — the 2nd, 4th and 7th flows; the second press repeats the pattern exactly, 10 and 6 of 16 lines',
          ja: '10.0.12.2 経由が 5 つ、10.0.13.2 経由が 3 つ（2・4・7 番目のフロー）。2 回目もまったく同じ並びで、16 行のうち 10 行と 6 行になる',
        },
      ],
      answer: 2,
      explanation: {
        en: 'Leaf A hashes each flow’s addresses and ports and uses the result to pick one of the two next hops. The eight source ports happen to fall five in bucket 1/2 (10.0.12.2) and three in bucket 2/2 (10.0.13.2): lines 3, 5 and 8 of the list. The same flow always hashes to the same bucket, so the second press shows lines 9 to 16 identical to lines 1 to 8. What every real router shares is that last part — one flow, one path. The split itself depends on the hash and on which fields it reads: many routers read only the two addresses unless told to include the ports, and on those all eight of these flows would take a single path. An even four and four is what the hash promises only on average, over many flows.',
        ja: 'Leaf A は、フローのアドレスとポートからハッシュ値を計算し、その値で 2 つの次ホップのどちらかを選びます。この 8 つの送信元ポートでは、たまたま 5 つがバケット 1/2（10.0.12.2）、3 つがバケット 2/2（10.0.13.2）になります。一覧の 3・5・8 行目です。同じフローは必ず同じバケットになるので、2 回目に追加される 9〜16 行目は 1〜8 行目とまったく同じです。実際のどのルータにも共通するのは、この「1 つのフローは 1 つの経路」という点です。分かれ方そのものは、ハッシュの計算方法と、どの項目を読むかで変わります。ポートも含めるように設定しない限り 2 つのアドレスだけを読むルータも多く、その場合はこの 8 つのフローがすべて同じ経路を通ります。4 つずつの均等な分かれ方は、多くのフローを平均したときに期待できるだけです。',
      },
      taughtBy: 'ecmp',
    },
    {
      id: 'mtu-slider-floor-df',
      prompt: {
        en: 'In the MTU lesson the ping carries 1200 bytes of ICMP data. You drag the tunnel-MTU slider down to the lowest value it allows and ping with DF clear. Then you tick “Set DF bit on ICMP echo from A” and ping again. What do the trace notes show for the two pings?',
        ja: 'MTU のレッスンの ping は、ICMP のデータ部を 1200 バイト運びます。トンネル MTU のスライダーを、動かせるいちばん小さい値まで下げ、DF なしで ping します。続いて「A からの ICMP エコーに DF ビットを立てる」にチェックを入れ、もう一度 ping します。2 回の ping で、トレースのメモはそれぞれどうなりますか？',
      },
      options: [
        {
          en: 'First 6 fragments; then no fragments and Frag-Needed ICMP: yes (next-hop MTU 256)',
          ja: '1 回目は断片 6 個。2 回目は断片なしで、Frag-Needed の ICMP: あり（次ホップの MTU 256）',
        },
        {
          en: 'First 5 fragments; then no fragments and Frag-Needed ICMP: yes (next-hop MTU 300)',
          ja: '1 回目は断片 5 個。2 回目は断片なしで、Frag-Needed の ICMP: あり（次ホップの MTU 300）',
        },
        {
          en: 'First 4 fragments; then no fragments and Frag-Needed ICMP: yes (next-hop MTU 300)',
          ja: '1 回目は断片 4 個。2 回目は断片なしで、Frag-Needed の ICMP: あり（次ホップの MTU 300）',
        },
        {
          en: 'First 5 fragments; then no fragments and Frag-Needed ICMP: yes (next-hop MTU 256)',
          ja: '1 回目は断片 5 個。2 回目は断片なしで、Frag-Needed の ICMP: あり（次ホップの MTU 256）',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The slider stops at 300 bytes. Every fragment repeats the 20-byte IP header, leaving 280 bytes of payload — already a multiple of 8. The payload to split is 1208 bytes, the 1200 of data plus the 8-byte ICMP header: 4 × 280 = 1120, and the remaining 88 bytes make a fifth fragment. Dividing 1200 by 300 gives the wrong 4. With DF set, R1 may not split the packet, so it drops it and sends Host A an ICMP “fragmentation needed” (type 3, code 4) that carries the MTU of the link it could not use: 300. A slider that went down to 256 would give 232 bytes per fragment and 6 fragments. Real IPv4 routers do exactly this (RFC 791, RFC 1191); the returned MTU is what path MTU discovery relies on.',
        ja: 'スライダーの下限は 300 バイトです。どの断片にも 20 バイトの IP ヘッダが付くので、運べるペイロードは 280 バイトで、これはすでに 8 の倍数です。分割されるペイロードは、データ 1200 バイトに ICMP ヘッダ 8 バイトを足した 1208 バイトです。4 × 280 ＝ 1120 で、残りの 88 バイトが 5 個目の断片になります。1200 を 300 で割ると、誤った 4 個になります。DF を立てると R1 は分割できないので、パケットを破棄し、通せなかったリンクの MTU（300）を入れた ICMP の「分割が必要」（type 3、code 4）を Host A に返します。もしスライダーが 256 まで下がるなら、断片 1 個あたり 232 バイトで 6 個になります。実際の IPv4 ルータも同じ動きをします（RFC 791、RFC 1191）。返される MTU は、経路 MTU 探索が頼りにする値です。',
      },
      taughtBy: 'mtu',
    },
    {
      id: 'ha-fail-fail-restore',
      prompt: {
        en: 'In the Gateway HA lesson, R1 (priority 150) and R2 (priority 110) share the virtual gateway 10.10.0.1, and the Server’s flow starts on member fa0/1 of the two-link bundle po1. You press “Fail R1 Gateway”, then “Fail LACP Member”, then “Restore R1 Gateway”. In this lesson’s network, what do the two panels show now?',
        ja: 'ゲートウェイの冗長化のレッスンでは、R1（優先度 150）と R2（優先度 110）が仮想ゲートウェイ 10.10.0.1 を共有し、Server の通信は 2 本を束ねた po1 のメンバ fa0/1 から始まります。「R1 のゲートウェイを落とす」、「LACP のメンバを落とす」、「R1 のゲートウェイを戻す」の順に押します。このレッスンのネットワークでは、2 つのパネルの表示はどうなっていますか？',
      },
      options: [
        {
          en: 'Master: R1. Virtual MAC 00:00:5e:00:01:0a, the same at every step. 1 active member, selected member fa0/2',
          ja: 'マスタ: R1。仮想 MAC は 00:00:5e:00:01:0a で、どの段階でも同じ。稼働中のメンバは 1 本、選ばれたメンバは fa0/2',
        },
        {
          en: 'Master: R2 — a backup that took over keeps the gateway until it fails itself. Virtual MAC 00:00:5e:00:01:0a. 1 active member, selected member fa0/2',
          ja: 'マスタ: R2。引き継いだバックアップは、自分が落ちるまでゲートウェイを持ち続けるから。仮想 MAC は 00:00:5e:00:01:0a。稼働中のメンバは 1 本、選ばれたメンバは fa0/2',
        },
        {
          en: 'Master: R1. Virtual MAC 00:00:5e:00:01:01. 1 active member, selected member fa0/2',
          ja: 'マスタ: R1。仮想 MAC は 00:00:5e:00:01:01。稼働中のメンバは 1 本、選ばれたメンバは fa0/2',
        },
        {
          en: 'Master: R1. Virtual MAC 00:00:5e:00:01:01. 1 active member, selected member fa0/1 — the flow stays on the member it was hashed to',
          ja: 'マスタ: R1。仮想 MAC は 00:00:5e:00:01:01。稼働中のメンバは 1 本、選ばれたメンバは fa0/1。通信は、ハッシュで割り当てられたメンバに残るから',
        },
      ],
      answer: 0,
      explanation: {
        en: 'When R1 fails, R2 becomes master and answers for the same virtual IP and the same virtual MAC. A VRRP MAC is 00:00:5e:00:01 followed by the group number; this lesson’s group is 10, hexadecimal 0a, so the panel reads 00:00:5e:00:01:0a throughout — a MAC ending in 01 would belong to group 1. When R1 returns, its higher priority takes the gateway back, because preemption is on by default in VRRP (RFC 5798). The member this lesson fails is fa0/1, the one the flow was using, so the flow moves to the survivor: 1 active member, fa0/2. On real equipment, which member fails is whatever broke; and HSRP, Cisco’s older protocol, does not preempt unless configured to — there R2 would stay active.',
        ja: 'R1 が落ちると R2 がマスタになり、同じ仮想 IP と同じ仮想 MAC で応答します。VRRP の MAC は 00:00:5e:00:01 のあとにグループ番号が続きます。このレッスンのグループは 10（16 進数で 0a）なので、パネルの表示はずっと 00:00:5e:00:01:0a です。末尾が 01 の MAC はグループ 1 のものです。R1 が戻ると、優先度の高い R1 がゲートウェイを取り戻します。VRRP ではプリエンプションが既定で有効だからです（RFC 5798）。このレッスンが落とすメンバは、通信が使っていた fa0/1 なので、通信は残った fa0/2 へ移ります。表示は「1 本のメンバが稼働中」と fa0/2 です。実機では、どのメンバが落ちるかは壊れた箇所で決まります。また、Cisco の古い方式である HSRP は、設定しない限りプリエンプションをしないので、その場合は R2 がアクティブのままです。',
      },
      taughtBy: 'ha',
    },
    {
      id: 'ospf-bgp-transit-link',
      prompt: {
        en: 'In the Dynamic Routing lesson, the link between R1 and R3 is 10.0.13.0/30. R2 connects to R1 (10.0.12.1) and to R4 (10.0.24.2), and is not on that link. With the interface costs and the BGP settings this lesson configures, what does R2’s table show for 10.0.13.0/30 with OSPF selected, and with BGP selected?',
        ja: '動的ルーティングのレッスンでは、R1 と R3 の間のリンクは 10.0.13.0/30 です。R2 は R1（10.0.12.1）と R4（10.0.24.2）につながっていて、このリンクにはつながっていません。このレッスンが設定しているインタフェースのコストと BGP の設定のもとで、OSPF を選んだとき、そして BGP を選んだとき、R2 の経路表の 10.0.13.0/30 はどう表示されますか？',
      },
      options: [
        {
          en: 'OSPF: next hop 10.0.12.1 (R1), metric 2. BGP: no entry for it',
          ja: 'OSPF は次ホップ 10.0.12.1（R1）、メトリック 2。BGP ではこの宛先の行がない',
        },
        {
          en: 'OSPF: next hop 10.0.12.1 (R1), metric 4. BGP: next hop 10.0.12.1, learned from R1’s AS',
          ja: 'OSPF は次ホップ 10.0.12.1（R1）、メトリック 4。BGP は次ホップ 10.0.12.1 で、R1 の AS から学ぶ',
        },
        {
          en: 'OSPF: next hop 10.0.24.2 (R4), metric 3. BGP: next hop 10.0.12.1, learned from R1’s AS',
          ja: 'OSPF は次ホップ 10.0.24.2（R4）、メトリック 3。BGP は次ホップ 10.0.12.1 で、R1 の AS から学ぶ',
        },
        {
          en: 'OSPF: next hop 10.0.24.2 (R4), metric 3. BGP: no entry for it',
          ja: 'OSPF は次ホップ 10.0.24.2（R4）、メトリック 3。BGP ではこの宛先の行がない',
        },
      ],
      answer: 3,
      explanation: {
        en: 'OSPF adds the cost of each interface a packet leaves by, and then the cost of the interface the last router has on the destination network (RFC 2328, section 16.1). This lesson gives R1’s interface on 10.0.13.0/30 cost 3 and every other interface cost 1. Through R1 the link costs 1 (R2 → R1) + 3 (R1’s interface on it) = 4. Round the other side it is 1 (R2 → R4) + 1 (R4 → R3) + 1 (R3’s interface on it) = 3, so R2 reaches a link on its own neighbour R1 through R4: 10.0.24.2, metric 3. With every cost equal it would be R1 at metric 2. BGP carries only the prefixes a router is told to originate — here 10.1.0.0/24 from R1 and 10.4.0.0/24 from R4 — so R2’s BGP table has its two connected links and those two LANs, and nothing for 10.0.13.0/30. Real BGP is the same: the links between routers are not advertised unless someone configures it.',
        ja: 'OSPF は、パケットが出ていく各インタフェースのコストを足し、最後に、宛先のネットワーク上にある最後のルータのインタフェースのコストを足します（RFC 2328 の 16.1 節）。このレッスンでは、10.0.13.0/30 上の R1 のインタフェースがコスト 3、ほかのインタフェースはすべて 1 です。R1 経由では 1（R2 → R1）＋ 3（そのリンク上の R1 のインタフェース）＝ 4 です。反対側を回ると 1（R2 → R4）＋ 1（R4 → R3）＋ 1（そのリンク上の R3 のインタフェース）＝ 3 なので、R2 は隣の R1 につながったリンクへ R4 経由で届けます。表示は 10.0.24.2、メトリック 3 です。コストがすべて同じなら、R1 経由でメトリック 2 になります。BGP が運ぶのは、ルータが広告するよう設定されたプレフィックスだけです。ここでは R1 の 10.1.0.0/24 と R4 の 10.4.0.0/24 です。そのため R2 の BGP の経路表にあるのは、直結の 2 本のリンクとこの 2 つの LAN だけで、10.0.13.0/30 の行はありません。実際の BGP も同じで、ルータ間のリンクは、設定しない限り広告されません。',
      },
      taughtBy: 'dynamic',
    },
    {
      id: 'ospf-reconverged-metrics',
      prompt: {
        en: 'In the OSPF Convergence lesson you press “Fail link”, which takes down the primary link between R2 and R4, and the route tables reconverge. With the interface costs this lesson configures, what do R2’s table (for C2’s LAN, 10.4.0.0/24) and R4’s table (for C1’s LAN, 10.1.0.0/24) show?',
        ja: 'OSPF の収束のレッスンで「リンクを落とす」を押すと、R2 と R4 の間の主経路のリンクが落ち、経路表が計算し直されます。このレッスンが設定しているインタフェースのコストのもとで、R2 の経路表（C2 の LAN、10.4.0.0/24）と R4 の経路表（C1 の LAN、10.1.0.0/24）はどう表示されますか？',
      },
      options: [
        {
          en: 'R2: via 10.0.12.1 (R1), metric 4. R4: via 10.0.34.1 (R3), metric 3',
          ja: 'R2 は 10.0.12.1（R1）経由でメトリック 4。R4 は 10.0.34.1（R3）経由でメトリック 3',
        },
        {
          en: 'R2: via 10.0.12.1, metric 6. R4: via 10.0.34.1, metric 5',
          ja: 'R2 は 10.0.12.1 経由でメトリック 6。R4 は 10.0.34.1 経由でメトリック 5',
        },
        {
          en: 'R2: via 10.0.12.1, metric 6. R4: via 10.0.34.1, metric 3',
          ja: 'R2 は 10.0.12.1 経由でメトリック 6。R4 は 10.0.34.1 経由でメトリック 3',
        },
        {
          en: 'R2: via 10.0.12.1, metric 5. R4: via 10.0.34.1, metric 2',
          ja: 'R2 は 10.0.12.1 経由でメトリック 5。R4 は 10.0.34.1 経由でメトリック 2',
        },
      ],
      answer: 2,
      explanation: {
        en: 'In this lesson R1’s interface toward R3 has cost 3 and every other interface cost 1. With R2–R4 gone, R2’s only way to C2 is back through R1 and on through R3: 1 (R2 → R1) + 3 (R1 → R3) + 1 (R3 → R4) + 1 (R4’s interface on C2’s LAN) = 6. R4’s way to C1 uses the same links backwards, leaving by R4 → R3 (1) and R3 → R1 (1), then R1’s interface on C1’s LAN (1). The 3 belongs to R1’s interface and is never paid in that direction, so R4 shows 3: an OSPF cost is set per interface, and the two directions of one path need not match. The lesson’s R2 tab reads 10.4.0.0/24, 10.0.12.1, 6 and its R4 tab 10.1.0.0/24, 10.0.34.1, 3. Equal costs everywhere would give 4 and 3; paying the 3 in both directions gives 6 and 5; leaving out the destination LAN’s interface gives 5 and 2, the cost to the router that owns the LAN rather than to the LAN.',
        ja: 'このレッスンでは、R1 の R3 向きのインタフェースがコスト 3、ほかのインタフェースはすべて 1 です。R2–R4 のリンクがなくなると、R2 から C2 へは R1 まで戻って R3 を通るしかありません。1（R2 → R1）＋ 3（R1 → R3）＋ 1（R3 → R4）＋ 1（C2 の LAN 上の R4 のインタフェース）＝ 6 です。R4 から C1 へは同じリンクを逆向きにたどり、R4 → R3（1）と R3 → R1（1）から出て、最後に C1 の LAN 上の R1 のインタフェース（1）を足します。3 は R1 のインタフェースのコストなので、この向きでは一度も払わず、R4 の表示は 3 です。OSPF のコストはインタフェースごとに決めるので、同じ経路でも行きと帰りで一致するとは限りません。レッスンの R2 のタブは 10.4.0.0/24・10.0.12.1・6、R4 のタブは 10.1.0.0/24・10.0.34.1・3 です。すべて同じコストなら 4 と 3、コスト 3 を両方向で払うと 6 と 5 になります。宛先 LAN のインタフェースを足し忘れると 5 と 2 で、これは LAN ではなく、LAN を持つルータまでのコストです。',
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
      id: 'stp-two-priorities',
      prompt: {
        en: 'In the Spanning Tree lesson’s triangle, Switch A (priority 4096) starts as the root and the Switch B – Switch C link is blocked. You type 0 into Switch C’s priority and 4096 into Switch B’s, then press “A → B”. What does the lesson show?',
        ja: 'スパニングツリーのレッスンの三角形では、最初は Switch A（優先度 4096）がルートで、Switch B – Switch C のリンクが遮断されています。Switch C の優先度に 0、Switch B の優先度に 4096 を入力し、「A → B」を押します。レッスンの表示はどうなりますか？',
      },
      options: [
        {
          en: 'Root 0/02:00:00:0c:00:01 (Switch C). The Switch A – Switch B link is blocked at Switch B’s end, and the frame goes Host A → Switch A → Switch C → Switch B → Host B',
          ja: 'ルートは 0/02:00:00:0c:00:01（Switch C）。Switch A – Switch B のリンクが Switch B 側で遮断され、フレームは Host A → Switch A → Switch C → Switch B → Host B と進む',
        },
        {
          en: 'Root 0/02:00:00:0c:00:01 (Switch C). The Switch A – Switch B link is blocked at Switch A’s end, and the frame goes Host A → Switch A → Switch C → Switch B → Host B',
          ja: 'ルートは 0/02:00:00:0c:00:01（Switch C）。Switch A – Switch B のリンクが Switch A 側で遮断され、フレームは Host A → Switch A → Switch C → Switch B → Host B と進む',
        },
        {
          en: 'Root 0/02:00:00:0c:00:01 (Switch C). The Switch A – Switch B link is blocked at Switch B’s end only, so the frame still goes straight across: Host A → Switch A → Switch B → Host B',
          ja: 'ルートは 0/02:00:00:0c:00:01（Switch C）。Switch A – Switch B のリンクは Switch B 側だけが遮断なので、フレームはそのまま直接渡る。Host A → Switch A → Switch B → Host B',
        },
        {
          en: 'Root stays 4096/02:00:00:0a:00:01 (Switch A): a working root is not replaced. The Switch B – Switch C link stays blocked, and the frame goes Host A → Switch A → Switch B → Host B',
          ja: 'ルートは 4096/02:00:00:0a:00:01（Switch A）のまま。動いているルートは入れ替わらないから。Switch B – Switch C のリンクは遮断されたままで、フレームは Host A → Switch A → Switch B → Host B と進む',
        },
      ],
      answer: 0,
      explanation: {
        en: 'The lowest bridge ID is the root at any time, so Switch C at priority 0 takes over at once; the root line reads 0/02:00:00:0c:00:01. Switch A and Switch B each reach the new root over one link, so their ports toward Switch C become root ports and the loop has to be cut on the link between them. Both ends are the same distance from the root, so the designated port goes to the lower bridge ID. The priorities now tie at 4096 and the MAC decides: 02:00:00:0a:… is lower than 02:00:00:0b:…, so Switch A’s port is DESIGNATED and Switch B’s is BLOCKED. A blocked port neither sends nor accepts data frames, so the link carries nothing in either direction, and A → B detours through the root. Real spanning tree gives the same result for these bridge IDs; real switches accept priorities only in steps of 4096, which 0 and 4096 are.',
        ja: 'ルートになるのは、常にブリッジ ID がいちばん小さいスイッチです。優先度 0 の Switch C がすぐにルートになり、ルートブリッジの行は 0/02:00:00:0c:00:01 です。Switch A と Switch B は、どちらも新しいルートまでリンク 1 本なので、Switch C 向きのポートがルートポートになり、ループはこの 2 台の間のリンクで切ることになります。両端ともルートまでの距離が同じなので、指定ポートはブリッジ ID の小さい側が取ります。優先度は 4096 で同点になり、MAC で決まります。02:00:00:0a:… は 02:00:00:0b:… より小さいので、Switch A のポートが DESIGNATED、Switch B のポートが BLOCKED です。遮断されたポートはデータのフレームを送ることも受け取ることもしないので、このリンクはどちら向きにも何も運ばず、A → B はルートを経由して遠回りします。実際のスパニングツリーも、このブリッジ ID なら同じ結果になります。実機では優先度は 4096 刻みでしか設定できませんが、0 と 4096 はそれに当てはまります。',
      },
      taughtBy: 'stp',
    },
    {
      id: 'qos-tenth-bandwidth',
      prompt: {
        en: 'In the Per-Link QoS lesson, with the bandwidth and delay the lesson starts with, “Send QoS burst” — one 1500-byte IP packet — reports 32 ms to cross the R2 → R3 link. You change only the bandwidth, to one tenth of its starting value, apply it, and send again. What does the lesson report?',
        ja: 'リンクごとの QoS のレッスンで、帯域と伝搬遅延が最初の値のまま「QoS を試すパケットを送る」（1500 バイトの IP パケット 1 つ）を押すと、R2 → R3 のリンクの通過に 32 ms と表示されます。帯域だけを最初の値の 10 分の 1 に変えて適用し、もう一度送ります。レッスンの表示はどうなりますか？',
      },
      options: [
        {
          en: '320 ms: a tenth of the bandwidth makes the crossing ten times as long',
          ja: '320 ms。帯域が 10 分の 1 なら、通過にかかる時間は 10 倍になる',
        },
        {
          en: '32 ms: a packet alone on the link never waits for bandwidth',
          ja: '32 ms。リンクにパケットが 1 つだけなら、帯域のせいで待つことはない',
        },
        {
          en: '212 ms: the 20 ms spent sending becomes 200 ms, and the 12 ms of delay stays',
          ja: '212 ms。送り出しの 20 ms が 200 ms になり、遅延の 12 ms はそのまま',
        },
        {
          en: '140 ms: the 12 ms spent sending becomes 120 ms, and the 20 ms of delay stays',
          ja: '140 ms。送り出しの 12 ms が 120 ms になり、遅延の 20 ms はそのまま',
        },
      ],
      answer: 3,
      explanation: {
        en: 'The link starts at 1 000 000 bps with 20 ms of propagation delay. Putting 1500 bytes onto it takes 1500 × 8 ÷ 1 000 000 = 12 ms, and the delay adds 20 ms: 32 ms. Only the first part depends on the bandwidth. At 100 000 bps it becomes 120 ms, the delay is still 20 ms, and the lesson reads “Delivered — 140 ms to cross the link.” Even a packet with the link to itself has to be clocked out bit by bit, so 32 ms cannot stay. Real links behave the same way; this lesson counts the IP packet only, and real Ethernet adds its header, preamble and inter-frame gap to the bits sent.',
        ja: 'リンクの最初の設定は、帯域 1 000 000 bps、伝搬遅延 20 ms です。1500 バイトを送り出すのに 1500 × 8 ÷ 1 000 000 ＝ 12 ms かかり、遅延の 20 ms を足して 32 ms です。帯域で変わるのは前半だけです。100 000 bps では送り出しが 120 ms になり、遅延は 20 ms のままなので、表示は「届きました — リンクの通過に 140 ms かかりました。」です。リンクを 1 つのパケットだけが使っていても、1 ビットずつ送り出す時間は必要なので、32 ms のままにはなりません。実際のリンクも同じです。このレッスンは IP パケットの大きさだけを数えますが、実際の Ethernet ではヘッダ・プリアンブル・フレーム間の隙間も送るビットに加わります。',
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
      id: 'tcp-rto-threshold',
      prompt: {
        en: 'In the TCP Congestion Control lesson (MSS 1000 bytes), run the trace and move the step slider to the end. Fast recovery finishes at step 10, more data is sent at step 11, and at step 12 the retransmission timeout fires. What do cwnd and ssthresh read at step 12?',
        ja: 'TCP の輻輳制御のレッスン（MSS 1000 バイト）でトレースを実行し、ステップのスライダーを最後まで動かします。ステップ 10 で高速リカバリが終わり、ステップ 11 で新しいデータを送り、ステップ 12 で再送タイムアウトが起きます。ステップ 12 の cwnd と ssthresh はいくつですか？',
      },
      options: [
        {
          en: 'cwnd 1000 B, ssthresh 1000 B: the threshold is halved again, to half of what was in flight',
          ja: 'cwnd 1000 B、ssthresh 1000 B。しきい値はもう一度、送信中だった量の半分に下がる',
        },
        {
          en: 'cwnd 2000 B, ssthresh 1000 B: the window restarts from the initial two segments',
          ja: 'cwnd 2000 B、ssthresh 1000 B。ウィンドウは最初と同じ 2 セグメントからやり直す',
        },
        {
          en: 'cwnd 1000 B, ssthresh 2000 B: the threshold is the same as at step 11',
          ja: 'cwnd 1000 B、ssthresh 2000 B。しきい値はステップ 11 と同じ',
        },
        {
          en: 'cwnd 1000 B, ssthresh 2500 B: half of the 5000 B the window reached during fast recovery',
          ja: 'cwnd 1000 B、ssthresh 2500 B。高速リカバリの間にウィンドウが達した 5000 B の半分',
        },
      ],
      answer: 2,
      explanation: {
        en: 'Fast recovery left cwnd and ssthresh both at 2000 bytes at step 10, and step 11 puts 2000 bytes in flight. On a timeout RFC 5681 sets ssthresh to the larger of half the data in flight and two segments: max(2000 ÷ 2, 2 × 1000) = 2000. Half would be 1000, but the two-segment floor holds it at 2000, so the dashed ssthresh line stays flat. cwnd falls to one segment, 1000 bytes — the loss window, not the two-segment initial window the connection opened with — and slow start begins again from there. The 5000 bytes at step 9 was the temporary inflation of fast recovery and is never used for a threshold. Real stacks that follow RFC 5681 apply the same floor; CUBIC and others reduce by a different factor.',
        ja: '高速リカバリが終わったステップ 10 では、cwnd と ssthresh はどちらも 2000 バイトで、ステップ 11 で 2000 バイトを送信中になります。タイムアウトのとき、RFC 5681 は ssthresh を「送信中のデータ量の半分」と「2 セグメント」の大きい方にします。max(2000 ÷ 2, 2 × 1000) ＝ 2000 です。半分なら 1000 ですが、2 セグメントという下限があるので 2000 のままで、グラフの ssthresh の破線は横ばいです。cwnd は 1 セグメントの 1000 バイトに下がります。これは損失後のウィンドウで、接続の最初に使った 2 セグメントの初期ウィンドウではありません。ここからスロースタートがやり直しになります。ステップ 9 の 5000 バイトは高速リカバリの間の一時的な膨らみで、しきい値の計算には使われません。RFC 5681 に従う実際の実装にも同じ下限があります。CUBIC などは別の割合で減らします。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
};
