import type { ExamLevel, ExamQuestion, PathStop } from './examQuestions';

/**
 * Level 3 of the final test: how production networks and protocols behave —
 * multipath, reconvergence, redundancy, congestion, modern HTTP and overlays.
 *
 * Every answer was checked against what its lesson shows or does when run.
 * Where the lesson is a simplified model, the question asks about "this
 * lesson's network" and the explanation says so.
 */

const PATH: readonly PathStop[] = [
  {
    id: 'ospf-convergence',
    path: '/routing/ospf-convergence',
    title: { en: 'OSPF Convergence', ja: 'OSPF の収束' },
    teaches: {
      en: 'What a link-state protocol does when a link fails',
      ja: 'リンクが落ちたとき、リンクステート型のプロトコルがすること',
    },
  },
  {
    id: 'ecmp',
    path: '/networking/ecmp',
    title: { en: 'ECMP Multipath', ja: 'ECMP（等コスト複数経路）' },
    teaches: {
      en: 'Using two equal-cost paths at once',
      ja: '同じコストの 2 つの経路を同時に使うこと',
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
      en: 'Keeping the gateway and the uplinks up when one piece fails',
      ja: '1 か所が壊れても、ゲートウェイと上りのリンクを保つしくみ',
    },
  },
  {
    id: 'nat',
    path: '/simulation/nat',
    title: { en: 'NAT / PAT', ja: 'NAT / PAT' },
    teaches: {
      en: 'Letting the internet reach a server behind NAT',
      ja: 'NAT の内側にあるサーバへ、インターネットから届かせること',
    },
  },
  {
    id: 'tcp-congestion',
    path: '/simulation/tcp-congestion',
    title: { en: 'TCP Congestion Control', ja: 'TCP の輻輳制御' },
    teaches: {
      en: 'How a TCP sender sizes its window and reacts to loss',
      ja: 'TCP の送信側がウィンドウを決め、損失に反応するしかた',
    },
  },
  {
    id: 'https',
    path: '/networking/https',
    title: { en: 'HTTPS TLS 1.3', ja: 'HTTPS（TLS 1.3）' },
    teaches: {
      en: 'What is agreed before the first encrypted byte',
      ja: '最初の暗号化データの前に取り決めること',
    },
  },
  {
    id: 'http2',
    path: '/networking/http2',
    title: { en: 'HTTP/2 Multiplexing', ja: 'HTTP/2 の多重化' },
    teaches: {
      en: 'Many requests over one TCP connection',
      ja: '1 本の TCP 接続で、たくさんの要求を運ぶこと',
    },
  },
  {
    id: 'http3',
    path: '/networking/http3',
    title: { en: 'HTTP/3 over QUIC', ja: 'HTTP/3（QUIC）' },
    teaches: {
      en: 'Many requests over QUIC instead of TCP',
      ja: 'TCP の代わりに QUIC で、たくさんの要求を運ぶこと',
    },
  },
  {
    id: 'mpls',
    path: '/networking/tunneling/mpls-l3vpn',
    title: { en: 'MPLS L3VPN', ja: 'MPLS L3VPN' },
    teaches: {
      en: 'Carrying a customer’s routes across a provider with labels',
      ja: 'ラベルを使って、顧客の経路をプロバイダ網の向こうへ運ぶこと',
    },
  },
  {
    id: 'vxlan',
    path: '/networking/tunneling/vxlan-evpn',
    title: { en: 'VXLAN EVPN', ja: 'VXLAN EVPN' },
    teaches: {
      en: 'Stretching a layer-2 segment across a routed fabric',
      ja: 'ルーティングされたファブリックの上に、L2 のセグメントを広げること',
    },
  },
];

