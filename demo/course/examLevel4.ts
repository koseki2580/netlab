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
          en: 'Six via 10.0.12.2 and two via 10.0.13.2 — the 4th and 7th flows; the second press repeats the pattern exactly, 12 and 4 of 16 lines',
          ja: '10.0.12.2 経由が 6 つ、10.0.13.2 経由が 2 つ（4・7 番目のフロー）。2 回目もまったく同じ並びで、16 行のうち 12 行と 4 行になる',
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
          en: 'An uneven split on the first press, and a different split on the second, because Leaf A takes a new hash for each burst',
          ja: '1 回目は均等でない分かれ方になり、2 回目はそれとは別の分かれ方になる。Leaf A は送るたびにハッシュ値を計算し直すから',
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
          en: 'Master: R1. Virtual MAC 00:00:5e:00:01:0a. 1 active member, selected member fa0/2',
          ja: 'マスタ: R1。仮想 MAC は 00:00:5e:00:01:0a。稼働中のメンバは 1 本、選ばれたメンバは fa0/2',
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
      id: 'qos-bandwidth-for-target',
      prompt: {
        en: 'In the Per-Link QoS lesson, “Send QoS burst” sends one packet across the R2 → R3 link, and the line under the result splits the crossing time into sending and propagation. You want that packet to take exactly 50 ms to cross. You leave the propagation delay and the packet as the lesson has them, set the loss to 0%, and change only the bandwidth. Which bandwidth makes the lesson report 50 ms?',
        ja: 'リンクごとの QoS のレッスンで「QoS を試すパケットを送る」を押すと、パケットが 1 つ R2 → R3 のリンクを渡り、結果の下の行に、通過にかかった時間が「送り出し」と「伝搬」に分けて表示されます。このパケットの通過時間を、ちょうど 50 ms にしたいとします。伝搬遅延とパケットはレッスンのままにし、損失率を 0% にして、帯域だけを変えます。表示が 50 ms になる帯域はどれですか？',
      },
      options: [
        {
          en: '240 000 bps: all 50 ms goes on sending the packet, because this link adds no delay of its own',
          ja: '240 000 bps。このリンクには遅延がなく、50 ms はすべてパケットの送り出しにかかる',
        },
        {
          en: '300 000 bps: 40 ms to send the packet, plus the link’s 10 ms of delay',
          ja: '300 000 bps。送り出しに 40 ms、リンクの遅延が 10 ms',
        },
        {
          en: '600 000 bps: 20 ms to send the packet, plus the link’s 30 ms of delay',
          ja: '600 000 bps。送り出しに 20 ms、リンクの遅延が 30 ms',
        },
        {
          en: '400 000 bps: 30 ms to send the packet, plus the link’s 20 ms of delay',
          ja: '400 000 bps。送り出しに 30 ms、リンクの遅延が 20 ms',
        },
      ],
      answer: 3,
      explanation: {
        en: 'Send once before changing anything: the lesson reads “sending 12 ms + propagation 20 ms = 32 ms”, with the bandwidth field at 1 000 000 bps and the delay field at 20 ms. So the packet is 12 ms × 1 000 000 bps = 12 000 bits, a 1500-byte IP packet. The bandwidth changes only the sending part, so sending has to take 50 − 20 = 30 ms: 12 000 bits ÷ 0.030 s = 400 000 bps, and the lesson then reads “sending 30 ms + propagation 20 ms = 50 ms”. The other three are each right for a link with a different delay, which is why the question cannot be settled without reading this one: here 240 000 bps gives 50 + 20 = 70 ms, 300 000 bps gives 40 + 20 = 60 ms, and 600 000 bps gives 20 + 20 = 40 ms. Real links behave the same way — the time to clock the bits out, plus the time the signal takes to travel. This lesson counts the IP packet only; real Ethernet adds its header, preamble and inter-frame gap to the bits sent.',
        ja: 'まず、何も変えずに 1 回送ります。表示は「送り出し 12 ms ＋ 伝搬 20 ms ＝ 32 ms」で、帯域の欄は 1 000 000 bps、伝搬遅延の欄は 20 ms です。つまりパケットは 12 ms × 1 000 000 bps ＝ 12 000 ビットで、1500 バイトの IP パケットです。帯域で変わるのは送り出しの時間だけなので、送り出しを 50 − 20 ＝ 30 ms にする必要があります。12 000 ビット ÷ 0.030 秒 ＝ 400 000 bps で、このとき表示は「送り出し 30 ms ＋ 伝搬 20 ms ＝ 50 ms」になります。ほかの 3 つは、遅延が違うリンクならそれぞれ正解になる値です。だから、このリンクの値を読まないと決められません。このリンクでは、240 000 bps は 50 ＋ 20 ＝ 70 ms、300 000 bps は 40 ＋ 20 ＝ 60 ms、600 000 bps は 20 ＋ 20 ＝ 40 ms になります。実際のリンクも同じで、ビットを送り出す時間に、信号が伝わる時間が加わります。このレッスンは IP パケットの大きさだけを数えますが、実際の Ethernet ではヘッダ・プリアンブル・フレーム間の隙間も送るビットに加わります。',
      },
      taughtBy: 'link-qos',
    },
    {
      id: 'wifi-distance-loss',
      prompt: {
        en: 'In the Wireless 802.11 lesson, the station at 20 m shows RSSI −46.2 dBm and 0% loss. You move it out to 250 m. In this lesson’s network, what do the RSSI and loss read?',
        ja: '無線 LAN（802.11）のレッスンでは、20 m の位置の端末は RSSI −46.2 dBm、損失率 0% です。これを 250 m まで離します。このレッスンのネットワークでは、RSSI と損失率はどう表示されますか？',
      },
      options: [
        {
          en: '−79.1 dBm and 56%: about 33 dB weaker, as indoor signal falls with the cube of distance',
          ja: '−79.1 dBm で 56%。屋内の電波は距離の 3 乗で弱まるので、約 33 dB 下がる',
        },
        {
          en: '−68.1 dBm and 13%',
          ja: '−68.1 dBm で 13%',
        },
        {
          en: '−68.1 dBm and 0%: still a usable signal, so nothing is lost yet',
          ja: '−68.1 dBm で 0%。まだ十分使える強さなので、損失は出ない',
        },
        {
          en: '−68.1 dBm and 3%: one point of loss for each dB below −65 dBm',
          ja: '−68.1 dBm で 3%。−65 dBm を 1 dB 下回るごとに 1 ポイントずつ失われる',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The lesson uses free-space path loss, which grows by 20 dB for every tenfold distance: 250 m is 12.5 times 20 m, about 21.9 dB more, so −46.2 − 21.9 = −68.1 dBm. Its loss is 0% down to −65 dBm and then rises 4 points per dB to 100% at −90 dBm, so 3.1 dB past the start gives about 13%. The lesson’s own note works the same sum for 200 m: −66.2 dBm and 5%. That loss line is this lesson’s simplification: on real Wi-Fi −68 dBm is still a good signal, and loss depends on the noise and on the data rate the radio chooses, not on RSSI alone. Indoors, walls and people make the signal fall faster (a path-loss exponent of about 3 to 4).',
        ja: 'このレッスンは自由空間の伝搬損失を使っており、距離が 10 倍になるごとに 20 dB 増えます。250 m は 20 m の 12.5 倍で、約 21.9 dB の増加なので、−46.2 − 21.9 ＝ −68.1 dBm です。損失率は −65 dBm までは 0% で、そこから 1 dB につき 4 ポイントずつ増えて −90 dBm で 100% になるので、3.1 dB 超えた分で約 13% です。レッスンの説明には、同じ計算が 200 m の例（−66.2 dBm、5%）で載っています。この損失率の直線は、このレッスンだけの単純化です。実際の Wi-Fi では −68 dBm はまだ十分な強さで、損失は RSSI だけでなく、雑音や無線機が選ぶ通信速度によって決まります。屋内では壁や人のために電波がもっと速く弱まります（伝搬損失の指数はおよそ 3〜4）。',
      },
      taughtBy: 'wireless',
    },
    {
      id: 'tcp-third-dupack-state',
      prompt: {
        en: 'In the TCP Congestion Control lesson (MSS 1000 bytes), press “Run trace” and move the step slider to step 9, the step at which the third duplicate ACK arrives and the sender makes its fast retransmit. What does the readout above the chart show at step 9?',
        ja: 'TCP の輻輳制御のレッスン（MSS 1000 バイト）で「トレースを実行」を押し、ステップのスライダーをステップ 9 に動かします。ステップ 9 は、3 つ目の重複 ACK が届き、送信側が高速再送をするステップです。このとき、グラフの上の表示はどうなっていますか？',
      },
      options: [
        {
          en: 'cwnd 7000 B, ssthresh 4000 B, in flight 8000 B: slow start had doubled the window twice, and eight segments were out',
          ja: 'cwnd 7000 B、ssthresh 4000 B、送信中 8000 B。スロースタートでウィンドウが 2 回倍になり、8 セグメントを送っていた',
        },
        {
          en: 'cwnd 6000 B, ssthresh 3000 B, in flight 6000 B: the window had grown by one segment for each ACK, and six segments were out',
          ja: 'cwnd 6000 B、ssthresh 3000 B、送信中 6000 B。ウィンドウが ACK ごとに 1 セグメントずつ増え、6 セグメントを送っていた',
        },
        {
          en: 'cwnd 5000 B, ssthresh 2000 B, in flight 4000 B: the window had stopped at the threshold, and four segments were out',
          ja: 'cwnd 5000 B、ssthresh 2000 B、送信中 4000 B。ウィンドウがしきい値で止まり、4 セグメントを送っていた',
        },
        {
          en: 'cwnd 8000 B, ssthresh 5000 B, in flight 10000 B: the loss came in a ten-segment initial window',
          ja: 'cwnd 8000 B、ssthresh 5000 B、送信中 10000 B。10 セグメントの初期ウィンドウの中で損失が起きた',
        },
      ],
      answer: 2,
      explanation: {
        en: 'What the fast retransmit does to the window is fixed by RFC 5681; how much data was out when it happened is this trace’s own, and only the slider shows it. This connection starts with cwnd 2000 bytes and ssthresh 4000 bytes, so two ACKs take cwnd to 4000 at step 4 and slow start ends there. Steps 5 and 6 send four segments — in flight 4000 bytes — and the first of them is lost. The other three each bring back a duplicate ACK, at steps 7, 8 and 9, and through steps 7 and 8 nothing changes. At the third, ssthresh becomes the larger of half the data in flight and two segments, max(4000 ÷ 2, 2 × 1000) = 2000, and cwnd becomes ssthresh plus three segments, 2000 + 3 × 1000 = 5000: one segment for each duplicate ACK, since each means a segment has left the network. In flight stays 4000, because a duplicate ACK acknowledges nothing new. Every option applies those two rules correctly; the other three start from 8000, 6000 and 10000 bytes in flight, which this trace never reaches. Real stacks that follow RFC 5681 do the same. Stacks with SACK count what is in flight differently, and CUBIC reduces by a different factor.',
        ja: '高速再送でウィンドウがどう変わるかは RFC 5681 で決まっています。一方、そのとき送信中だったデータ量はこのトレースに固有のもので、スライダーを動かさないとわかりません。この接続は cwnd 2000 バイト、ssthresh 4000 バイトで始まるので、ACK が 2 つ届いたステップ 4 で cwnd が 4000 になり、スロースタートはそこで終わります。ステップ 5 と 6 で 4 セグメントを送り（送信中 4000 バイト）、その最初の 1 つが失われます。残りの 3 つに対して、ステップ 7・8・9 で重複 ACK が 1 つずつ返ります。ステップ 7 と 8 では何も変わりません。3 つ目が届くと、ssthresh は「送信中のデータ量の半分」と「2 セグメント」の大きい方、max(4000 ÷ 2, 2 × 1000) ＝ 2000 になります。cwnd は ssthresh に 3 セグメントを足した 2000 ＋ 3 × 1000 ＝ 5000 です。重複 ACK 1 つは、セグメントが 1 つネットワークから出たことを意味するので、その分を足します。重複 ACK は新しいデータを何も確認しないので、送信中は 4000 のままです。どの選択肢も、この 2 つの規則を正しく当てはめています。ほかの 3 つは送信中が 8000・6000・10000 バイトだった場合の値ですが、このトレースではそこまで増えません。RFC 5681 に従う実際の実装も同じ動きをします。SACK を使う実装は送信中の数え方が違い、CUBIC などは別の割合で減らします。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
};
