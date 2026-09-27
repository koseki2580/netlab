import type { ExamLevel } from './examQuestions';

/**
 * Level 4 of the final test: situations where two or three mechanisms meet
 * and the answer given from habit is wrong. Every answer is shown on the
 * screen of the lesson named — by its text, its tables or what it does when
 * run — and where this product's model differs from real equipment, the
 * question says "in this lesson's network" and the explanation says how.
 */
export const EXAM_LEVEL_4: ExamLevel = {
  level: 4,
  title: { en: 'Level 4 · Expert', ja: 'レベル 4・エキスパート' },
  summary: {
    en: 'Where several mechanisms meet and the habitual answer is wrong: read each lesson’s tables and traces closely.',
    ja: '複数のしくみが重なり、慣れで答えると間違える場面。各レッスンの表とトレースを細かく読みます。',
  },
  path: [
    {
      id: 'stp',
      path: '/networking/stp',
      title: { en: 'Spanning Tree', ja: 'スパニングツリー' },
      teaches: {
        en: 'How bridge priorities decide the root and each port’s role',
        ja: 'ブリッジの優先度がルートと各ポートの役割をどう決めるか',
      },
    },
    {
      id: 'mtu',
      path: '/networking/mtu-fragmentation',
      title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
      teaches: {
        en: 'A packet larger than a link’s MTU, with and without DF',
        ja: 'リンクの MTU より大きいパケット（DF あり・なし）',
      },
    },
    {
      id: 'dynamic',
      path: '/routing/dynamic',
      title: { en: 'Dynamic Routing', ja: '動的ルーティング' },
      teaches: {
        en: 'How RIP, OSPF and BGP each choose a path',
        ja: 'RIP・OSPF・BGP がそれぞれ経路を選ぶ基準',
      },
    },
    {
      id: 'ha',
      path: '/networking/ha',
      title: { en: 'Gateway HA And Link Aggregation', ja: 'ゲートウェイの冗長化とリンク束ね' },
      teaches: {
        en: 'A redundant default gateway through a failure and a recovery',
        ja: '冗長化したデフォルトゲートウェイの、障害と復旧',
      },
    },
    {
      id: 'acl',
      path: '/simulation/acl',
      title: { en: 'Firewalls & ACLs', ja: 'ファイアウォールと ACL' },
      teaches: {
        en: 'Interface ACLs and a firewall that tracks connections',
        ja: 'インタフェースの ACL と、接続を追跡するファイアウォール',
      },
    },
    {
      id: 'enterprise',
      path: '/simulation/enterprise',
      title: { en: 'Enterprise Edge', ja: '企業ネットワークの入口' },
      teaches: {
        en: 'NAT and ACLs working on the same router',
        ja: '同じルータの上で働く NAT と ACL',
      },
    },
    {
      id: 'tcp-congestion',
      path: '/simulation/tcp-congestion',
      title: { en: 'TCP Congestion Control', ja: 'TCP の輻輳制御' },
      teaches: {
        en: 'How the sender’s window reacts to two kinds of loss',
        ja: '2 種類の損失に対して送信側のウィンドウがどう動くか',
      },
    },
    {
      id: 'http3',
      path: '/networking/http3',
      title: { en: 'HTTP/3 over QUIC', ja: 'HTTP/3（QUIC）' },
      teaches: {
        en: 'Several requests on one QUIC connection when a packet is lost',
        ja: '1 本の QUIC 接続に複数の要求が流れているときの損失',
      },
    },
    {
      id: 'mpls',
      path: '/networking/tunneling/mpls-l3vpn',
      title: { en: 'MPLS L3VPN', ja: 'MPLS L3VPN' },
      teaches: {
        en: 'The two-label stack and penultimate-hop popping',
        ja: '2 段のラベルと、最後から 2 番目のホップでのラベル除去（PHP）',
      },
    },
    {
      id: 'vxlan',
      path: '/networking/tunneling/vxlan-evpn',
      title: { en: 'VXLAN EVPN', ja: 'VXLAN EVPN' },
      teaches: {
        en: 'EVPN routes and ARP suppression on a VXLAN fabric',
        ja: 'VXLAN のファブリックでの EVPN 経路と ARP 抑止',
      },
    },
  ],
  questions: [
    {
      id: 'stp-designated-port',
      prompt: {
        en: 'In the Spanning Tree lesson’s defaults, Switch A (priority 4096) is the root, Switch B and Switch C are at 32768, and Switch C’s port toward Switch B is blocked. You change only Switch C’s priority, to 8192. What does the lesson show?',
        ja: 'スパニングツリーのレッスンの初期状態では、Switch A（優先度 4096）がルートで、Switch B と Switch C は 32768、Switch C の Switch B 向きのポートが遮断されています。Switch C の優先度だけを 8192 に変えると、レッスンの表示はどうなりますか？',
      },
      options: [
        {
          en: 'Nothing changes: Switch A is still the root, and only the root’s priority affects which port is blocked',
          ja: '何も変わらない。Switch A がルートのままで、どのポートを遮断するかに効くのはルートの優先度だけだから',
        },
        {
          en: 'Switch C becomes the root, because its priority was lowered',
          ja: '優先度を下げたので、Switch C がルートになる',
        },
        {
          en: 'Switch A stays root and the B–C link is still the blocked one — but now Switch B’s port toward C blocks, and Switch C’s becomes designated',
          ja: 'Switch A はルートのままで、遮断されるのも B–C 間のリンクのまま。ただし遮断されるのは Switch B の C 向きのポートに変わり、Switch C 側は指定ポートになる',
        },
        {
          en: 'Switch A stays root, but the A–C link is now blocked, because Switch C prefers to reach the root through B',
          ja: 'Switch A はルートのままだが、Switch C が B 経由でルートへ向かうようになり、A–C 間のリンクが遮断される',
        },
      ],
      answer: 2,
      explanation: {
        en: 'The lowest bridge ID is root, and 4096 still beats 8192. On the B–C link both switches are the same cost from the root, so the designated port goes to the lower bridge ID — now Switch C’s — and the other end blocks: Switch B’s card now shows its port toward Switch C as BLOCKED and Switch C’s card shows its port toward B as DESIGNATED. Real 802.1D/RSTP decides it the same way.',
        ja: 'ルートはブリッジ ID が最も小さいスイッチで、4096 は 8192 より小さいままです。B–C 間のリンクでは両端ともルートまでのコストが同じなので、指定ポートはブリッジ ID の小さい側、つまり今度は Switch C が取り、反対側が遮断されます。レッスンでも、Switch B のカードでは Switch C 向きのポートが BLOCKED に、Switch C のカードでは Switch B 向きのポートが DESIGNATED に変わります。実機の 802.1D/RSTP でも同じ決まり方です。',
      },
      taughtBy: 'stp',
    },
    {
      id: 'mtu-reassembly',
      prompt: {
        en: 'In the MTU lesson, Host A pings Host B with a 1200-byte payload, DF clear, across the 600-byte tunnel between R1 and R2. R1 splits the packet. Where are the pieces put back together, and what does R2 do with them?',
        ja: 'MTU のレッスンで、Host A から Host B へペイロード 1200 バイトの ping を DF なしで送ります。R1–R2 間のトンネルの MTU は 600 バイトで、R1 がパケットを分割します。断片はどこで元に戻され、R2 は断片をどう扱いますか？',
      },
      options: [
        {
          en: 'R2, at the far end of the small link, reassembles them and sends one whole packet on to Host B',
          ja: '小さいリンクの反対側にいる R2 が組み立て直し、1 つのパケットにして Host B へ送る',
        },
        {
          en: 'Host B reassembles them; R2 forwards each fragment on its own as it arrives',
          ja: 'Host B が組み立て直す。R2 は断片を届いた順に 1 つずつそのまま転送する',
        },
        {
          en: 'Nobody reassembles them: Host B answers each fragment with its own echo reply',
          ja: 'どこでも組み立て直さない。Host B は断片ごとにエコー応答を返す',
        },
        {
          en: 'Host B reassembles them, but only after R2 has held every fragment, because a router may not forward part of a packet',
          ja: 'Host B が組み立て直すが、その前に R2 がすべての断片がそろうまで保持する。ルータはパケットの一部だけを転送できないから',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The timeline shows each fragment going R1 → R2 → Host B on its own, Host B marked “reassembly pending” until the last one arrives and then “reassembled (3 frags)”. Routers forward IPv4 fragments like any packet; only the destination reassembles. (A real GRE or IPsec tunnel that fragments its outer packet is reassembled at the tunnel’s far end — here the inner IPv4 packet itself is fragmented.)',
        ja: 'タイムラインでは、断片が 1 つずつ R1 → R2 → Host B と進み、Host B は最後の断片が届くまで「reassembly pending」、届くと「reassembled (3 frags)」になります。ルータは IPv4 の断片を普通のパケットと同じように転送し、組み立て直すのは宛先だけです。（実機の GRE や IPsec のトンネルが外側のパケットを分割した場合は、トンネルの反対側の端で組み立て直します。ここで分割されているのは内側の IPv4 パケットそのものです。）',
      },
      taughtBy: 'mtu',
    },
    {
      id: 'ospf-asymmetric-cost',
      prompt: {
        en: 'In the Dynamic Routing lesson with OSPF selected, the R1 → R3 link has cost 3 and every other link cost 1. How does R3 reach R1’s LAN, 10.1.0.0/24?',
        ja: '動的ルーティングのレッスンで OSPF を選ぶと、R1 → R3 のリンクはコスト 3、ほかのリンクはすべてコスト 1 です。R3 は R1 の LAN（10.1.0.0/24）へどう届けますか？',
      },
      options: [
        {
          en: 'Directly to R1: R3 counts only the cost of its own outgoing interface (1); the 3 applies to traffic leaving R1',
          ja: 'R1 へ直接送る。R3 が数えるのは自分の出口インタフェースのコスト（1）で、3 は R1 から出る通信にだけかかる',
        },
        {
          en: 'It splits traffic over both ways: direct costs 3 and R4–R2–R1 costs 3, an equal-cost tie',
          ja: '2 つの経路に分けて送る。直接だとコスト 3、R4–R2–R1 経由もコスト 3 で同点だから',
        },
        {
          en: 'Through R4 and R2, avoiding the link whose cost was raised',
          ja: 'コストを上げたリンクを避けて、R4 と R2 を経由する',
        },
        {
          en: 'Directly to R1, but the route’s cost is 3, because a link’s cost counts the same in both directions',
          ja: 'R1 へ直接送るが、経路のコストは 3 になる。リンクのコストは両方向に同じだけかかるから',
        },
      ],
      answer: 0,
      explanation: {
        en: 'An OSPF cost belongs to the interface a packet leaves by. The lesson’s table for R3 lists 10.1.0.0/24 via 10.0.13.1 (R1) with metric 1, while R1’s own route to R4’s LAN goes via R2: the two directions take different paths. A real router would also add the LAN’s own interface cost, so its number would be higher, but the path is the same.',
        ja: 'OSPF のコストは、パケットが出ていくインタフェースに付く値です。レッスンの R3 の経路表では 10.1.0.0/24 の次ホップが 10.0.13.1（R1）、メトリック 1 です。一方、R1 から R4 の LAN への経路は R2 経由で、行きと帰りで通り道が違います。実機では宛先 LAN のインタフェースのコストも足すので数値はもっと大きくなりますが、経路は同じです。',
      },
      taughtBy: 'dynamic',
    },
    {
      id: 'vrrp-failback',
      prompt: {
        en: 'In the Gateway HA lesson, R1 (VRRP priority 150) is master for the virtual gateway 10.10.0.1 and R2 has priority 110. You fail R1, then restore it. Once R1 is back, which router answers for 10.10.0.1, and with which MAC address?',
        ja: 'ゲートウェイの冗長化のレッスンで、仮想ゲートウェイ 10.10.0.1 のマスタは R1（VRRP 優先度 150）、R2 は優先度 110 です。R1 を落としてから戻しました。R1 が戻ったあと、10.10.0.1 に応答するのはどちらのルータで、MAC アドレスは何ですか？',
      },
      options: [
        {
          en: 'R2 stays master — a router that comes back does not take over from a working master — using 00:00:5e:00:01:0a',
          ja: 'R2 がマスタのまま。戻ってきたルータは、動いているマスタから役割を取り返さないから。MAC は 00:00:5e:00:01:0a',
        },
        {
          en: 'R1 again, answering with its own interface MAC, 02:00:00:00:01:01',
          ja: 'R1 に戻り、自分のインタフェースの MAC（02:00:00:00:01:01）で応答する',
        },
        {
          en: 'R1 again; while it was down R2 answered with its own MAC, 02:00:00:00:02:01, so hosts had to ARP again',
          ja: 'R1 に戻る。R1 が落ちていた間は R2 が自分の MAC（02:00:00:00:02:01）で応答していたので、端末は ARP をやり直す必要がある',
        },
        {
          en: 'R1 again, with the same virtual MAC, 00:00:5e:00:01:0a, that answered throughout',
          ja: 'R1 に戻る。MAC は最初から最後まで同じ仮想 MAC（00:00:5e:00:01:0a）',
        },
      ],
      answer: 3,
      explanation: {
        en: 'The lesson’s panel goes Master: R1 → R2 → R1, while “Virtual MAC: 00:00:5e:00:01:0a” (VRID 10) never changes, so hosts keep the same ARP entry. VRRP pre-empts by default, so the higher-priority R1 takes the role back; the answer that R2 stays is the habit from HSRP, where pre-emption is off unless configured.',
        ja: 'レッスンのパネルでは、マスタが R1 → R2 → R1 と変わる一方、「仮想 MAC: 00:00:5e:00:01:0a」（VRID 10）は一度も変わらないので、端末は ARP の記録をそのまま使えます。VRRP は既定でプリエンプトするので、優先度の高い R1 が役割を取り戻します。R2 のままと考えるのは、プリエンプトが既定で無効な HSRP の感覚です。',
      },
      taughtBy: 'ha',
    },
    {
      id: 'acl-empty-stateful',
      prompt: {
        en: 'In the Firewalls & ACLs lesson, R-FW’s outside interface eth1 has an inbound ACL with no rules at all. Before sending anything else, you press “Return Traffic” (Server port 80 → Client port 40000). Then you send HTTP from the Client and press “Return Traffic” again. In this lesson’s network, what happens to the two return packets?',
        ja: 'ファイアウォールと ACL のレッスンで、R-FW の外側のインタフェース eth1 の入口 ACL にはルールが 1 つもありません。ほかに何も送る前に「戻りの通信」（Server のポート 80 → Client のポート 40000）を押し、次に Client から HTTP を送ってから、もう一度「戻りの通信」を押します。このレッスンのネットワークでは、2 回の戻りの通信はどうなりますか？',
      },
      options: [
        {
          en: 'Both are delivered: an ACL with no rules filters nothing',
          ja: '2 回とも届く。ルールのない ACL は何も止めないから',
        },
        {
          en: 'Both are dropped: no rule permits anything in from outside',
          ja: '2 回とも捨てられる。外から入るものを許可するルールがないから',
        },
        {
          en: 'The first is delivered, being a reply from a web port; the second is dropped as a duplicate',
          ja: '1 回目は Web のポートからの応答なので届き、2 回目は重複として捨てられる',
        },
        {
          en: 'The first is dropped by the default policy; the second is delivered as return traffic of the Client’s connection',
          ja: '1 回目は既定のポリシーで捨てられ、2 回目は Client の接続の戻りの通信として届く',
        },
      ],
      answer: 3,
      explanation: {
        en: 'The first packet’s hop detail at R-FW reads INBOUND eth1, rule “(default policy)”, DENY; after the Client’s HTTP the same packet reads rule “conn-track” (tracked return traffic), PERMIT. R-FW is a stateful firewall, so what no rule permits is denied unless it belongs to a connection started inside. On a plain Cisco IOS router, by contrast, applying an ACL with no entries permits everything.',
        ja: '1 回目の R-FW のホップの詳細は、INBOUND・eth1・ルール「（既定のポリシー）」・DENY です。Client の HTTP のあとは、同じパケットがルール「状態を追跡した戻りの通信 (conn-track)」で PERMIT になります。R-FW は状態を追跡するファイアウォールなので、どのルールにも許可されないものは、内側から始めた接続の戻りでない限り拒否されます。これに対して、普通の Cisco IOS ルータでは、エントリが 1 つもない ACL を適用するとすべて許可されます。',
      },
      taughtBy: 'acl',
    },
    {
      id: 'nat-acl-return',
      prompt: {
        en: 'In the Enterprise Edge lesson, after DHCP, DNS and browsing: GW-Router’s lan0 has an inbound ACL that permits only TCP from 10.0.1.0/24 to port 80, and wan0’s inbound ACL is empty. The web server’s reply (source port 80) arrives on wan0 addressed to 10.0.2.1:1024 — the router’s own address. What happens to it?',
        ja: '企業ネットワークの入口のレッスンで、DHCP・DNS・アクセスまで進めます。GW-Router の lan0 の入口 ACL は 10.0.1.0/24 から宛先ポート 80 への TCP だけを許可し、wan0 の入口 ACL は空です。Web サーバの応答（送信元ポート 80）が、ルータ自身のアドレス 10.0.2.1:1024 あてに wan0 に届きます。この応答はどうなりますか？',
      },
      options: [
        {
          en: 'wan0 permits it as return traffic of the client’s connection, NAT rewrites the destination to Client A’s address and port 49152, and it reaches Client A',
          ja: 'wan0 でクライアントの接続の戻りとして許可され、NAT が宛先を Client A のアドレスとポート 49152 に書き換え、Client A に届く',
        },
        {
          en: 'It is dropped at wan0: a packet addressed to the router itself is not forwarded anywhere',
          ja: 'wan0 で捨てられる。ルータ自身あてのパケットは、どこにも転送されないから',
        },
        {
          en: 'NAT rewrites it for Client A, and it is then dropped leaving lan0, since the lan0 ACL permits only destination port 80',
          ja: 'NAT で Client A あてに書き換えられたあと、lan0 から出るところで捨てられる。lan0 の ACL は宛先ポート 80 しか許可しないから',
        },
        {
          en: 'It reaches Client A still addressed to port 1024; the client matches it to its request by the server’s address',
          ja: 'ポート 1024 あてのまま Client A に届き、Client A はサーバのアドレスで自分の要求の応答だと判断する',
        },
      ],
      answer: 0,
      explanation: {
        en: 'The response’s hop at GW-Router shows NAT “Pre Dst 10.0.2.1:1024 → Post Dst …:49152” and ACL “INBOUND wan0, conn-track, PERMIT”, then delivery to Client A. It can be mapped back because the request created the NAT table row 49152 ↔ 1024 on the way out. The lan0 ACL is inbound: it filters what enters from the LAN, not what leaves toward it — ACLs have a direction on real routers too.',
        ja: 'GW-Router での応答のホップには、NAT「Pre Dst 10.0.2.1:1024 → Post Dst …:49152」と、ACL「INBOUND・wan0・conn-track・PERMIT」が表示され、そのあと Client A に届きます。元に戻せるのは、行きに作られた 49152 → 1024 の NAT テーブルの行があるからです。lan0 の ACL は入口向きなので、LAN から入るものを調べ、LAN へ出ていくものは調べません。実機の ACL も向きを持っています。',
      },
      taughtBy: 'enterprise',
    },
    {
      id: 'tcp-fast-recovery',
      prompt: {
        en: 'In the TCP Congestion Control lesson (MSS 1000 bytes), segment 3001 is lost and three duplicate ACKs trigger fast retransmit at step 9; later segment 9001 is lost and the retransmission timer fires at step 12. In this lesson’s trace, what does cwnd do?',
        ja: 'TCP の輻輳制御のレッスン（MSS 1000 バイト）では、シーケンス番号 3001 が失われ、3 つの重複 ACK でステップ 9 に高速再送が起きます。そのあと 9001 が失われ、ステップ 12 で再送タイマ（RTO）が切れます。このレッスンのトレースでは、cwnd はどう動きますか？',
      },
      options: [
        {
          en: 'At fast retransmit it halves at once and stays there; at the timeout it halves again',
          ja: '高速再送ですぐ半分になってそのまま。RTO でさらに半分になる',
        },
        {
          en: 'At fast retransmit it first rises above its previous value, falls back when the new ACK arrives at step 10, and at the timeout drops to one MSS (1000 bytes)',
          ja: '高速再送ではいったん直前の値より大きくなり、ステップ 10 で新しい ACK が届くと下がる。RTO では 1 MSS（1000 バイト）まで下がる',
        },
        {
          en: 'Both losses reset it to one MSS and start slow start again',
          ja: 'どちらの損失でも 1 MSS に戻り、スロースタートからやり直す',
        },
        {
          en: 'At fast retransmit it drops to one MSS; at the timeout it only halves',
          ja: '高速再送で 1 MSS に下がり、RTO では半分になるだけ',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The chart’s cwnd line jumps up at step 9, drops at step 10 and ends at “cwnd 1000 B” after the RTO. This is Reno fast recovery (RFC 5681): ssthresh becomes half the data in flight, cwnd is set to ssthresh + 3 MSS for the three segments the duplicate ACKs show have left, and it deflates to ssthresh on the new ACK; only a timeout goes back to one MSS. Modern stacks (Linux with PRR and CUBIC) do not inflate the window like this.',
        ja: 'グラフの cwnd の線は、ステップ 9 で上がり、ステップ 10 で下がり、RTO のあと「cwnd 1000 B」で終わります。これは Reno の高速回復（RFC 5681）です。ssthresh を送信中のデータ量の半分にし、重複 ACK が「3 つのセグメントが抜けた」と示す分だけ cwnd を ssthresh + 3 MSS に広げ、新しい ACK が届くと ssthresh まで縮めます。1 MSS まで戻るのはタイムアウトのときだけです。今の実装（PRR と CUBIC を使う Linux など）は、このようにウィンドウを膨らませません。',
      },
      taughtBy: 'tcp-congestion',
    },
    {
      id: 'quic-stream-loss',
      prompt: {
        en: 'In the HTTP/3 lesson, four requests — /a, /b, /c and /d, in that order — share one QUIC connection. You make loss hit QUIC stream 4. Which requests stall?',
        ja: 'HTTP/3 のレッスンでは、4 つの要求（/a、/b、/c、/d の順）が 1 本の QUIC 接続を共有しています。QUIC のストリーム 4 に損失を起こすと、止まるのはどの要求ですか？',
      },
      options: [
        {
          en: 'All four: they share one connection, which delivers in order',
          ja: '4 つすべて。1 本の接続を共有していて、接続は順番どおりに届けるから',
        },
        {
          en: 'Only /d: stream 4 is the fourth request',
          ja: '/d だけ。ストリーム 4 は 4 番目の要求だから',
        },
        {
          en: 'Only /b: the client’s request streams are numbered 0, 4, 8, 12, and QUIC recovers each stream on its own',
          ja: '/b だけ。クライアントの要求のストリームは 0、4、8、12 と番号が付き、QUIC はストリームごとに回復するから',
        },
        {
          en: '/b and every request after it (/c and /d), since their data waits behind the gap',
          ja: '/b と、そのあとの要求（/c と /d）。後ろのデータは欠けた部分のあとで待たされるから',
        },
      ],
      answer: 2,
      explanation: {
        en: 'The lesson lists “Stream 0 /a, Stream 4 /b, Stream 8 /c, Stream 12 /d”, and with loss on, only Stream 4 /b shows stalled. Client-initiated bidirectional QUIC streams are numbered in steps of four, and QUIC orders data per stream, so one loss holds back only its own stream. Over HTTP/2 the streams share one TCP byte stream, and a lost segment stalls every one of them.',
        ja: 'レッスンの一覧は「ストリーム 0 /a、ストリーム 4 /b、ストリーム 8 /c、ストリーム 12 /d」で、損失を起こすと停止中になるのはストリーム 4 /b だけです。クライアントが開く双方向の QUIC ストリームは 4 ずつ番号が進み、QUIC は順番をストリームごとにそろえるので、1 つの損失が止めるのはそのストリームだけです。HTTP/2 では全ストリームが 1 本の TCP のバイト列を共有するため、1 つのセグメントが失われるとすべてが止まります。',
      },
      taughtBy: 'http3',
    },
    {
      id: 'mpls-php-label',
      prompt: {
        en: 'In the MPLS L3VPN lesson with PHP enabled, a packet from CE1 to 10.0.2.0/24 in VRF blue crosses PE1 → P → PE2. What labels does it carry on the last link, P → PE2?',
        ja: 'MPLS L3VPN のレッスンで PHP を有効にしたまま、CE1 から VRF blue の 10.0.2.0/24 あてのパケットが PE1 → P → PE2 と進みます。最後のリンク（P → PE2）で、パケットにはどのラベルが付いていますか？',
      },
      options: [
        {
          en: 'None: PHP pops the whole stack, and PE2 looks the plain IP packet up in its global table',
          ja: '何も付いていない。PHP でラベルがすべて外され、PE2 は普通の IP パケットとして全体の経路表を引く',
        },
        {
          en: 'Only the transport label: the VPN label is taken off at P',
          ja: 'トランスポートラベルだけ。VPN ラベルは P で外される',
        },
        {
          en: 'Both, 16001 over 24010: PHP changes only which router lowers the TTL',
          ja: '16001 と 24010 の両方。PHP が変えるのは、どのルータが TTL を減らすかだけ',
        },
        {
          en: 'Only the VPN label, 24010: P has popped the transport label, and PE2 needs 24010 to know which VRF the packet belongs to',
          ja: 'VPN ラベル 24010 だけ。P がトランスポートラベルを外しており、PE2 はパケットがどの VRF のものかを 24010 で知る',
        },
      ],
      answer: 3,
      explanation: {
        en: 'The lesson’s stack reads “3 / 24010” with PHP and “16001 / 24010” without, under “PHP active: penultimate hop pops transport label”. Label 3 is implicit null — the “pop me” signal PE2 advertises — so it is never sent; 24010, the label imported with the VPNv4 route, is there either way. Without it PE2 would not know which VRF’s table to use.',
        ja: 'レッスンのラベルスタックは、PHP 有効で「3 / 24010」、無効で「16001 / 24010」と表示され、「PHP 有効: 最後から2番目のホップがトランスポートラベルを外します」と書かれています。3 は implicit null、つまり PE2 が「外して送って」と伝える値で、実際に送られることはありません。VPNv4 経路とともに取り込んだ 24010 はどちらの場合も残ります。これがないと、PE2 はどの VRF の経路表を使うか分かりません。',
      },
      taughtBy: 'mpls',
    },
    {
      id: 'evpn-arp-suppression',
      prompt: {
        en: 'In the VXLAN EVPN lesson with ARP suppression on, Host A (behind Leaf1) sends an ARP request for 10.10.0.20, Host B behind Leaf2. What happens?',
        ja: 'VXLAN EVPN のレッスンで ARP 抑止が有効なとき、Leaf1 の配下の Host A が、Leaf2 の配下にいる Host B（10.10.0.20）あてに ARP 要求を出します。何が起きますか？',
      },
      options: [
        {
          en: 'Leaf1 answers it itself with Host B’s MAC, 02:00:00:00:00:0b, learned from the EVPN Type-2 route; the request is not flooded across the fabric',
          ja: 'Leaf1 が EVPN の Type-2 経路で知った Host B の MAC（02:00:00:00:00:0b）を使って自分で応答し、要求はファブリックに流されない',
        },
        {
          en: 'Leaf1 answers it from the Type-5 route for 10.10.0.0/24',
          ja: 'Leaf1 が 10.10.0.0/24 の Type-5 経路をもとに応答する',
        },
        {
          en: 'It is encapsulated (UDP 4789, VNI 10000) and flooded to every VTEP, and Host B answers; suppression only shortens the reply’s path',
          ja: 'UDP 4789・VNI 10000 でカプセル化されてすべての VTEP へ流され、Host B が応答する。抑止が短くするのは応答の経路だけ',
        },
        {
          en: 'Leaf2 answers on Host B’s behalf after receiving the request through the tunnel',
          ja: 'トンネル経由で要求を受け取った Leaf2 が、Host B の代わりに応答する',
        },
      ],
      answer: 0,
      explanation: {
        en: 'The lesson shows “Type-2: 02:00:00:00:00:0b / 10.10.0.20” and “ARP suppression hit: 02:00:00:00:00:0b”; turn suppression off and it reads “miss: flood”. A Type-2 route carries a host’s MAC and IP, so the local VTEP can answer; a Type-5 route carries only a prefix, with no MAC to answer with.',
        ja: 'レッスンには「Type-2: 02:00:00:00:00:0b / 10.10.0.20」と「ARP 抑止でヒット: 02:00:00:00:00:0b」が表示され、抑止を無効にすると「ミス: フラッディングします」に変わります。Type-2 経路は端末の MAC と IP を運ぶので、手前の VTEP が代わりに答えられます。Type-5 経路が運ぶのはプレフィックスだけで、答えに使える MAC を持っていません。',
      },
      taughtBy: 'vxlan',
    },
  ],
};