const QUESTIONS: readonly ExamQuestion[] = [
  {
    id: 'ecmp-flow-hash',
    prompt: {
      en: 'Leaf A has two equal-cost routes to the server, via Spine 1 and Spine 2. Eight UDP flows that differ only in source port are sent, then the same eight are sent again. What does this lesson’s network do?',
      ja: 'Leaf A には、Spine 1 経由と Spine 2 経由の同じコストの経路が 2 本あります。送信元ポートだけが違う 8 本の UDP フローを送り、同じ 8 本をもう一度送ります。このレッスンのネットワークはどうしますか？',
    },
    options: [
      {
        en: 'It alternates packet by packet, so exactly four go each way and a flow may switch spines between sends',
        ja: 'パケットごとに交互に振り分けるので、ちょうど 4 本ずつに分かれ、同じフローでも送るたびに経路が変わりうる',
      },
      {
        en: 'All eight take the same spine, because they share a destination address',
        ja: '宛先アドレスが同じなので、8 本とも同じ Spine を通る',
      },
      {
        en: 'Each flow is hashed to one spine and takes that same spine both times, even though the split is not exactly even',
        ja: 'フローごとにハッシュで 1 つの Spine が決まり、2 回とも同じ Spine を通る。振り分けはぴったり半分ずつとは限らない',
      },
      {
        en: 'Each flow picks a spine at random, so the second send lands differently from the first',
        ja: 'フローごとに Spine をランダムに選ぶので、2 回目は 1 回目と違う振り分けになる',
      },
    ],
    answer: 2,
    explanation: {
      en: 'ECMP hashes each flow’s header fields into a bucket, so a flow always takes the same path and its packets stay in order. In the lesson both sends gave the identical pattern, with five flows on one spine and three on the other.',
      ja: 'ECMP はフローごとのヘッダの値をハッシュしてバケットを決めるので、同じフローはいつも同じ経路を通り、パケットの順序が崩れません。レッスンでは 2 回とも同じ振り分けになり、片方に 5 本、もう片方に 3 本でした。',
    },
    taughtBy: 'ecmp',
  },
  {
    id: 'ospf-remote-failure',
    prompt: {
      en: 'The link between R2 and R4 fails. R1 has no interface on that link, and nobody touches R1’s configuration. What happens to R1’s route to 10.4.0.0/24?',
      ja: 'R2 と R4 の間のリンクが落ちます。R1 はこのリンクにインタフェースを持っておらず、R1 の設定は誰も変えません。R1 の 10.4.0.0/24 への経路はどうなりますか？',
    },
    options: [
      {
        en: 'Nothing changes: R1’s own links are all up, so it keeps sending to R2 and R2 drops the traffic',
        ja: '何も変わらない。R1 自身のリンクはすべて生きているので R2 へ送り続け、R2 で捨てられる',
      },
      {
        en: 'R1 recomputes on its own: the next hop moves from R2 to R3 and the metric rises from 3 to 5',
        ja: 'R1 が自分で計算し直す。次ホップが R2 から R3 に変わり、メトリックは 3 から 5 に上がる',
      },
      {
        en: 'R1 starts sharing traffic equally between R2 and R3',
        ja: 'R1 は R2 と R3 に均等に振り分け始める',
      },
      {
        en: 'The route disappears until an administrator adds a static backup route',
        ja: '管理者が予備の静的経路を足すまで、経路が消えたままになる',
      },
    ],
    answer: 1,
    explanation: {
      en: 'In a link-state protocol every router learns of a failure anywhere in the area and reruns its shortest-path calculation. The lesson’s R1 preferred route changed from next hop 10.0.12.2, metric 3, to 10.0.13.2, metric 5, and the next probe went C1 → R1 → R3 → R4 → C2.',
      ja: 'リンクステート型では、エリア内のどこで起きた障害もすべてのルータに伝わり、それぞれが最短経路を計算し直します。レッスンの「R1 の優先経路」は、次ホップ 10.0.12.2・メトリック 3 から、10.0.13.2・メトリック 5 に変わり、次のプローブは C1 → R1 → R3 → R4 → C2 を通りました。',
    },
    taughtBy: 'ospf-convergence',
  },
  {
    id: 'vrrp-failover',
    prompt: {
      en: 'Hosts use 10.10.0.1 as their default gateway, a VRRP address shared by R1 (priority 150) and R2 (priority 110). R1 fails. What must change on the hosts?',
      ja: 'ホストはデフォルトゲートウェイに 10.10.0.1 を使っています。これは R1（優先度 150）と R2（優先度 110）が共有する VRRP のアドレスです。R1 が落ちました。ホスト側で何を変える必要がありますか？',
    },
    options: [
      {
        en: 'Their default gateway must be changed to R2’s own address, 10.10.0.3',
        ja: 'デフォルトゲートウェイを R2 自身のアドレス 10.10.0.3 に変える',
      },
      {
        en: 'Nothing on the gateway, but they must re-ARP because the gateway MAC is now R2’s own MAC',
        ja: 'ゲートウェイは変えなくてよいが、ゲートウェイの MAC が R2 自身の MAC になるので ARP をやり直す必要がある',
      },
      {
        en: 'Nothing: R2 becomes master and answers for the same virtual IP and the same virtual MAC',
        ja: '何も変えなくてよい。R2 がマスタになり、同じ仮想 IP と同じ仮想 MAC を引き継ぐ',
      },
      {
        en: 'They must renew their DHCP lease to learn the new gateway',
        ja: '新しいゲートウェイを知るため、DHCP のリースを取り直す必要がある',
      },
    ],
    answer: 2,
    explanation: {
      en: 'The hosts only ever see the virtual IP and a virtual MAC derived from the VRID, so a change of master is invisible to them. In the lesson the master moved from R1 to R2 while the virtual MAC stayed 00:00:5e:00:01:0a.',
      ja: 'ホストが見ているのは仮想 IP と、VRID から決まる仮想 MAC だけなので、マスタが替わってもホストからは見えません。レッスンでは、マスタが R1 から R2 に移っても、仮想 MAC は 00:00:5e:00:01:0a のままでした。',
    },
    taughtBy: 'ha',
  },
  {
    id: 'lacp-member-failure',
    prompt: {
      en: 'A flow from the server is hashed onto member fa0/1 of a two-link LACP port-channel. fa0/1 fails. What happens to that flow in this lesson’s network?',
      ja: 'サーバからのフローが、2 本のリンクを束ねた LACP ポートチャネルのメンバ fa0/1 にハッシュで割り当てられています。fa0/1 が落ちました。このレッスンのネットワークでは、そのフローはどうなりますか？',
    },
    options: [
      {
        en: 'It is dropped until fa0/1 comes back, because a flow is pinned to its member',
        ja: 'フローはメンバに固定されているので、fa0/1 が戻るまで捨てられる',
      },
      {
        en: 'The whole port-channel goes down and spanning tree has to find another path',
        ja: 'ポートチャネル全体が落ち、スパニングツリーが別の経路を探す',
      },
      {
        en: 'It is copied onto both members from now on, to be safe',
        ja: '安全のため、以降は両方のメンバにコピーして送られる',
      },
      {
        en: 'The port-channel stays up with one active member, and the flow is re-hashed onto fa0/2',
        ja: 'ポートチャネルは稼働中のメンバ 1 本で動き続け、フローは fa0/2 にハッシュし直される',
      },
    ],
    answer: 3,
    explanation: {
      en: 'The port-channel is one logical link; losing a member only shrinks the set the hash chooses from. In the lesson the count dropped from 2 active members to 1 and the selected member changed from fa0/1 to fa0/2.',
      ja: 'ポートチャネルは 1 本の論理リンクで、メンバが減るとハッシュの選び先が減るだけです。レッスンでは稼働中のメンバが 2 本から 1 本になり、選ばれたメンバが fa0/1 から fa0/2 に変わりました。',
    },
    taughtBy: 'ha',
  },
  {
    id: 'dnat-port-forward',
    prompt: {
      en: 'The edge router has one global address, 203.0.113.1, and a port-forwarding rule for TCP 8080. An internet host connects to 203.0.113.1:8080. Where does the router deliver it, according to the NAT table?',
      ja: '出口のルータのグローバルアドレスは 203.0.113.1 の 1 つだけで、TCP 8080 のポートフォワードが設定されています。インターネット上のホストが 203.0.113.1:8080 へ接続しました。NAT の変換表によると、ルータはどこへ届けますか？',
    },
    options: [
      {
        en: 'Nowhere: NAT only lets traffic in that answers a connection started from inside',
        ja: 'どこにも届けない。NAT は内側から始めた通信の返事しか通さない',
      },
      {
        en: 'To Client A, 192.168.1.10, on port 80 — both the address and the port are rewritten',
        ja: 'Client A（192.168.1.10）のポート 80 へ。アドレスもポートも書き換えられる',
      },
      {
        en: 'To Client A, 192.168.1.10, still on port 8080 — only the address is rewritten',
        ja: 'Client A（192.168.1.10）のポート 8080 のまま。書き換えられるのはアドレスだけ',
      },
      {
        en: 'To every inside host, and whichever listens on 8080 answers',
        ja: '内側のすべての機器へ送り、8080 で待っている機器が答える',
      },
    ],
    answer: 1,
    explanation: {
      en: 'A port-forwarding rule is destination NAT: it maps a global address and port to an inside address and port, which need not match. The lesson’s DNAT row read 192.168.1.10:80 ⇄ 203.0.113.1:8080, In a real network the same row would also turn Client A’s reply back into 203.0.113.1:8080; this lesson does not send that reply.',
      ja: 'ポートフォワードは宛先 NAT で、グローバルのアドレスとポートを内側のアドレスとポートに対応づけます。ポート番号は同じでなくてかまいません。レッスンの DNAT の行は 192.168.1.10:80 と 203.0.113.1:8080 の対応で、実際のネットワークでは、Client A の返事を 203.0.113.1:8080 に戻すのもこの行ですが、このレッスンではその返事までは送りません。',
    },
    taughtBy: 'nat',
  },
  {
    id: 'tcp-loss-recovery',
    prompt: {
      en: 'In this lesson’s trace two segments are lost. After the loss at 3001 duplicate ACKs come back; after the loss at 9001 no ACKs come back at all. Which loss sends cwnd back to one segment (1000 B)?',
      ja: 'このレッスンのトレースでは、セグメントが 2 回失われます。3001 の損失のあとは重複 ACK が返り、9001 の損失のあとは ACK がまったく返りません。`cwnd` が 1 セグメント（1000 B）まで戻るのはどちらですか？',
    },
    options: [
      {
        en: 'Only the loss at 9001: with no ACKs the retransmission timer fires, while the duplicate ACKs at 3001 trigger fast retransmit without resetting the window',
        ja: '9001 の損失だけ。ACK が返らないので再送タイマ（RTO）が切れる。3001 では重複 ACK で高速再送が起き、ウィンドウはリセットされない',
      },
      {
        en: 'Only the loss at 3001: three duplicate ACKs are the strongest sign of congestion',
        ja: '3001 の損失だけ。3 つの重複 ACK がいちばん強い輻輳の合図だから',
      },
      {
        en: 'Both: any loss sends TCP back to one segment and slow start',
        ja: '両方。どんな損失でも TCP は 1 セグメントのスロースタートに戻る',
      },
      {
        en: 'Neither: cwnd only ever halves on loss',
        ja: 'どちらでもない。損失で cwnd は半分になるだけ',
      },
    ],
    answer: 0,
    explanation: {
      en: 'Duplicate ACKs prove later segments are still arriving, so the sender retransmits at once and keeps a reduced but useful window; silence means it knows nothing, so it waits for the RTO and starts again from one segment. The lesson marks fast-retransmit at step 9, rto-fire at step 12, and ends in RTO with cwnd 1000 B.',
      ja: '重複 ACK は後ろのセグメントがまだ届いている証拠なので、送信側はすぐ再送し、減らしたうえで使えるウィンドウを保ちます。何も返らないと状況が分からないため、RTO を待って 1 セグメントからやり直します。レッスンではステップ 9 に fast-retransmit、ステップ 12 に rto-fire が記録され、最後は RTO・cwnd 1000 B で終わりました。',
    },
    taughtBy: 'tcp-congestion',
  },
  {
    id: 'tls-alpn-mismatch',
    prompt: {
      en: 'A client offers only http/1.1 in ALPN; the server is configured to accept only h2. What does the lesson’s TLS 1.3 handshake do?',
      ja: 'クライアントは ALPN で http/1.1 だけを提示し、サーバは h2 だけを受け付ける設定です。レッスンの TLS 1.3 ハンドシェイクはどうなりますか？',
    },
    options: [
      {
        en: 'The handshake completes and the connection quietly falls back to HTTP/1.1',
        ja: 'ハンドシェイクは完了し、何も言わずに HTTP/1.1 に落として通信する',
      },
      {
        en: 'The handshake completes, and the mismatch only shows up as an HTTP error afterwards',
        ja: 'ハンドシェイクは完了し、食い違いはそのあと HTTP のエラーとして現れる',
      },
      {
        en: 'The server answers the ClientHello with a fatal no_application_protocol alert, before any certificate is sent',
        ja: 'サーバは ClientHello に対して致命的な no_application_protocol アラートを返す。証明書はまだ送られていない',
      },
      {
        en: 'The certificate check fails, because the certificate names the protocol',
        ja: '証明書に使うプロトコルが書かれているので、証明書の検証で失敗する',
      },
    ],
    answer: 2,
    explanation: {
      en: 'ALPN is chosen in the ServerHello, so when there is no common protocol the server stops right after the ClientHello. The lesson’s forced mismatch showed only tls:client-hello followed by “Alert fatal no_application_protocol” — no ServerHello, certificate or application data.',
      ja: 'ALPN は ServerHello で決まるので、共通のプロトコルがなければ、サーバは ClientHello の直後に打ち切ります。レッスンで食い違わせると、tls:client-hello のあとに「Alert fatal no_application_protocol」が出ただけで、ServerHello も証明書もアプリケーションデータもありませんでした。',
    },
    taughtBy: 'https',
  },
  {
    id: 'h3-head-of-line',
    prompt: {
      en: 'A page loads four resources, /a to /d, over one connection. One packet carrying part of /b is lost. Compare what the HTTP/2 and HTTP/3 lessons show for the other three.',
      ja: '1 本の接続で 4 つのリソース /a〜/d を読み込んでいます。/b の一部を運ぶパケットが 1 つ失われました。残りの 3 つについて、HTTP/2 と HTTP/3 のレッスンが示すことを比べてください。',
    },
    options: [
      {
        en: 'In both, only /b waits; HTTP/2 streams already fixed head-of-line blocking',
        ja: 'どちらも /b だけが待つ。HTTP/2 のストリームで先頭ブロッキングはすでに解決している',
      },
      {
        en: 'Over HTTP/2 all four streams stall behind the lost TCP segment; over HTTP/3 only /b stalls and the others complete',
        ja: 'HTTP/2 では失われた TCP セグメントの後ろで 4 本とも止まる。HTTP/3 では /b だけが止まり、ほかは完了する',
      },
      {
        en: 'In both, all four stall, because they share one connection',
        ja: 'どちらも 4 本とも止まる。1 本の接続を共有しているから',
      },
      {
        en: 'Over HTTP/3 all four stall because UDP has no retransmission; HTTP/2 recovers them',
        ja: 'HTTP/3 では UDP に再送がないので 4 本とも止まる。HTTP/2 なら回復する',
      },
    ],
    answer: 1,
    explanation: {
      en: 'HTTP/2 multiplexes streams over one TCP byte stream, and TCP will not hand over later bytes until the gap is filled; QUIC orders each stream separately. With loss on, the HTTP/2 lesson showed streams 1, 3, 5 and 7 all stalled, while the HTTP/3 lesson showed only stream 4 (/b) stalled.',
      ja: 'HTTP/2 はストリームを 1 本の TCP のバイト列に混ぜて運び、TCP は欠けた部分が埋まるまで後ろのバイトを渡しません。QUIC はストリームごとに順序を管理します。ロスを起こすと、HTTP/2 のレッスンではストリーム 1・3・5・7 がすべて停止中になり、HTTP/3 のレッスンではストリーム 4（/b）だけが停止中でした。',
    },
    taughtBy: 'http3',
  },
  {
    id: 'mpls-php',
    prompt: {
      en: 'A customer packet crosses PE1 → P → PE2 with a two-label stack: a transport label on top and the VPN label 24010 below. Penultimate hop popping (PHP) is on. Which labels are on the packet when it reaches PE2?',
      ja: '顧客のパケットが PE1 → P → PE2 を 2 段のラベルで渡ります。上がトランスポートラベル、下が VPN ラベル 24010 です。PHP（最後から 2 番目のホップでの除去）が有効です。PE2 に着いたとき、パケットにはどのラベルが付いていますか？',
    },
    options: [
      {
        en: 'Only the VPN label 24010, which tells PE2 which VRF the packet belongs to',
        ja: 'VPN ラベル 24010 だけ。PE2 はこれで、どの VRF のパケットかを知る',
      },
      {
        en: 'Both labels; PE2 pops the transport label itself',
        ja: '2 つとも。トランスポートラベルは PE2 自身が外す',
      },
      {
        en: 'No labels; P removes the whole stack and forwards plain IP',
        ja: 'ラベルは何もない。P がスタックをすべて外し、ただの IP パケットとして送る',
      },
      {
        en: 'Only the transport label; the VPN label was removed at PE1',
        ja: 'トランスポートラベルだけ。VPN ラベルは PE1 で外されている',
      },
    ],
    answer: 0,
    explanation: {
      en: 'With PHP, PE2 advertises the reserved label 3 (“implicit null”), so P — the router before the egress PE — pops the transport label, saving PE2 a lookup; the VPN label must survive to pick the VRF. The lesson reads “Labels P → PE2: 24010”. With PHP off, P swaps its own label 16001 for PE2’s 16002 and the lesson reads “16002 / 24010”.',
      ja: 'PHP では PE2 が予約ラベル 3（implicit null）を知らせるので、出口 PE の 1 つ手前の P がトランスポートラベルを外し、PE2 の検索が 1 回減ります。VRF を選ぶための VPN ラベルは残らなければなりません。レッスンでは「ラベル P → PE2: 24010」と表示されます。PHP を無効にすると、P は自分のラベル 16001 を PE2 の 16002 に付け替え、「16002 / 24010」になります。',
    },
    taughtBy: 'mpls',
  },
  {
    id: 'evpn-arp-suppression',
    prompt: {
      en: 'Host A, behind Leaf1, sends an ARP request for 10.10.0.20 (Host B, behind Leaf2). Leaf1 has already learned Host B’s MAC and IP from an EVPN Type-2 route, and ARP suppression is on. What happens?',
      ja: 'Leaf1 の配下にいる Host A が、10.10.0.20（Leaf2 の配下の Host B）の ARP 要求を出します。Leaf1 は EVPN の Type-2 経路で Host B の MAC と IP をすでに学習しており、ARP 抑止は有効です。何が起きますか？',
    },
    options: [
      {
        en: 'The request is flooded across the fabric to every VTEP in VNI 10000, and Host B replies',
        ja: '要求は VNI 10000 のすべての VTEP へファブリック越しにフラッディングされ、Host B が答える',
      },
      {
        en: 'Leaf1 answers using the Type-5 route for 10.10.0.0/24',
        ja: 'Leaf1 が 10.10.0.0/24 の Type-5 経路を使って答える',
      },
      {
        en: 'The request is dropped, because ARP is not carried over VXLAN',
        ja: 'VXLAN では ARP を運べないので、要求は捨てられる',
      },
      {
        en: 'Leaf1 answers locally with Host B’s MAC from the Type-2 route, so the request does not cross the fabric',
        ja: 'Leaf1 が Type-2 経路で得た Host B の MAC でその場で答えるので、要求はファブリックを渡らない',
      },
    ],
    answer: 3,
    explanation: {
      en: 'A Type-2 route carries a host’s MAC and IP, which is exactly what an ARP reply needs; a Type-5 route carries only a prefix. The lesson showed “ARP suppression hit: 02:00:00:00:00:0b”, the MAC in the Type-2 route, and “miss: flood” once suppression was turned off.',
      ja: 'Type-2 経路はホストの MAC と IP を運ぶので、ARP の応答に必要な情報がそろっています。Type-5 経路が運ぶのはプレフィックスだけです。レッスンでは「ARP 抑止でヒット: 02:00:00:00:00:0b」と Type-2 経路の MAC が表示され、抑止を無効にすると「ミス: フラッディングします」に変わりました。',
    },
    taughtBy: 'vxlan',
  },
];

export const EXAM_LEVEL_3: ExamLevel = {
  level: 3,
  title: { en: 'Level 3 · Advanced', ja: 'レベル 3・上級' },
  summary: {
    en: 'How production networks behave: multipath, failover, congestion, modern HTTP and overlays.',
    ja: '実運用のネットワークのふるまい。複数経路、障害時の切り替え、輻輳、最近の HTTP、オーバーレイ。',
  },
  path: PATH,
  questions: QUESTIONS,
};
