/**
 * Wave B of the question pools (REQ-194): a second question for the slots of
 * levels 2, 3, 4 and 8, and a third for every slot of all eight levels, keyed
 * by the id of the slot's original question. Arithmetic answers are checked in
 * `examPoolB.test.ts`.
 */
import type { ExamQuestion } from './examQuestions';

const ENTRIES: readonly (readonly [string, ExamQuestion])[] = [
  [
    'vlan-same-switch',
    {
      id: 'l2-vlan-two-switches',
      prompt: {
        en: 'A1 (VLAN 10) is on SW1 and A3 (VLAN 10) on SW2. The trunk between SW1 and SW2 carries VLAN 10. A1 sends to A3. Is a router needed?',
        ja: 'A1（VLAN 10）は SW1、A3（VLAN 10）は SW2 にいます。SW1 と SW2 の間のトランクは VLAN 10 を運びます。A1 が A3 に送ります。ルータは要りますか？',
      },
      options: [
        { en: 'Yes, R1 must route it', ja: '要る。R1 が中継する' },
        { en: 'No, it cannot arrive', ja: '要らないが届かない' },
        { en: 'No, over the tagged trunk', ja: '要らない。トランクで届く' },
        { en: 'Yes, switches can never join', ja: '要る。スイッチはつながらない' },
      ],
      answer: 2,
      explanation: {
        en: 'Both are in VLAN 10, one network, and the trunk carries VLAN 10 tagged between the switches, so no router is needed. The VLAN lesson defines the trunk this way.',
        ja: '2 台とも VLAN 10 で同じネットワークです。トランクが VLAN 10 をタグ付きで運ぶので、ルータは要りません。VLAN のレッスンでトランクをこう説明しています。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    'stp-root',
    {
      id: 'l2-stp-tie',
      prompt: {
        en: 'Three switches all keep the default priority 32768. Which one becomes the root bridge?',
        ja: '3 台のスイッチはどれも初期値の優先度 32768 のままです。ルートブリッジになるのはどれですか？',
      },
      options: [
        { en: 'The highest MAC address', ja: 'MAC がいちばん大きいもの' },
        { en: 'The first switched on', ja: '最初に電源を入れたもの' },
        { en: 'The one with most links', ja: 'リンクがいちばん多いもの' },
        { en: 'The lowest MAC address', ja: 'MAC がいちばん小さいもの' },
      ],
      answer: 3,
      explanation: {
        en: 'The bridge ID is priority then MAC, and the lowest wins: with equal priorities the lowest MAC decides (IEEE 802.1D). The spanning-tree lesson shows each bridge ID.',
        ja: 'ブリッジ ID は「優先度、次に MAC」で、小さいほうが勝ちます。優先度が同じなら MAC の小さいものがルートです（IEEE 802.1D）。スパニングツリーのレッスンで各ブリッジ ID が見られます。',
      },
      taughtBy: 'stp',
    },
  ],
  [
    'bgp-local-pref-exit',
    {
      id: 'l2-bgp-as-path',
      prompt: {
        en: 'A router has two BGP routes to the same network, both with LOCAL_PREF 100. One has AS_PATH 65010 65040, the other 65020 65030 65040. Which does it use?',
        ja: 'ルータは同じネットワークへの BGP 経路を 2 つ持ち、どちらも LOCAL_PREF 100 です。AS_PATH は一方が 65010 65040、もう一方が 65020 65030 65040 です。どちらを使いますか？',
      },
      options: [
        { en: 'The one with two ASes', ja: 'AS が 2 つの経路' },
        { en: 'The one with three ASes', ja: 'AS が 3 つの経路' },
        { en: 'Both, half each', ja: '両方を半分ずつ' },
        { en: 'Whichever came first', ja: '先に届いた経路' },
      ],
      answer: 0,
      explanation: {
        en: 'With LOCAL_PREF equal, the shorter AS_PATH wins (RFC 4271 §9.1). The dynamic routing lesson compares the paths this way.',
        ja: 'LOCAL_PREF が同じなら、短い AS_PATH が勝ちます（RFC 4271 §9.1）。動的ルーティングのレッスンで、この比べ方が見られます。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'stateful-firewall-reply',
    {
      id: 'l2-stateful-new-inbound',
      prompt: {
        en: 'A stateful firewall lets in only replies to connections started inside. An outside host opens a new connection to an inside server on TCP 443 that nobody inside started. What happens?',
        ja: 'ステートフルなファイアウォールは、内側から始めた接続への返事だけを通します。外の機器が、内側のだれも始めていない接続を内側のサーバの TCP 443 に開きます。どうなりますか？',
      },
      options: [
        { en: 'It is let in, port 443', ja: '通る。443 だから' },
        { en: 'It is refused', ja: '通らない（拒否される）' },
        { en: 'Only the first packet', ja: '最初の 1 つだけ通る' },
        { en: 'It is let in once', ja: '一度だけ通る' },
      ],
      answer: 1,
      explanation: {
        en: 'Only traffic that belongs to a connection started from inside is let back in; a new connection from outside is refused. The ACL lesson’s return-traffic button shows the difference.',
        ja: '通すのは、内側から始めた接続に属する通信だけです。外から始めた新しい接続は止められます。ACL のレッスンの「戻りの通信」のボタンで違いが見られます。',
      },
      taughtBy: 'acl',
    },
  ],
  [
    'rip-vs-ospf',
    {
      id: 'l2-rip-hops',
      prompt: {
        en: 'Path X to a network crosses 2 routers over slow links; path Y crosses 3 routers over fast links. Which path does RIP choose?',
        ja: 'あるネットワークへの道 X は遅いリンクでルータ 2 台、道 Y は速いリンクでルータ 3 台を通ります。RIP はどちらを選びますか？',
      },
      options: [
        { en: 'Y, the faster links', ja: 'Y。リンクが速い' },
        { en: 'Both, shared', ja: '両方を分けて使う' },
        { en: 'X, fewer hops', ja: 'X。ホップが少ない' },
        { en: 'Neither, no cost set', ja: 'どちらも。コスト未設定' },
      ],
      answer: 2,
      explanation: {
        en: 'RIP counts hops only and ignores link speed, so the 2-router path wins. OSPF would add link costs instead. The dynamic routing lesson contrasts the two.',
        ja: 'RIP はホップ数だけを数え、リンクの速さは見ないので、ルータ 2 台の道を選びます。OSPF ならリンクのコストを足します。動的ルーティングのレッスンで 2 つを比べています。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'ospf-reconverge',
    {
      id: 'l2-ospf-restore',
      prompt: {
        en: 'R1 moved its traffic to the higher-cost path through R3 when a link failed. The failed link comes back up. What does R1 do?',
        ja: 'リンクが切れたとき、R1 はコストの高い R3 経由の道に切り替えました。そのリンクが復旧します。R1 はどうしますか？',
      },
      options: [
        { en: 'Stays on R3 for good', ja: 'R3 経由のまま' },
        { en: 'Waits for a person', ja: '人の操作を待つ' },
        { en: 'Drops its traffic for a while', ja: 'しばらく捨てる' },
        { en: 'Returns to the cheaper path', ja: '安い道に戻す' },
      ],
      answer: 3,
      explanation: {
        en: 'OSPF recalculates on every change, so when the link returns R1 goes back to the lower-cost path by itself. The OSPF convergence lesson lets you fail and restore the link.',
        ja: 'OSPF は変化のたびに計算し直すので、リンクが戻ると R1 は自分でコストの低い道に戻ります。OSPF の収束のレッスンで、リンクを切って戻せます。',
      },
      taughtBy: 'ospf',
    },
  ],
  [
    'mtu-df',
    {
      id: 'l2-mtu-fragments',
      prompt: {
        en: 'Host A pings with a 1200-byte payload and DF clear. With the IP header (20) and ICMP header (8) the packet is 1228 bytes. R1’s next link has MTU 604. How many fragments leave R1?',
        ja: 'Host A が DF を立てずに 1200 バイトの ping を送ります。IP ヘッダ（20）と ICMP ヘッダ（8）を足すとパケットは 1228 バイトです。R1 の次のリンクの MTU は 604 です。R1 から出る断片はいくつですか？',
      },
      options: [
        { en: '2 fragments', ja: '2 つに分ける' },
        { en: '3 fragments', ja: '3 つに分ける' },
        { en: '4 fragments', ja: '4 つに分ける' },
        { en: '1, cut short', ja: '1 つ（切り詰め）' },
      ],
      answer: 1,
      explanation: {
        en: 'Each fragment carries at most 584 bytes of data (604 − 20, a multiple of 8), and 1208 bytes of data need 584 + 584 + 40: three fragments. The MTU lesson counts them.',
        ja: '断片 1 つに入るデータは最大 584 バイト（604 − 20、8 の倍数）で、1208 バイトのデータは 584 + 584 + 40 の 3 つになります。MTU のレッスンで数えられます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    'acl-default-deny',
    {
      id: 'l2-acl-order',
      prompt: {
        en: 'An ACL reads: 1) deny TCP 80 from 10.0.0.5; 2) permit TCP 80 from any. The host 10.0.0.5 opens a web connection on port 80. What happens?',
        ja: 'ACL は次のとおりです：1）10.0.0.5 からの TCP 80 を拒否、2）どこからでも TCP 80 を許可。10.0.0.5 が 80 番で Web に接続します。どうなりますか？',
      },
      options: [
        { en: 'It is denied by line 1', ja: '1 行目で拒否される' },
        { en: 'It is let in by line 2', ja: '2 行目で許可される' },
        { en: 'Both apply, so it is logged', ja: '両方当たり記録だけ' },
        { en: 'It is denied at the server', ja: 'サーバで拒否される' },
      ],
      answer: 0,
      explanation: {
        en: 'An ACL is read from the top and the first matching line decides; line 1 matches, so line 2 is never reached. The ACL lesson lists its rules in this order.',
        ja: 'ACL は上から読み、最初に当たった行で決まります。1 行目に当たるので、2 行目までは進みません。ACL のレッスンでも、ルールをこの順に並べています。',
      },
      taughtBy: 'acl',
    },
  ],
  [
    'dhcp-order',
    {
      id: 'l2-dhcp-discover-dst',
      prompt: {
        en: 'A laptop with no address sends a DHCP DISCOVER. Which destination IP address does it use?',
        ja: 'アドレスを持たないノートパソコンが DHCP DISCOVER を送ります。宛先の IP アドレスは何ですか？',
      },
      options: [
        { en: 'The router’s address', ja: 'ルータのアドレス' },
        { en: '0.0.0.0, no address', ja: '0.0.0.0（未設定）' },
        { en: 'The DHCP server’s', ja: 'DHCP サーバ自身のアドレス' },
        { en: '255.255.255.255', ja: '255.255.255.255' },
      ],
      answer: 3,
      explanation: {
        en: 'It knows no server yet, so it sends to everyone, 255.255.255.255, from 0.0.0.0 (RFC 2131). The DHCP and DNS lesson shows the DISCOVER going to all.',
        ja: 'まだサーバを知らないので、送り主 0.0.0.0 から全員あての 255.255.255.255 に送ります（RFC 2131）。DHCP と DNS のレッスンで、DISCOVER が全員に届く様子が見られます。',
      },
      taughtBy: 'dhcp',
    },
  ],
  [
    'ipv6-dual-stack',
    {
      id: 'l2-ipv6-ndp',
      prompt: {
        en: 'Before its first IPv6 echo, the Client must find R1’s MAC for 2001:db8:1::1. What does it send, and to where?',
        ja: '最初の IPv6 の Echo の前に、Client は 2001:db8:1::1 にあたる R1 の MAC を調べます。何を、どこへ送りますか？',
      },
      options: [
        { en: 'An ARP request, to all', ja: 'ARP 要求を全員へ' },
        { en: 'An NS, to its group address', ja: 'NS をその宛先グループへ' },
        { en: 'An echo, straight to R1', ja: 'Echo を R1 へ' },
        { en: 'Nothing, it knows the MAC already', ja: '何も送らない。もう知っている' },
      ],
      answer: 1,
      explanation: {
        en: 'IPv6 has no ARP: a Neighbor Solicitation goes to the target’s solicited-node multicast address, ff02::1:ff00:1 (RFC 4861). The IPv6 lesson’s list shows this NS on the first send.',
        ja: 'IPv6 に ARP はありません。相手の solicited-node マルチキャストアドレス ff02::1:ff00:1 へ Neighbor Solicitation を送ります（RFC 4861）。IPv6 のレッスンの一覧で、最初の送信のこの NS が見られます。',
      },
      taughtBy: 'ipv6',
    },
  ],
  [
    'ecmp-flow-hash',
    {
      id: 'l3-ecmp-same-flow',
      prompt: {
        en: 'Leaf A has two equal-cost routes to a server. One TCP connection sends 100 packets. Which way do they go?',
        ja: 'Leaf A にはサーバへの同じコストの経路が 2 つあります。1 つの TCP 接続が 100 個のパケットを送ります。どこを通りますか？',
      },
      options: [
        { en: 'All by one spine', ja: '全部が片方の Spine' },
        { en: 'Alternating, 50 each', ja: '交互に 50 個ずつ通る' },
        { en: 'All by both, copied', ja: '両方に複製して送る' },
        { en: 'Whichever is idle', ja: '空いているほうを通る' },
      ],
      answer: 0,
      explanation: {
        en: 'ECMP hashes each flow to one path, so the packets of one connection stay on one spine and arrive in order. The ECMP lesson shows a flow keeping its spine.',
        ja: 'ECMP はフローごとに 1 つの道を選ぶので、1 つの接続のパケットは同じ Spine を通り、順番どおりに届きます。ECMP のレッスンで、フローが Spine を変えない様子が見られます。',
      },
      taughtBy: 'ecmp',
    },
  ],
  [
    'ospf-remote-failure',
    {
      id: 'l3-ospf-lsa-flood',
      prompt: {
        en: 'The link between R2 and R4 fails. R1 is not on that link. How does R1 learn of the failure?',
        ja: 'R2 と R4 の間のリンクが切れます。R1 はそのリンクにつながっていません。R1 はどうやって知りますか？',
      },
      options: [
        { en: 'It pings every link in turn', ja: '全リンクに順に ping する' },
        { en: 'An admin tells it', ja: '管理者が R1 に教える' },
        { en: 'R2 and R4 flood new LSAs', ja: 'R2・R4 が LSA を流す' },
        { en: 'It cannot learn it', ja: '知ることはできない' },
      ],
      answer: 2,
      explanation: {
        en: 'The routers on the failed link flood new link-state advertisements, and every router recomputes from them (RFC 2328). The OSPF convergence lesson shows R1 changing route by itself.',
        ja: '切れたリンクのルータが新しい LSA を流し、すべてのルータがそれをもとに計算し直します（RFC 2328）。OSPF の収束のレッスンで、R1 が自分で経路を変える様子が見られます。',
      },
      taughtBy: 'ospf-convergence',
    },
  ],
  [
    'vrrp-failover',
    {
      id: 'l3-vrrp-virtual-mac',
      prompt: {
        en: 'R1 and R2 share the virtual gateway 10.10.0.1 as VRRP group 10. Which MAC address do the hosts use for 10.10.0.1?',
        ja: 'R1 と R2 は、VRRP グループ 10 として仮想ゲートウェイ 10.10.0.1 を共有しています。ホストは 10.10.0.1 にどの MAC を使いますか？',
      },
      options: [
        { en: 'R1’s own MAC', ja: 'R1 自身の MAC' },
        { en: 'R2’s own MAC', ja: 'R2 自身の MAC' },
        { en: 'ff:ff:ff:ff:ff:ff', ja: 'ff:ff:ff:ff:ff:ff' },
        { en: '00:00:5e:00:01:0a', ja: '00:00:5e:00:01:0a' },
      ],
      answer: 3,
      explanation: {
        en: 'VRRP gives the group a virtual MAC, 00:00:5e:00:01 plus the group number (10 = 0a), so it does not change when the master changes (RFC 5798). The gateway HA lesson shows this MAC.',
        ja: 'VRRP はグループに仮想 MAC（00:00:5e:00:01 ＋ グループ番号、10 は 0a）を与えるので、マスターが変わっても変わりません（RFC 5798）。ゲートウェイ冗長のレッスンでこの MAC が見られます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'lacp-member-failure',
    {
      id: 'l3-lacp-hash-stable',
      prompt: {
        en: 'A two-link LACP bundle carries many flows. One flow is sent twice while both links stay up. Which link does it use the second time?',
        ja: '2 本の LACP バンドルが多くのフローを運んでいます。両方のリンクが生きたまま、1 つのフローを 2 回送ります。2 回目はどちらのリンクを使いますか？',
      },
      options: [
        { en: 'The other link, to share', ja: '分けるためもう一方' },
        { en: 'Both, a copy on each', ja: '両方に 1 つずつ' },
        { en: 'The same link as before', ja: '前と同じリンク' },
        { en: 'The emptier link', ja: '空いているリンク' },
      ],
      answer: 2,
      explanation: {
        en: 'Members are chosen by hashing the flow, so the same flow lands on the same member each time. The gateway HA lesson names the member a flow uses.',
        ja: 'メンバーはフローのハッシュで決まるので、同じフローは毎回同じメンバーを通ります。ゲートウェイ冗長のレッスンで、フローが使うメンバーが表示されます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'dnat-port-forward',
    {
      id: 'l3-pat-two-clients',
      prompt: {
        en: 'Behind one global address, Client A and Client B both connect to the same web server from source port 40000. How does the router tell the replies apart?',
        ja: '1 つのグローバルアドレスの内側で、Client A と Client B がどちらも送信元ポート 40000 から同じ Web サーバに接続します。ルータは返事をどう見分けますか？',
      },
      options: [
        { en: 'By the client’s MAC', ja: 'クライアントの MAC で' },
        { en: 'It cannot, so one is lost', ja: '見分けられず片方が消える' },
        { en: 'By different public ports', ja: '別々の外側ポートで' },
        { en: 'By the reply’s TTL', ja: '返事の TTL で' },
      ],
      answer: 2,
      explanation: {
        en: 'PAT gives each conversation its own public port, so the replies come back to different ports and the table maps each to its client. The NAT lesson shows two rows sharing one address.',
        ja: 'PAT は会話ごとに別の外側ポートを割り当てるので、返事は別々のポートに戻り、表でそれぞれのクライアントに戻せます。NAT のレッスンで、1 つのアドレスを分け合う 2 行が見られます。',
      },
      taughtBy: 'nat',
    },
  ],
  [
    'tcp-loss-recovery',
    {
      id: 'l3-fast-retransmit-trigger',
      prompt: {
        en: 'A TCP sender sees duplicate ACKs for the same byte. After how many does it resend the missing segment without waiting for its timer?',
        ja: 'TCP の送り手が、同じバイトへの重複 ACK を受け取ります。何個で、タイマーを待たずに欠けたセグメントを再送しますか？',
      },
      options: [
        { en: '1 duplicate ACK', ja: '重複 ACK 1 個' },
        { en: '2 duplicate ACKs', ja: '重複 ACK 2 個' },
        { en: '3 duplicate ACKs', ja: '重複 ACK 3 個' },
        { en: '10 duplicate ACKs', ja: '重複 ACK 10 個' },
      ],
      answer: 2,
      explanation: {
        en: 'Three duplicate ACKs trigger fast retransmit (RFC 5681 §3.2). The TCP congestion lesson marks the third duplicate ACK in its trace.',
        ja: '重複 ACK が 3 個で高速再送が始まります（RFC 5681 §3.2）。TCP 輻輳制御のレッスンのトレースに、3 個目の重複 ACK が示されます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    'igmp-snooping-ports',
    {
      id: 'l3-igmp-two-members',
      prompt: {
        en: 'Four hosts share one snooping switch in VLAN 10. Hosts on ports 2 and 4 have joined 239.1.1.1. The host on port 1 sends to that group. Out of which ports does it go?',
        ja: 'IGMP スヌーピングをする 1 台のスイッチに、VLAN 10 の 4 台がつながっています。ポート 2 と 4 の機器が 239.1.1.1 に参加しています。ポート 1 の機器がそのグループへ送ります。どのポートから出ますか？',
      },
      options: [
        { en: 'Ports 2 and 4', ja: 'ポート 2 と 4' },
        { en: 'Ports 2, 3 and 4', ja: 'ポート 2、3、4' },
        { en: 'Port 2 only', ja: 'ポート 2 だけ' },
        { en: 'No port at all', ja: 'どこからも出ない' },
      ],
      answer: 0,
      explanation: {
        en: 'Snooping sends a learned group only to the ports that joined it (RFC 4541). The multicast lesson shows non-members getting nothing.',
        ja: 'スヌーピングは、覚えたグループを参加したポートにだけ送ります（RFC 4541）。マルチキャストのレッスンで、参加していない機器には届かない様子が見られます。',
      },
      taughtBy: 'multicast',
    },
  ],
  [
    'h3-head-of-line',
    {
      id: 'l3-h3-transport',
      prompt: { en: 'Which transport does HTTP/3 run over?', ja: 'HTTP/3 は何の上で動きますか？' },
      options: [
        { en: 'TCP, port 443', ja: 'TCP の 443 番ポート' },
        { en: 'QUIC over UDP', ja: 'UDP の上の QUIC' },
        { en: 'Plain IP', ja: 'IP の上に直接' },
        { en: 'TLS over TCP', ja: 'TCP の上の TLS' },
      ],
      answer: 1,
      explanation: {
        en: 'HTTP/3 runs over QUIC, which runs over UDP, so one lost packet holds up only its own stream (RFC 9114). The HTTP/3 lesson compares this with HTTP/2 over TCP.',
        ja: 'HTTP/3 は UDP の上の QUIC で動くので、失われたパケットは自分のストリームだけを待たせます（RFC 9114）。HTTP/3 のレッスンで、TCP の上の HTTP/2 と比べています。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    'mpls-php',
    {
      id: 'l3-mpls-p-reads',
      prompt: {
        en: 'A labelled packet crosses the P router in the middle of the MPLS core. What does P look at to forward it?',
        ja: 'ラベル付きのパケットが、MPLS コアの中央にある P ルータを通ります。P は何を見て転送しますか？',
      },
      options: [
        { en: 'The inner IP address', ja: '中の IP アドレス' },
        { en: 'The top label only', ja: 'いちばん上のラベルだけ' },
        { en: 'The VPN label', ja: 'VPN ラベル' },
        { en: 'The source MAC', ja: 'フレームの送信元 MAC' },
      ],
      answer: 1,
      explanation: {
        en: 'A label switch router forwards on the top label alone and swaps it; it never reads the IP packet inside (RFC 3031). The MPLS lesson shows P touching only the transport label.',
        ja: 'ラベルスイッチルータは、いちばん上のラベルだけを見て付け替えます。中の IP パケットは読みません（RFC 3031）。MPLS のレッスンで、P が転送用ラベルだけを扱う様子が見られます。',
      },
      taughtBy: 'mpls',
    },
  ],
  [
    'evpn-arp-suppression',
    {
      id: 'l3-vxlan-port',
      prompt: {
        en: 'Leaf1 carries Host A’s frame across the fabric to Leaf2 in VXLAN. How is the frame carried?',
        ja: 'Leaf1 は Host A のフレームを、VXLAN でファブリックを越えて Leaf2 へ運びます。フレームはどう運ばれますか？',
      },
      options: [
        { en: 'Inside UDP to port 4789', ja: 'UDP の 4789 番の中' },
        { en: 'Inside TCP, to port 179', ja: 'TCP の 179 番ポートの中' },
        { en: 'As a plain frame', ja: 'そのままのフレーム' },
        { en: 'Inside GRE, number 47', ja: 'GRE（47 番）の中' },
      ],
      answer: 0,
      explanation: {
        en: 'VXLAN wraps the whole Ethernet frame in UDP to port 4789, with the VNI in its header (RFC 7348). The VXLAN lesson shows the outer UDP header.',
        ja: 'VXLAN はイーサネットのフレームを丸ごと UDP の 4789 番に包み、ヘッダに VNI を書きます（RFC 7348）。VXLAN のレッスンで、外側の UDP ヘッダが見られます。',
      },
      taughtBy: 'vxlan',
    },
  ],
  [
    'ecmp-exact-split',
    {
      id: 'l4-ecmp-hash-inputs',
      prompt: {
        en: 'A router hashes flows across two equal-cost routes. Which fields usually go into the hash?',
        ja: 'ルータは、同じコストの 2 つの経路にフローをハッシュで分けます。ハッシュにふつう使う項目はどれですか？',
      },
      options: [
        { en: 'The TTL and the length', ja: 'TTL と長さ' },
        { en: 'The time each packet arrived', ja: 'パケットが届いた時刻だけ' },
        { en: 'Addresses, protocol, ports', ja: 'アドレス・種類・ポート' },
        { en: 'The source MAC only', ja: '送信元 MAC だけ' },
      ],
      answer: 2,
      explanation: {
        en: 'The five-tuple (source and destination address, protocol, source and destination port) names a flow, so hashing it keeps a flow on one path. The ECMP lesson’s flows differ only in source port.',
        ja: '5 つ組（送信元と宛先のアドレス、種類、送信元と宛先のポート）がフローを表すので、それをハッシュすればフローは 1 つの道に留まります。ECMP のレッスンのフローは送信元ポートだけが違います。',
      },
      taughtBy: 'ecmp',
    },
  ],
  [
    'mtu-slider-floor-df',
    {
      id: 'l4-mtu-fragment-offset',
      prompt: {
        en: 'A packet is cut into fragments whose first carries 584 bytes of data. What value is in the second fragment’s offset field?',
        ja: 'パケットが分割され、最初の断片は 584 バイトのデータを運びます。2 つ目の断片のオフセット欄の値はいくつですか？',
      },
      options: [
        { en: '584', ja: '584' },
        { en: '73', ja: '73' },
        { en: '604', ja: '604' },
        { en: '292', ja: '292' },
      ],
      answer: 1,
      explanation: {
        en: 'The offset counts in units of 8 bytes: 584 ÷ 8 = 73 (RFC 791). The MTU lesson lists each fragment’s offset.',
        ja: 'オフセットは 8 バイト単位で数えます。584 ÷ 8 = 73 です（RFC 791）。MTU のレッスンで、各断片のオフセットが並びます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    'ha-fail-fail-restore',
    {
      id: 'l4-ha-arp-unchanged',
      prompt: {
        en: 'Hosts have 10.10.0.1’s virtual MAC in their ARP caches. R1, the master, fails and R2 takes over. What must the hosts do?',
        ja: 'ホストは 10.10.0.1 の仮想 MAC を ARP キャッシュに持っています。マスターの R1 が止まり、R2 が引き継ぎます。ホストは何をしますか？',
      },
      options: [
        { en: 'Ask ARP again for R2', ja: 'R2 の MAC を聞き直す' },
        { en: 'Change the gateway', ja: 'ゲートウェイを変える' },
        { en: 'Nothing at all', ja: '何もしなくてよい' },
        { en: 'Restart their network', ja: 'ネットワークを再起動' },
      ],
      answer: 2,
      explanation: {
        en: 'The virtual address and MAC move to R2, so the hosts’ entries stay right and they change nothing. The gateway HA lesson shows the same virtual MAC after a failover.',
        ja: '仮想アドレスと仮想 MAC が R2 に移るので、ホストの記録は正しいままで、何も変えません。ゲートウェイ冗長のレッスンで、切り替え後も同じ仮想 MAC なのが見られます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'ospf-bgp-transit-link',
    {
      id: 'l4-igp-vs-egp',
      prompt: {
        en: 'Inside one company’s network, which protocol finds the paths between the company’s own routers, and which carries routes to other companies?',
        ja: '1 つの会社のネットワークの中で、自社のルータ間の道を見つけるのはどのプロトコルで、他社への経路を運ぶのはどれですか？',
      },
      options: [
        { en: 'BGP inside, OSPF outside', ja: '内は BGP、外は OSPF' },
        { en: 'OSPF inside, BGP outside', ja: '内は OSPF、外は BGP' },
        { en: 'OSPF for both', ja: 'どちらも OSPF' },
        { en: 'RIP for both', ja: 'どちらも RIP' },
      ],
      answer: 1,
      explanation: {
        en: 'OSPF is an interior protocol for one network’s own routers; BGP exchanges routes between autonomous systems (RFC 4271). The dynamic routing lesson runs both.',
        ja: 'OSPF は 1 つのネットワークの中のルータどうしで使い、BGP は自律システムの間で経路を交換します（RFC 4271）。動的ルーティングのレッスンで両方が動きます。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'ospf-reconverged-metrics',
    {
      id: 'l4-ospf-metric-sum',
      prompt: {
        en: 'R1 reaches a LAN through R2 and R4. The link costs are R1–R2 1, R2–R4 1 and R4’s LAN 1. What metric does R1 show?',
        ja: 'R1 は R2 と R4 を通って LAN に届きます。リンクのコストは R1–R2 が 1、R2–R4 が 1、R4 の LAN が 1 です。R1 に出る値はいくつですか？',
      },
      options: [
        { en: '1', ja: '1' },
        { en: '2', ja: '2' },
        { en: '3', ja: '3' },
        { en: '4', ja: '4' },
      ],
      answer: 2,
      explanation: {
        en: 'OSPF adds the cost of every outgoing link on the way: 1 + 1 + 1 = 3. The OSPF convergence lesson shows each route’s metric.',
        ja: 'OSPF は道の途中で出ていくリンクのコストをすべて足します。1 + 1 + 1 = 3 です。OSPF の収束のレッスンで各経路の値が見られます。',
      },
      taughtBy: 'ospf-convergence',
    },
  ],
  [
    'nat-port-order',
    {
      id: 'l4-pat-port-sequence',
      prompt: {
        en: 'In the NAT lesson the router gives out public ports in order from 1024. From an empty table, three clients each start one connection. Which ports do they get?',
        ja: 'NAT のレッスンのルータは、外側のポートを 1024 から順に割り当てます。空の表から、3 台のクライアントが 1 つずつ接続を始めます。割り当てられるポートは？',
      },
      options: [
        { en: '1024, 1025, 1026', ja: '1024、1025、1026' },
        { en: '1024, 1024, 1024', ja: '1024、1024、1024' },
        { en: '1025, 1026, 1027', ja: '1025、1026、1027' },
        { en: 'Their own ports', ja: '元のポートのまま' },
      ],
      answer: 0,
      explanation: {
        en: 'Each new conversation takes the next free port, starting at 1024, as the guide and the NAT lesson say.',
        ja: '新しい会話ごとに、1024 から順に空いているポートを使います。ガイドと NAT のレッスンにそう書かれています。',
      },
      taughtBy: 'nat',
    },
  ],
  [
    'stp-two-priorities',
    {
      id: 'l4-stp-root-ports',
      prompt: {
        en: 'On the root bridge of a triangle of switches, which of its ports does spanning tree block?',
        ja: '3 台のスイッチの三角形で、ルートブリッジのポートのうち、スパニングツリーが止めるのはどれですか？',
      },
      options: [
        { en: 'The one to the farthest', ja: 'いちばん遠い側' },
        { en: 'Both of its ports', ja: '両方のポート' },
        { en: 'None of them', ja: 'どれも止めない' },
        { en: 'The one with higher MAC', ja: 'MAC の大きい側' },
      ],
      answer: 2,
      explanation: {
        en: 'All ports of the root bridge are designated ports and forward; the block is on a link between the other two (IEEE 802.1D). The spanning-tree lesson shows the blocked end away from the root.',
        ja: 'ルートブリッジのポートはすべて指定ポートで、転送します。止めるのは残り 2 台の間のリンクです（IEEE 802.1D）。スパニングツリーのレッスンで、止まる端がルートから離れているのが見られます。',
      },
      taughtBy: 'stp',
    },
  ],
  [
    'qos-bandwidth-for-target',
    {
      id: 'l4-qos-serialization',
      prompt: {
        en: 'A 1500-byte packet is sent on a 1 Mbps link. How long does sending it onto the link take?',
        ja: '1500 バイトのパケットを 1 Mbps のリンクに送ります。リンクに送り出すのにかかる時間は？',
      },
      options: [
        { en: '1.5 ms', ja: '1.5 ms' },
        { en: '12 ms', ja: '12 ms' },
        { en: '15 ms', ja: '15 ms' },
        { en: '8 ms', ja: '8 ms' },
      ],
      answer: 1,
      explanation: {
        en: '1500 bytes are 12 000 bits, and 12 000 ÷ 1 000 000 per second is 12 ms. The per-link QoS lesson splits crossing time into sending and propagation.',
        ja: '1500 バイトは 12 000 ビットで、毎秒 1 000 000 ビットなら 12 ms かかります。リンクごとの QoS のレッスンで、送り出す時間と伝わる時間を分けて示します。',
      },
      taughtBy: 'link-qos',
    },
  ],
  [
    'wifi-distance-loss',
    {
      id: 'l4-wifi-closer',
      prompt: {
        en: 'In the wireless lesson a station is moved from 100 m to 20 m from the access point. What happens to its RSSI?',
        ja: '無線のレッスンで、端末をアクセスポイントから 100 m の位置から 20 m に近づけます。RSSI はどうなりますか？',
      },
      options: [
        { en: 'It stays the same', ja: 'まったく変わらない' },
        { en: 'Weaker, and more negative', ja: '弱くなる（マイナスが大きい）' },
        { en: 'It drops to zero', ja: '0 になって切れる' },
        { en: 'Stronger, less negative', ja: '強くなる（マイナスが小さい）' },
      ],
      answer: 3,
      explanation: {
        en: 'Signal falls with distance, so moving closer raises the RSSI toward 0 dBm. The wireless lesson’s distance slider shows the reading change.',
        ja: '信号は距離とともに弱まるので、近づけると RSSI は 0 dBm に近づきます。無線のレッスンの距離のスライダーで、値の変化が見られます。',
      },
      taughtBy: 'wireless',
    },
  ],
  [
    'tcp-third-dupack-state',
    {
      id: 'l4-fast-recovery-ssthresh',
      prompt: {
        en: 'MSS is 1000 bytes. 8000 bytes are in flight when the third duplicate ACK arrives. What does ssthresh become?',
        ja: 'MSS は 1000 バイトです。3 個目の重複 ACK が届いたとき、8000 バイトが送信中です。ssthresh はいくつになりますか？',
      },
      options: [
        { en: '2000 bytes', ja: '2000 バイト' },
        { en: '4000 bytes', ja: '4000 バイト' },
        { en: '8000 bytes', ja: '8000 バイト' },
        { en: '1000 bytes', ja: '1000 バイト' },
      ],
      answer: 1,
      explanation: {
        en: 'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(4000, 2000) = 4000 (RFC 5681 §3.2). The TCP congestion lesson shows ssthresh at that step.',
        ja: 'ssthresh = max(送信中 ÷ 2, 2 × MSS) = max(4000, 2000) = 4000 です（RFC 5681 §3.2）。TCP 輻輳制御のレッスンで、そのステップの ssthresh が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    's7-tls-clear',
    {
      id: 'l8-tls-sni',
      prompt: {
        en: 'A device on the path records a browser’s TLS 1.3 ClientHello. Which of these can it read in the clear?',
        ja: '経路上の機器が、ブラウザの TLS 1.3 の ClientHello を記録します。平文で読めるのはどれですか？',
      },
      options: [
        { en: 'The full HTTP request', ja: 'HTTP の要求' },
        { en: 'The server’s name', ja: 'サーバの名前' },
        { en: 'The session keys', ja: 'セッション鍵' },
        { en: 'The cookies', ja: 'クッキー' },
      ],
      answer: 1,
      explanation: {
        en: 'The ClientHello is sent in the clear and usually names the server (SNI); the request and keys never travel in the clear. The HTTPS lesson shows what each message reveals.',
        ja: 'ClientHello は平文で送られ、ふつうサーバの名前（SNI）が入っています。要求や鍵は平文では流れません。HTTPS のレッスンで、各メッセージから見えるものが分かります。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-alpn-hidden',
    {
      id: 'l8-alpn-client-offer',
      prompt: {
        en: 'Where does a browser offer the application protocols it can use, such as h2 and http/1.1?',
        ja: 'ブラウザは、使えるアプリケーションプロトコル（h2 や http/1.1）をどこで伝えますか？',
      },
      options: [
        { en: 'In its ClientHello', ja: 'ClientHello の中' },
        { en: 'In its Finished', ja: '自分の Finished の中' },
        { en: 'In the first request', ja: '最初の HTTP 要求の中' },
        { en: 'In a DNS lookup', ja: 'DNS の問い合わせの中' },
      ],
      answer: 0,
      explanation: {
        en: 'The client lists its protocols in the ALPN extension of the ClientHello (RFC 7301); the server’s choice comes back encrypted. The HTTPS lesson shows both sides.',
        ja: 'クライアントは ClientHello の ALPN 拡張で使えるプロトコルを並べます（RFC 7301）。サーバの選んだものは暗号化されて返ります。HTTPS のレッスンで両方が見られます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-order',
    {
      id: 'l8-tls-first-encrypted',
      prompt: {
        en: 'In a TLS 1.3 handshake, which is the first message the server sends encrypted?',
        ja: 'TLS 1.3 のハンドシェイクで、サーバが最初に暗号化して送るメッセージはどれですか？',
      },
      options: [
        { en: 'Its own ServerHello', ja: 'ServerHello そのもの' },
        { en: 'EncryptedExtensions', ja: 'EncryptedExtensions' },
        { en: 'Its Certificate', ja: 'Certificate（サーバ証明書）' },
        { en: 'Its Finished', ja: 'Finished（終わり）' },
      ],
      answer: 1,
      explanation: {
        en: 'The ServerHello is in the clear; everything after it, starting with EncryptedExtensions, is encrypted (RFC 8446 §2). The HTTPS lesson lists the messages in order.',
        ja: 'ServerHello は平文で、そのあと EncryptedExtensions から先はすべて暗号化されます（RFC 8446 §2）。HTTPS のレッスンで、メッセージが順に並びます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-first-data',
    {
      id: 'l8-tls-round-trips',
      prompt: {
        en: 'A browser opens HTTPS with TCP and a full TLS 1.3 handshake. How many round trips pass before the HTTP request can go?',
        ja: 'ブラウザが TCP と、TLS 1.3 の完全なハンドシェイクで HTTPS を開きます。HTTP の要求を送れるまでに何往復かかりますか？',
      },
      options: [
        { en: 'One round trip', ja: '1 往復' },
        { en: 'Two round trips', ja: '2 往復' },
        { en: 'Three round trips', ja: '3 往復' },
        { en: 'None at all', ja: '0 往復' },
      ],
      answer: 1,
      explanation: {
        en: 'One round trip for the TCP handshake and one for TLS 1.3; the request goes with the client’s Finished. The HTTPS lesson shows the request after the handshake.',
        ja: 'TCP のハンドシェイクに 1 往復、TLS 1.3 に 1 往復です。要求はクライアントの Finished と一緒に送られます。HTTPS のレッスンで、ハンドシェイクのあとに要求が見られます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-h2-one-connection',
    {
      id: 'l8-h2-multiplex',
      prompt: {
        en: 'Four requests share one HTTP/2 connection. How are they carried?',
        ja: '4 つの要求が 1 つの HTTP/2 接続を共有します。どう運ばれますか？',
      },
      options: [
        { en: 'One after another, each whole', ja: '1 つずつ順番に丸ごと送る' },
        { en: 'As frames on four streams', ja: '4 つのストリームのフレーム' },
        { en: 'Each on its own port', ja: 'それぞれ別々のポートで送る' },
        { en: 'As one combined request', ja: 'すべてを 1 つにまとめた要求' },
      ],
      answer: 1,
      explanation: {
        en: 'HTTP/2 splits each request into frames on its own stream and interleaves them on one connection (RFC 9113). The HTTP/2 lesson shows the four streams.',
        ja: 'HTTP/2 は要求をそれぞれ自分のストリームのフレームに分け、1 つの接続の上で交互に送ります（RFC 9113）。HTTP/2 のレッスンで 4 つのストリームが見られます。',
      },
      taughtBy: 'http2',
    },
  ],
  [
    's7-h2-stream-ids',
    {
      id: 'l8-h2-fifth-request',
      prompt: {
        en: 'Over HTTP/2 a client has opened streams 1, 3, 5 and 7. Which stream ID does its next request use?',
        ja: 'HTTP/2 でクライアントはストリーム 1、3、5、7 を開いています。次の要求のストリーム ID はどれですか？',
      },
      options: [
        { en: '8', ja: '8' },
        { en: '9', ja: '9' },
        { en: '10', ja: '10' },
        { en: '11', ja: '11' },
      ],
      answer: 1,
      explanation: {
        en: 'Client-opened streams use odd IDs counting up by two (RFC 9113 §5.1.1), so the next is 9. The HTTP/2 lesson shows 1, 3, 5 and 7.',
        ja: 'クライアントが開くストリームは奇数で、2 ずつ増えます（RFC 9113 §5.1.1）。次は 9 です。HTTP/2 のレッスンで 1、3、5、7 が見られます。',
      },
      taughtBy: 'http2',
    },
  ],
  [
    's7-h3-stream-ids',
    {
      id: 'l8-h3-fifth',
      prompt: {
        en: 'Over HTTP/3 a client has opened request streams 0, 4, 8 and 12. Which ID does its next request stream use?',
        ja: 'HTTP/3 でクライアントは要求のストリーム 0、4、8、12 を開いています。次の要求のストリーム ID はどれですか？',
      },
      options: [
        { en: '13', ja: '13' },
        { en: '14', ja: '14' },
        { en: '16', ja: '16' },
        { en: '20', ja: '20' },
      ],
      answer: 2,
      explanation: {
        en: 'Client-opened bidirectional streams have both low bits 0, so they count up in fours: the next is 16 (RFC 9000 §2.1). The HTTP/3 lesson shows 0, 4, 8 and 12.',
        ja: 'クライアントが開く双方向のストリームは下位 2 ビットが 0 なので、4 ずつ増えます。次は 16 です（RFC 9000 §2.1）。HTTP/3 のレッスンで 0、4、8、12 が見られます。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    's7-h3-udp-firewall',
    {
      id: 'l8-h3-fallback',
      prompt: {
        en: 'A firewall blocks UDP. A browser tries a site over HTTP/3 first. What usually happens next?',
        ja: 'ファイアウォールが UDP を止めています。ブラウザはまず HTTP/3 でサイトを開こうとします。ふつう次にどうなりますか？',
      },
      options: [
        { en: 'The site never opens', ja: 'サイトは開かない' },
        { en: 'It uses HTTP/2 over TCP', ja: 'TCP の HTTP/2 を使う' },
        { en: 'It tunnels QUIC in DNS', ja: 'QUIC を DNS の中に隠す' },
        { en: 'It keeps retrying UDP forever', ja: 'UDP をいつまでも試し続ける' },
      ],
      answer: 1,
      explanation: {
        en: 'When QUIC gets no answer, browsers fall back to HTTP/2 over TCP, which the firewall allows. The HTTP/3 lesson notes it runs only over UDP.',
        ja: 'QUIC に返事がないと、ブラウザはファイアウォールが通す TCP の HTTP/2 に切り替えます。HTTP/3 のレッスンに、UDP の上でしか動かないとあります。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    's7-cc-rto-ssthresh',
    {
      id: 'l8-rto-ssthresh-big',
      prompt: {
        en: 'MSS is 1000 bytes. A retransmission timeout fires with 10 000 bytes sent and not yet acknowledged. What becomes the new ssthresh?',
        ja: 'MSS は 1000 バイトです。10 000 バイトを送って確認がないまま、再送タイマーが切れます。新しい ssthresh はいくつですか？',
      },
      options: [
        { en: '2000 bytes', ja: '2000 バイト' },
        { en: '10 000 bytes', ja: '10 000 バイト' },
        { en: '5000 bytes', ja: '5000 バイト' },
        { en: '1000 bytes', ja: '1000 バイト' },
      ],
      answer: 2,
      explanation: {
        en: 'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(5000, 2000) = 5000 (RFC 5681 §3.1). The TCP congestion lesson shows ssthresh after a timeout.',
        ja: 'ssthresh = max(送信中 ÷ 2, 2 × MSS) = max(5000, 2000) = 5000 です（RFC 5681 §3.1）。TCP 輻輳制御のレッスンで、タイムアウト後の ssthresh が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    's7-cc-deflate',
    {
      id: 'l8-dupack-inflate',
      prompt: {
        en: 'A sender is in fast recovery. Another duplicate ACK arrives. What happens to cwnd?',
        ja: '送り手は高速回復の途中です。さらに重複 ACK が 1 つ届きます。cwnd はどうなりますか？',
      },
      options: [
        { en: 'It halves again', ja: 'もう一度半分になる' },
        { en: 'It goes back to one MSS', ja: '1 MSS に戻る' },
        { en: 'It grows by one MSS', ja: '1 MSS 増える' },
        { en: 'It doubles at once', ja: '2 倍になる' },
      ],
      answer: 2,
      explanation: {
        en: 'Each further duplicate ACK means a segment left the network, so cwnd is inflated by one MSS (RFC 5681 §3.2). The TCP congestion lesson steps through fast recovery.',
        ja: '重複 ACK が 1 つ来るたびに 1 つのセグメントがネットワークを出たことになるので、cwnd を 1 MSS 増やします（RFC 5681 §3.2）。TCP 輻輳制御のレッスンで、高速回復を順に見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    's1-hops',
    {
      id: 's1-hops-router-only',
      prompt: {
        en: 'PC-A is plugged straight into a router, and PC-D into the router’s other side. No switches. PC-A sends to PC-D. How many hops?',
        ja: 'PC-A はルータに直接つながり、PC-D はルータの反対側に直接つながっています。スイッチはありません。PC-A から PC-D へ送ります。何ホップですか？',
      },
      options: [
        { en: '1, the router', ja: '1。ルータの分' },
        { en: '2, two cables', ja: '2。ケーブル 2 本' },
        { en: '3, all devices', ja: '3。通った機器の数' },
        { en: '0, it is direct', ja: '0。直接つながっているから' },
      ],
      answer: 1,
      explanation: {
        en: 'One hop per cable crossed: PC-A → router, router → PC-D, so 2. The course counts hops per cable.',
        ja: 'ホップは渡ったケーブルの数です。PC-A → ルータ、ルータ → PC-D で 2 ホップです。入門コースでもケーブルごとに数えます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-same-16',
    {
      id: 's1-same-8',
      prompt: {
        en: 'A PC is 10.5.6.7/8. Which of these machines is on the same network as the PC?',
        ja: 'PC のアドレスは 10.5.6.7/8 です。この PC と同じネットワークにいるのはどれですか？',
      },
      options: [
        { en: '11.5.6.7', ja: '11.5.6.7' },
        { en: '110.15.6.7', ja: '110.15.6.7' },
        { en: '10.200.1.1', ja: '10.200.1.1' },
        { en: '1.5.6.7', ja: '1.5.6.7' },
      ],
      answer: 2,
      explanation: {
        en: '/8 means only the first number names the network: 10. Only 10.200.1.1 starts with 10. The subnetting practice compares first numbers this way.',
        ja: '/8 は「最初の 1 つの数だけがネットワーク」で、ここでは 10 です。10 で始まるのは 10.200.1.1 だけです。サブネットの練習で、こうして最初の数を比べます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-mask-24',
    {
      id: 's1-mask-16',
      prompt: {
        en: 'A PC’s mask is 255.255.0.0. How is the network part written with a slash?',
        ja: 'PC のマスクは 255.255.0.0 です。ネットワーク部分をスラッシュで書くとどうなりますか？',
      },
      options: [
        { en: '/8', ja: '/8' },
        { en: '/16', ja: '/16' },
        { en: '/24', ja: '/24' },
        { en: '/32', ja: '/32' },
      ],
      answer: 1,
      explanation: {
        en: 'Each 255 is 8 bits kept for the network: two of them make 16, so /16. The course explains the mask beside /24.',
        ja: '255 の 1 つは 8 ビットで、2 つで 16 なので /16 です。入門コースで、/24 と並べてマスクを説明しています。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-copy-discard',
    {
      id: 's1-copy-broadcast',
      prompt: {
        en: 'PC-A, PC-B and PC-C share one switch. PC-A sends a frame to the broadcast address ff:ff:ff:ff:ff:ff. Which PCs receive it?',
        ja: 'PC-A、PC-B、PC-C が 1 台のスイッチにつながっています。PC-A が全員あての ff:ff:ff:ff:ff:ff にフレームを送ります。受け取るのはどれですか？',
      },
      options: [
        { en: 'PC-B only', ja: 'PC-B だけ' },
        { en: 'No PC receives it', ja: 'どの PC も受け取らない' },
        { en: 'PC-C only', ja: 'PC-C だけ' },
        { en: 'PC-B and PC-C', ja: 'PC-B と PC-C' },
      ],
      answer: 3,
      explanation: {
        en: 'A broadcast is for everyone, so the switch sends it out of every port but the one it came in on. The course’s third step shows the switch copying to every port.',
        ja: '全員あてなので、スイッチは入ってきたポート以外のすべてのポートに送ります。入門コースの 3 番目のステップで、全部のポートに写す様子が見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-gateway-value',
    {
      id: 's1-gateway-not-used',
      prompt: {
        en: 'PC-A (10.0.0.11/24) sends to PC-B (10.0.0.12/24) on the same switch. PC-A’s gateway is 10.0.0.1. Does the packet go through the gateway?',
        ja: 'PC-A（10.0.0.11/24）が、同じスイッチの PC-B（10.0.0.12/24）に送ります。PC-A のゲートウェイは 10.0.0.1 です。パケットはゲートウェイを通りますか？',
      },
      options: [
        { en: 'Yes, always', ja: '通る。いつも' },
        { en: 'No, it goes direct', ja: '通らない。直接届く' },
        { en: 'Yes, to be checked', ja: '通る。確認のため' },
        { en: 'Only the first one', ja: '最初の 1 つだけ' },
      ],
      answer: 1,
      explanation: {
        en: 'The gateway is only the way out of the network; 10.0.0.12 is on PC-A’s own network, so it goes straight there. The course uses the gateway only to reach another network.',
        ja: 'ゲートウェイはネットワークの外への出口です。10.0.0.12 は同じネットワークなので、直接届きます。入門コースでも、ゲートウェイは別のネットワークへ行くときだけ使います。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-two-switches',
    {
      id: 's1-two-nets-need',
      prompt: {
        en: 'Switch-1 holds 10.0.0.x/24 PCs and Switch-2 holds 192.168.1.x/24 PCs. What must join them so that the two groups can talk?',
        ja: 'Switch-1 には 10.0.0.x/24 の PC、Switch-2 には 192.168.1.x/24 の PC がつながっています。2 つのグループが話せるようにするには、何でつなぎますか？',
      },
      options: [
        { en: 'One more switch', ja: 'スイッチをもう 1 台' },
        { en: 'A longer cable', ja: 'もっと長いケーブル' },
        { en: 'A router between them', ja: '間にルータを置く' },
        { en: 'Nothing, they already can', ja: '何も要らない' },
      ],
      answer: 2,
      explanation: {
        en: 'They are two networks, and only a router passes packets between networks. The course adds the router at its fifth step.',
        ja: '2 つは別のネットワークで、ネットワークの間を渡すのはルータだけです。入門コースの 5 番目のステップでルータを加えます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-usable-address',
    {
      id: 's1-broadcast-address',
      prompt: {
        en: 'What is the broadcast address of network 172.16.4.0/24?',
        ja: 'ネットワーク 172.16.4.0/24 のブロードキャストアドレスはどれですか？',
      },
      options: [
        { en: '172.16.4.0', ja: '172.16.4.0' },
        { en: '172.16.4.1', ja: '172.16.4.1' },
        { en: '172.16.255.255', ja: '172.16.255.255' },
        { en: '172.16.4.255', ja: '172.16.4.255' },
      ],
      answer: 3,
      explanation: {
        en: 'In a /24 the address whose last number is 255 is for everyone on the network. The subnetting practice names this end.',
        ja: '/24 では、最後の数が 255 のアドレスがネットワークの全員あてです。サブネットの練習で、この端を確かめます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-host-count',
    {
      id: 's1-pcs-with-router',
      prompt: {
        en: 'A /24 network has one router, which uses one address. How many PCs can it hold at most?',
        ja: '/24 のネットワークにルータが 1 台あり、アドレスを 1 つ使っています。PC は最大で何台つなげますか？',
      },
      options: [
        { en: '254 PCs', ja: '254 台' },
        { en: '256 PCs', ja: '256 台' },
        { en: '253 PCs', ja: '253 台' },
        { en: '255 PCs', ja: '255 台' },
      ],
      answer: 2,
      explanation: {
        en: 'A /24 has 254 usable addresses; the router takes one, leaving 253. The subnetting practice counts the 254.',
        ja: '/24 で使えるアドレスは 254 個で、ルータが 1 つ使うので 253 台です。サブネットの練習で、この 254 を数えます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-switch-keeps-addresses',
    {
      id: 's1-router-changes',
      prompt: {
        en: 'PC-A’s packet to PC-D passes the router. What does the router change in it?',
        ja: 'PC-A から PC-D へのパケットがルータを通ります。ルータはその中の何を変えますか？',
      },
      options: [
        { en: 'The MACs and the TTL', ja: 'MAC と TTL' },
        { en: 'The destination IP address', ja: '宛先の IP アドレス' },
        { en: 'Nothing at all', ja: '何も変えない' },
        { en: 'The sender’s IP', ja: '送り主の IP' },
      ],
      answer: 0,
      explanation: {
        en: 'A router writes a new frame for the next cable, with new MAC addresses, and takes one off the TTL; the IP addresses stay. The course contrasts this with a switch.',
        ja: 'ルータは次のケーブル用に新しい MAC アドレスのフレームを書き、TTL を 1 減らします。IP アドレスは変えません。入門コースで、スイッチとの違いを示しています。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-who-reads-ip',
    {
      id: 's1-switch-reads-mac',
      prompt: {
        en: 'A frame arrives at a switch. What does the switch read to choose the port it leaves by?',
        ja: 'フレームがスイッチに着きます。スイッチは何を見て、出ていくポートを決めますか？',
      },
      options: [
        { en: 'The destination IP', ja: '宛先の IP' },
        { en: 'The packet’s TTL', ja: 'パケットの TTL' },
        { en: 'The destination MAC', ja: '宛先の MAC' },
        { en: 'The sender’s IP address', ja: '送り主の IP' },
      ],
      answer: 2,
      explanation: {
        en: 'A switch forwards by the destination MAC address and the port it learned for it; it does not read IP addresses. The course shows the switch learning MACs.',
        ja: 'スイッチは宛先の MAC アドレスと、覚えたポートで送り先を決めます。IP アドレスは見ません。入門コースで、スイッチが MAC を覚える様子が見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's2-arp-broadcast',
    {
      id: 's2-arp-who-hears',
      prompt: {
        en: 'PC-A asks by ARP for 10.0.0.12 on its own switch, where PC-B, PC-C and a printer also sit. Which of them receive the question?',
        ja: 'PC-A が ARP で 10.0.0.12 を尋ねます。同じスイッチに PC-B、PC-C、プリンターがいます。質問を受け取るのはどれですか？',
      },
      options: [
        { en: 'PC-B only, the owner', ja: 'PC-B だけ' },
        { en: 'All three of them', ja: '3 台すべて' },
        { en: 'The printer only', ja: 'プリンターだけ' },
        { en: 'None, it is held back', ja: 'どれも。止められる' },
      ],
      answer: 1,
      explanation: {
        en: 'An ARP request is a broadcast, so every device on the network receives it; only the owner answers. The ARP lesson calls it a question to everyone.',
        ja: 'ARP の質問は全員あてなので、ネットワークのすべての機器が受け取ります。答えるのは持ち主だけです。ARP のレッスンで「全員への質問」と説明しています。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-who-answers',
    {
      id: 's2-arp-printer-answers',
      prompt: {
        en: 'PC-A asks “who has 10.0.0.20?”. 10.0.0.20 is the printer; PC-B and PC-C also hear it. Which device answers?',
        ja: 'PC-A が「10.0.0.20 の持ち主は？」と尋ねます。10.0.0.20 はプリンターで、PC-B と PC-C も質問を聞きます。答えるのはどれですか？',
      },
      options: [
        { en: 'PC-B and PC-C', ja: 'PC-B と PC-C' },
        { en: 'Every device', ja: 'すべての機器' },
        { en: 'The switch', ja: '間のスイッチ' },
        { en: 'The printer', ja: 'プリンターだけ' },
      ],
      answer: 3,
      explanation: {
        en: 'Only the owner of the address answers, with its MAC; the others stay silent. The ARP lesson shows one answer per question.',
        ja: '答えるのはアドレスの持ち主だけで、自分の MAC を返します。ほかは黙っています。ARP のレッスンでも、質問 1 つに答えは 1 つです。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-reply-unicast',
    {
      id: 's2-arp-reply-carries',
      prompt: {
        en: 'What does an ARP answer carry back to the one who asked?',
        ja: 'ARP の答えは、尋ねた機器に何を返しますか？',
      },
      options: [
        { en: 'The MAC for that IP', ja: 'その IP の MAC' },
        { en: 'A new IP address', ja: '新しい IP アドレス' },
        { en: 'The route to it', ja: 'そこへの経路' },
        { en: 'The switch port to use', ja: 'スイッチのポート' },
      ],
      answer: 0,
      explanation: {
        en: 'The answer pairs the asked IP address with its owner’s MAC, which the asker keeps in its table. The ARP lesson’s table shows these pairs.',
        ja: '答えは、尋ねた IP アドレスと持ち主の MAC の組です。尋ねた機器はそれを表に覚えます。ARP のレッスンの表に、この組が並びます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-who-asks',
    {
      id: 's2-arp-who-asks-local',
      prompt: {
        en: 'The Client (10.0.0.10/24) sends to a printer at 10.0.0.20 on its own network for the first time. Who asks by ARP for the printer’s MAC?',
        ja: 'Client（10.0.0.10/24）が、同じネットワークのプリンター 10.0.0.20 に初めて送ります。プリンターの MAC を ARP で尋ねるのはだれですか？',
      },
      options: [
        { en: 'The Router', ja: 'Router' },
        { en: 'The printer', ja: 'プリンター' },
        { en: 'The Client', ja: 'Client' },
        { en: 'Nobody', ja: 'だれも' },
      ],
      answer: 2,
      explanation: {
        en: 'On its own network the sender hands the frame straight to the destination, so the Client itself asks for the printer. The ARP lesson shows the sender asking before it sends.',
        ja: '同じネットワークなら送り主が宛先に直接渡すので、Client 自身がプリンターを尋ねます。ARP のレッスンで、送り主が送る前に尋ねる様子が見られます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-first-frame-mac',
    {
      id: 's2-first-frame-src',
      prompt: {
        en: 'The Client sends a packet for the Server through the Router. Which source MAC does the frame carry on the first cable?',
        ja: 'Client が Router を通して Server あてにパケットを送ります。最初のケーブルで、フレームの送信元 MAC はどれですか？',
      },
      options: [
        { en: 'The Router’s', ja: 'Router の MAC' },
        { en: 'The Server’s', ja: 'Server の MAC' },
        { en: 'The switch’s', ja: 'スイッチの MAC' },
        { en: 'The Client’s', ja: 'Client の MAC' },
      ],
      answer: 3,
      explanation: {
        en: 'The sender writes its own MAC as the frame’s source on the cable it sends on. The ARP lesson explains the frame’s two addresses.',
        ja: '送り主は、送り出すケーブルでのフレームの送信元に自分の MAC を書きます。ARP のレッスンで、フレームの 2 つのアドレスを説明しています。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-star-first-send',
    {
      id: 's2-star-broadcast',
      prompt: {
        en: 'Four clients and a server hang off one switch. Client-1 sends a broadcast. Which devices receive it?',
        ja: '1 台のスイッチに 4 台のクライアントとサーバがつながっています。Client-1 が全員あてに送ります。受け取るのはどれですか？',
      },
      options: [
        { en: 'The server only', ja: 'サーバだけが受け取る' },
        { en: 'All but Client-1', ja: 'Client-1 以外の全部' },
        { en: 'No device at all', ja: 'どれも受け取らない' },
        { en: 'Only Client-2 receives it', ja: 'Client-2 だけが受け取る' },
      ],
      answer: 1,
      explanation: {
        en: 'A broadcast goes out of every port but the one it came in on, so every other device receives it. The star lesson shows the switch copying to the others.',
        ja: '全員あては入ってきたポート以外のすべてに送られるので、ほかの全機器が受け取ります。スター型のレッスンで、スイッチがほかへ写す様子が見られます。',
      },
      taughtBy: 'star',
    },
  ],
  [
    's2-vlan-same',
    {
      id: 's2-vlan-needs-router',
      prompt: {
        en: 'A1 (VLAN 10) sends to B1 (VLAN 20) on the same switch SW1. What must the packet pass through?',
        ja: 'A1（VLAN 10）が、同じスイッチ SW1 の B1（VLAN 20）に送ります。パケットは何を通らなければなりませんか？',
      },
      options: [
        { en: 'Nothing, same switch', ja: '何も。同じスイッチ' },
        { en: 'The router R1', ja: 'ルータ R1' },
        { en: 'A second switch', ja: '2 台目のスイッチ' },
        { en: 'B1’s access port only', ja: 'B1 のポートだけ' },
      ],
      answer: 1,
      explanation: {
        en: 'Two VLANs are two networks, so only a router can pass packets between them, even on one switch. The VLAN lesson routes A1 → B1 through R1.',
        ja: '2 つの VLAN は 2 つのネットワークなので、同じスイッチでも間を渡せるのはルータだけです。VLAN のレッスンで、A1 → B1 は R1 を通ります。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-vlan-trunk-cut',
    {
      id: 's2-vlan-trunk-cut-same',
      prompt: {
        en: 'The trunk between SW1 and R1 is cut. B1 (VLAN 20) sends to B2 (VLAN 20). What happens?',
        ja: 'SW1 と R1 の間のトランクが切れています。B1（VLAN 20）が B2（VLAN 20）に送ります。どうなりますか？',
      },
      options: [
        { en: 'It stops at SW1', ja: 'SW1 で止まる' },
        { en: 'It stops at R1', ja: 'R1 で止まる' },
        { en: 'It still arrives', ja: 'それでも届く' },
        { en: 'It loops forever', ja: 'ずっと回る' },
      ],
      answer: 2,
      explanation: {
        en: 'Traffic inside one VLAN never uses the trunk to R1, so B1 to B2 still arrives. The VLAN lesson’s break-the-trunk button shows it.',
        ja: '同じ VLAN の中の通信は R1 へのトランクを使わないので、B1 から B2 には届きます。VLAN のレッスンでトランクを切ると確かめられます。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-vlan-access-reach',
    {
      id: 's2-vlan-move-port',
      prompt: {
        en: 'You move A1’s port from VLAN 10 to VLAN 20. With no router in use, which machines can A1 reach now?',
        ja: 'A1 のポートを VLAN 10 から VLAN 20 に変えます。ルータを使わないとき、A1 が届くのはどれですか？',
      },
      options: [
        { en: 'A2 only', ja: 'A2 だけ' },
        { en: 'B1 and B2', ja: 'B1 と B2' },
        { en: 'All three', ja: '3 台すべて' },
        { en: 'None of them', ja: 'どれにも届かない' },
      ],
      answer: 1,
      explanation: {
        en: 'A port’s VLAN decides the network it is on: A1 is now in VLAN 20 with B1 and B2. The VLAN lesson lets you change a port’s VLAN.',
        ja: 'ポートの VLAN で属するネットワークが決まります。A1 は VLAN 20 になり、B1 と B2 と同じです。VLAN のレッスンで、ポートの VLAN を変えられます。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-trunk-tag',
    {
      id: 's2-trunk-why-tag',
      prompt: {
        en: 'Why do frames on the trunk between SW1 and R1 carry a VLAN tag?',
        ja: 'SW1 と R1 の間のトランクでは、なぜフレームに VLAN タグを付けますか？',
      },
      options: [
        { en: 'To make them faster', ja: '速くするため' },
        { en: 'To encrypt them', ja: '暗号化するため' },
        { en: 'To show their VLAN', ja: 'VLAN を示すため' },
        { en: 'To count the hops', ja: '通ったホップを数えるため' },
      ],
      answer: 2,
      explanation: {
        en: 'A trunk carries several VLANs on one cable, so each frame says which VLAN it belongs to (IEEE 802.1Q). The VLAN lesson defines the trunk this way.',
        ja: 'トランクは 1 本で複数の VLAN を運ぶので、フレームごとにどの VLAN かを示します（IEEE 802.1Q）。VLAN のレッスンでトランクをこう説明しています。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's3-sender-kept',
    {
      id: 's3-sender-mac-server',
      prompt: {
        en: 'The Client sends to the Server through R-1. Which source MAC does the frame carry when it reaches the Server?',
        ja: 'Client が R-1 を通して Server に送ります。Server に届いたフレームの送信元 MAC はどれですか？',
      },
      options: [
        { en: 'The Client’s', ja: 'Client の MAC' },
        { en: 'R-1’s own', ja: 'R-1 の MAC' },
        { en: 'The switch’s', ja: 'スイッチの MAC' },
        { en: 'The Server’s', ja: 'Server の MAC' },
      ],
      answer: 1,
      explanation: {
        en: 'R-1 wrote a new frame for the last cable with its own MAC as the source; the IP source stays the Client’s. The client–server lesson shows the MAC change at R-1.',
        ja: 'R-1 は最後のケーブル用に、自分の MAC を送信元にした新しいフレームを書きます。IP の送り主は Client のままです。クライアント・サーバのレッスンで、R-1 での MAC の変化が見られます。',
      },
      taughtBy: 'client-server',
    },
  ],
  [
    's3-ttl-switches',
    {
      id: 's3-ttl-runs-out',
      prompt: {
        en: 'A packet leaves with TTL 2 and must cross R-1, R-2 and R-3. Where is it dropped?',
        ja: 'パケットは TTL 2 で出発し、R-1、R-2、R-3 を通る必要があります。どこで捨てられますか？',
      },
      options: [
        { en: 'At R-1', ja: 'R-1 で' },
        { en: 'At R-2', ja: 'R-2 で' },
        { en: 'At R-3', ja: 'R-3 で' },
        { en: 'It arrives', ja: '捨てられずに届く' },
      ],
      answer: 1,
      explanation: {
        en: 'R-1 sends it on with TTL 1; R-2 would make it 0, so R-2 drops it and says so with ICMP. The client–server lesson explains the TTL count.',
        ja: 'R-1 は TTL 1 で送り出します。R-2 で 0 になるので、R-2 が捨てて ICMP で知らせます。クライアント・サーバのレッスンで TTL の数え方を説明しています。',
      },
      taughtBy: 'client-server',
    },
  ],
  [
    's3-lpm-nested',
    {
      id: 's3-lpm-default-only',
      prompt: {
        en: 'A router has 10.0.0.0/8 → A, 10.1.0.0/16 → B and 0.0.0.0/0 → D. A packet for 192.0.2.1 arrives. Which way does it go?',
        ja: 'ルータに 10.0.0.0/8 → A、10.1.0.0/16 → B、0.0.0.0/0 → D があります。192.0.2.1 あてのパケットが来ました。どちらへ送りますか？',
      },
      options: [
        { en: 'A, by the /8', ja: 'A（/8）' },
        { en: 'B, by the /16', ja: 'B（/16）' },
        { en: 'D, by the default', ja: 'D（既定）' },
        { en: 'Dropped, no match', ja: '捨てる（一致なし）' },
      ],
      answer: 2,
      explanation: {
        en: 'Neither 10.x row fits 192.0.2.1, and 0.0.0.0/0 fits every address, so it goes to D. The routing-decision lesson shows the default row catching the rest.',
        ja: '10 で始まる行は 192.0.2.1 に合わず、0.0.0.0/0 はどのアドレスにも合うので D へ送ります。経路の選び方のレッスンで、既定の行が残りを受け持つ様子が見られます。',
      },
      taughtBy: 'routing-decision',
    },
  ],
  [
    's3-no-route',
    {
      id: 's3-no-route-tells',
      prompt: {
        en: 'A router drops a packet because no row fits its destination. What does it send back to the sender?',
        ja: 'ルータは、宛先に合う行がないのでパケットを捨てます。送り主に何を返しますか？',
      },
      options: [
        { en: 'Nothing, ever', ja: '何も返さない' },
        { en: 'The same packet back', ja: '同じパケットをそのまま' },
        { en: 'A new route', ja: '代わりの新しい経路' },
        { en: 'An ICMP unreachable', ja: 'ICMP の到達不能' },
      ],
      answer: 3,
      explanation: {
        en: 'A router that cannot forward a packet sends an ICMP Destination Unreachable to its sender (RFC 1812). The routing-decision lesson shows the drop.',
        ja: '転送できないルータは、送り主に ICMP の Destination Unreachable を送ります（RFC 1812）。経路の選び方のレッスンで、捨てられる様子が見られます。',
      },
      taughtBy: 'routing-decision',
    },
  ],
  [
    's3-default-route',
    {
      id: 's3-specific-beats-default',
      prompt: {
        en: 'R-1 has 0.0.0.0/0 via 172.16.0.2 and 203.0.113.0/24 via 172.16.0.6. A packet for 203.0.113.9 arrives. Which next router does R-1 use?',
        ja: 'R-1 には 0.0.0.0/0（次は 172.16.0.2）と 203.0.113.0/24（次は 172.16.0.6）があります。203.0.113.9 あてのパケットが来ました。次のルータは？',
      },
      options: [
        { en: '172.16.0.2', ja: '172.16.0.2' },
        { en: '172.16.0.6', ja: '172.16.0.6' },
        { en: 'Both, shared', ja: '両方で分ける' },
        { en: '203.0.113.9', ja: '203.0.113.9' },
      ],
      answer: 1,
      explanation: {
        en: 'Both rows fit, and the longer, 203.0.113.0/24, wins over the default. The step-by-step lesson shows R-1 choosing the /24.',
        ja: '2 行とも合い、長い 203.0.113.0/24 が既定の行に勝ちます。ステップごとのレッスンで、R-1 が /24 を選ぶ様子が見られます。',
      },
      taughtBy: 'step',
    },
  ],
  [
    's3-mac-per-link',
    {
      id: 's3-mac-first-link',
      prompt: {
        en: 'A packet goes Client → R-1 → R-2 → Server. On the first cable, Client to R-1, whose MAC is the frame’s destination?',
        ja: 'パケットは Client → R-1 → R-2 → Server と進みます。最初のケーブル（Client から R-1）で、フレームの宛先 MAC はだれのものですか？',
      },
      options: [
        { en: 'R-1’s own', ja: 'R-1 の MAC' },
        { en: 'The Server’s', ja: 'Server の MAC' },
        { en: 'R-2’s own', ja: 'R-2 の MAC' },
        { en: 'Everyone’s', ja: '全員あての MAC' },
      ],
      answer: 0,
      explanation: {
        en: 'The frame crosses only the first cable, so it is addressed to R-1, the next device. The trace inspector lesson shows the MAC pair of each link.',
        ja: 'フレームは最初のケーブルしか渡らないので、宛先は次の機器 R-1 です。トレースを見るレッスンで、区間ごとの MAC の組が見られます。',
      },
      taughtBy: 'trace',
    },
  ],
  [
    's3-ttl-at-r3',
    {
      id: 's3-ttl-at-server',
      prompt: {
        en: 'The Client sends with TTL 64 across R-1, R-2 and R-3 to the Server. What TTL does the packet carry when the Server receives it?',
        ja: 'Client が TTL 64 で送り、R-1、R-2、R-3 を通って Server に届きます。Server が受け取るときの TTL はいくつですか？',
      },
      options: [
        { en: '64', ja: '64' },
        { en: '63', ja: '63' },
        { en: '62', ja: '62' },
        { en: '61', ja: '61' },
      ],
      answer: 3,
      explanation: {
        en: 'Each of the three routers takes one off: 64 − 3 = 61. The trace inspector lesson’s brief names this 61.',
        ja: '3 台のルータがそれぞれ 1 減らすので、64 − 3 = 61 です。トレースを見るレッスンの説明にも 61 とあります。',
      },
      taughtBy: 'trace',
    },
  ],
  [
    's3-who-splits',
    {
      id: 's3-two-fragments',
      prompt: {
        en: 'A 1500-byte IPv4 packet (20-byte header) meets a link with MTU 1000, DF clear. How many fragments does the router make?',
        ja: '1500 バイトの IPv4 パケット（ヘッダ 20 バイト）が、MTU 1000 のリンクに着きます。DF は立っていません。ルータはいくつに分けますか？',
      },
      options: [
        { en: '1, it fits', ja: '1 つ（入る）' },
        { en: '2 fragments', ja: '2 つに分ける' },
        { en: '3 fragments', ja: '3 つに分ける' },
        { en: '15 fragments', ja: '15 個に分ける' },
      ],
      answer: 1,
      explanation: {
        en: 'Each fragment carries at most 976 data bytes (1000 − 20, a multiple of 8); 1480 data bytes need 976 + 504, so two. The MTU lesson counts fragments.',
        ja: '断片 1 つのデータは最大 976 バイト（1000 − 20、8 の倍数）で、1480 バイトは 976 + 504 の 2 つになります。MTU のレッスンで断片の数を数えられます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    's3-who-joins',
    {
      id: 's3-fragments-belong',
      prompt: {
        en: 'Host B receives fragments from two different packets mixed together. How does it tell which fragments belong together?',
        ja: 'Host B に、2 つのパケットの断片が混ざって届きます。どの断片が同じパケットかを、どう見分けますか？',
      },
      options: [
        { en: 'By the order they arrive', ja: '届いた順番どおりに' },
        { en: 'By their TTL', ja: 'TTL の値で' },
        { en: 'By the same ID field', ja: '同じ ID の値で' },
        { en: 'By their size', ja: '断片の大きさで' },
      ],
      answer: 2,
      explanation: {
        en: 'Fragments of one packet share its Identification field (with the same addresses and protocol), and the offset places each piece (RFC 791). The MTU lesson shows the ID on each fragment.',
        ja: '同じパケットの断片は ID の値（と同じアドレス、種類）を共有し、オフセットで位置が決まります（RFC 791）。MTU のレッスンで、各断片の ID が見られます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    's3-route-row-direct',
    {
      id: 's3-direct-arp-target',
      prompt: {
        en: 'R-1’s table marks 203.0.113.0/24 “direct”. A packet for 203.0.113.10 arrives, and R-1 has never sent to it. Whom does R-1 ask for by ARP?',
        ja: 'R-1 の表では 203.0.113.0/24 は direct です。203.0.113.10 あてのパケットが来ましたが、R-1 はそこに送ったことがありません。R-1 は ARP でだれを尋ねますか？',
      },
      options: [
        { en: '203.0.113.1, its own', ja: '203.0.113.1（自分自身）' },
        { en: '172.16.0.2, next', ja: '172.16.0.2（次）' },
        { en: 'The Client, again', ja: '送り主の Client' },
        { en: '203.0.113.10, itself', ja: '203.0.113.10（宛先）' },
      ],
      answer: 3,
      explanation: {
        en: 'A direct row means the destination is on R-1’s own cable, so R-1 asks for 203.0.113.10 itself. The client–server lesson shows R-1’s question for the Server.',
        ja: 'direct は宛先が R-1 のケーブルの先にいるという意味なので、R-1 は 203.0.113.10 そのものを尋ねます。クライアント・サーバのレッスンで、R-1 が Server を尋ねる様子が見られます。',
      },
      taughtBy: 'client-server',
    },
  ],
  [
    'packet-destination',
    {
      id: 'packet-destination-new-switch',
      prompt: {
        en: 'PC-A, PC-B (10.0.0.12) and PC-C share a switch that has just started. PC-A sends to 10.0.0.12. Which machine keeps the packet?',
        ja: 'PC-A、PC-B（10.0.0.12）、PC-C が、動き始めたばかりのスイッチにつながっています。PC-A が 10.0.0.12 へ送ります。パケットを受け取るのはどれですか？',
      },
      options: [
        { en: 'PC-C, the last one', ja: '最後の PC-C' },
        { en: 'Both PC-B and PC-C', ja: 'PC-B と PC-C' },
        { en: 'PC-B, its owner', ja: '持ち主の PC-B' },
        { en: 'Nobody yet', ja: 'まだだれも受け取らない' },
      ],
      answer: 2,
      explanation: {
        en: 'Even if a copy reaches PC-C, PC-C sees it is not for it and throws it away; only PC-B, the owner of 10.0.0.12, keeps it. The course’s third step shows this.',
        ja: '写しが PC-C に届いても、PC-C は自分あてでないと見て捨てます。受け取るのは 10.0.0.12 の持ち主 PC-B だけです。入門コースの 3 番目のステップで見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    'same-network',
    {
      id: 'same-network-c',
      prompt: {
        en: 'A PC has the address 172.16.8.9/24. Which of these addresses is on the same network as the PC?',
        ja: 'PC のアドレスは 172.16.8.9/24 です。この PC と同じネットワークにあるのはどれですか？',
      },
      options: [
        { en: '172.16.9.250', ja: '172.16.9.250' },
        { en: '172.16.8.250', ja: '172.16.8.250' },
        { en: '172.17.8.9', ja: '172.17.8.9' },
        { en: '16.172.8.9', ja: '16.172.8.9' },
      ],
      answer: 1,
      explanation: {
        en: '/24 keeps 172.16.8 for the network, and only 172.16.8.250 starts with it. The subnetting practice asks this.',
        ja: '/24 は 172.16.8 がネットワークで、それで始まるのは 172.16.8.250 だけです。サブネットの練習で問います。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    'tcp-zero-window',
    {
      id: 'tcp-window-full',
      prompt: {
        en: 'The receiver’s window is 3000 bytes, and the sender has already sent 3000 bytes not yet acknowledged. It has more to send. What does it do now?',
        ja: '受け手のウィンドウは 3000 バイトで、送り手はまだ確認のない 3000 バイトを送っています。さらに送るものがあります。いまどうしますか？',
      },
      options: [
        { en: 'Sends 3000 more', ja: 'さらに 3000 送る' },
        { en: 'Resends all at once', ja: '全部を再送する' },
        { en: 'Waits for an ACK', ja: 'ACK を待つ' },
        { en: 'Closes the connection', ja: '接続を閉じる' },
      ],
      answer: 2,
      explanation: {
        en: 'The window is full, so the sender waits until an ACK acknowledges data and opens room again. The TCP flow-control lesson shows the sender pausing.',
        ja: 'ウィンドウがいっぱいなので、ACK でデータが確認され空きができるまで待ちます。TCP フロー制御のレッスンで、送り手が止まる様子が見られます。',
      },
      taughtBy: 'tcp-flow',
    },
  ],
  [
    'tcp-mss',
    {
      id: 'tcp-mss-both-same',
      prompt: {
        en: 'Both the client and the server announce MSS 1460 in the handshake. What is the most data one segment can carry?',
        ja: 'ハンドシェイクで、クライアントもサーバも MSS 1460 を知らせます。1 つのセグメントで運べるデータは最大いくつですか？',
      },
      options: [
        { en: '1460 bytes', ja: '1460 バイト' },
        { en: '2920 bytes', ja: '2920 バイト' },
        { en: '1500 bytes', ja: '1500 バイト' },
        { en: '1480 bytes', ja: '1480 バイト' },
      ],
      answer: 0,
      explanation: {
        en: 'Each side may send up to the other’s MSS, and both are 1460. The TCP flow-control lesson shows the MSS each side uses.',
        ja: 'それぞれ相手の MSS まで送れて、どちらも 1460 です。TCP フロー制御のレッスンで、それぞれが使う MSS が見られます。',
      },
      taughtBy: 'tcp-flow',
    },
  ],
  [
    'first-packet',
    {
      id: 'first-packet-remote',
      prompt: {
        en: 'PC-A (10.0.0.11/24) sends its first packet to 192.168.1.11, on another network, through gateway 10.0.0.1. Whose MAC does it ask for by ARP?',
        ja: 'PC-A（10.0.0.11/24）が、ゲートウェイ 10.0.0.1 を通して別のネットワークの 192.168.1.11 に最初のパケットを送ります。ARP でだれの MAC を尋ねますか？',
      },
      options: [
        { en: '192.168.1.11’s', ja: '192.168.1.11 の MAC' },
        { en: 'Its own', ja: '自分自身の MAC' },
        { en: 'The gateway’s', ja: 'ゲートウェイの MAC' },
        { en: 'The switch’s', ja: 'スイッチの MAC' },
      ],
      answer: 2,
      explanation: {
        en: 'ARP works only on PC-A’s own network, and the frame goes to the gateway, so PC-A asks for 10.0.0.1. The ARP lesson shows the Client asking for the Router.',
        ja: 'ARP は自分のネットワークの中でしか使えず、フレームはゲートウェイへ行くので、PC-A は 10.0.0.1 を尋ねます。ARP のレッスンで、Client が Router を尋ねる様子が見られます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    'dns-second-lookup',
    {
      id: 'dns-referral-kept',
      prompt: {
        en: 'Earlier the office DNS server learned which servers handle .org. Now a laptop asks for a different .org name it has never looked up. Whom does the office server ask first?',
        ja: '以前、事務所の DNS サーバは .org を受け持つサーバを覚えました。今度、ノートパソコンが一度も調べていない別の .org の名前を尋ねます。事務所のサーバが最初に尋ねる相手は？',
      },
      options: [
        { en: 'A root server', ja: 'いちばん上のルートサーバ' },
        { en: 'The .org servers', ja: '.org のサーバ' },
        { en: 'The laptop that asked', ja: 'ノートパソコン' },
        { en: 'The name’s own server', ja: '同じ名前の相手' },
      ],
      answer: 1,
      explanation: {
        en: 'It kept the .org servers from before, so it starts there instead of at the root. The DNS resolution lesson shows what a server remembers between lookups.',
        ja: '.org のサーバを覚えているので、ルートではなくそこから始めます。DNS の名前解決のレッスンで、サーバが覚えておくものが見られます。',
      },
      taughtBy: 'dns-resolution',
    },
  ],
  [
    'tcp-next',
    {
      id: 'tcp-close',
      prompt: {
        en: 'The browser has finished with the connection. Which segment does it send to begin closing it?',
        ja: 'ブラウザは接続を使い終えました。閉じ始めるために送るセグメントはどれですか？',
      },
      options: [
        { en: 'A SYN', ja: 'SYN を送る' },
        { en: 'A FIN', ja: 'FIN を送る' },
        { en: 'A SYN-ACK', ja: 'SYN-ACK を送る' },
        { en: 'A PSH', ja: 'PSH を送る' },
      ],
      answer: 1,
      explanation: {
        en: 'Closing starts with FIN from the side that is done, and each side ends its own direction (RFC 9293). The TCP handshake lesson shows the closing messages.',
        ja: '閉じるときは、終えた側が FIN を送って始め、それぞれが自分の向きを閉じます（RFC 9293）。TCP ハンドシェイクのレッスンで、閉じるメッセージが見られます。',
      },
      taughtBy: 'tcp',
    },
  ],
  [
    'udp-lost',
    {
      id: 'udp-no-handshake',
      prompt: {
        en: 'Before an app’s first UDP message to a server, what do the two sides exchange?',
        ja: 'アプリがサーバへ最初の UDP メッセージを送る前に、両者は何をやり取りしますか？',
      },
      options: [
        { en: 'A three-way handshake', ja: '3 回のやり取り' },
        { en: 'A key exchange', ja: '鍵の交換をする' },
        { en: 'Nothing at all', ja: '何もやり取りしない' },
        { en: 'A window size', ja: 'ウィンドウの大きさ' },
      ],
      answer: 2,
      explanation: {
        en: 'UDP has no connection: the first message is simply sent. The UDP lesson contrasts this with TCP’s handshake.',
        ja: 'UDP には接続がなく、最初のメッセージをそのまま送ります。UDP のレッスンで、TCP のハンドシェイクと比べています。',
      },
      taughtBy: 'udp',
    },
  ],
  [
    'name-fails',
    {
      id: 'dns-port',
      prompt: {
        en: 'A laptop asks its DNS server for a name. How does the question usually travel?',
        ja: 'ノートパソコンが DNS サーバに名前を尋ねます。質問はふつうどう送られますか？',
      },
      options: [
        { en: 'UDP to port 53', ja: 'UDP の 53 番' },
        { en: 'TCP to port 80', ja: 'TCP の 80 番' },
        { en: 'UDP to port 67', ja: 'UDP の 67 番' },
        { en: 'TCP to port 443', ja: 'TCP の 443 番' },
      ],
      answer: 0,
      explanation: {
        en: 'DNS questions usually go over UDP to port 53 (RFC 1035). The DHCP and DNS lesson shows the DNS message.',
        ja: 'DNS の質問はふつう UDP の 53 番に送ります（RFC 1035）。DHCP と DNS のレッスンで、DNS のメッセージが見られます。',
      },
      taughtBy: 'dns',
    },
  ],
  [
    'nat-sender',
    {
      id: 'nat-same-source-port',
      prompt: {
        en: 'At home a phone and a laptop both open the same website from source port 50000. How does the router keep their replies apart?',
        ja: '家のスマートフォンとノートパソコンが、どちらも送信元ポート 50000 で同じ Web サイトを開きます。ルータは返事をどう分けますか？',
      },
      options: [
        { en: 'By the reply’s TTL', ja: '返事の TTL で' },
        { en: 'It cannot do so', ja: '返事を分けられない' },
        { en: 'By the device’s MAC', ja: 'それぞれの機器の MAC で' },
        { en: 'By two public ports', ja: '2 つの外側ポートで' },
      ],
      answer: 3,
      explanation: {
        en: 'The router gives each conversation its own public port and maps it back by its table. The NAT lesson shows two clients sharing one address.',
        ja: 'ルータは会話ごとに別の外側ポートを割り当て、表で元に戻します。NAT のレッスンで、2 台が 1 つのアドレスを分け合う様子が見られます。',
      },
      taughtBy: 'nat',
    },
  ],
  [
    'vlan-same-switch',
    {
      id: 'l2-vlan-broadcast',
      prompt: {
        en: 'A1 in VLAN 10 sends a broadcast on SW1, which also holds A2 (VLAN 10), B1 and B2 (VLAN 20). Which machines receive it?',
        ja: 'VLAN 10 の A1 が、SW1 で全員あてに送ります。SW1 には A2（VLAN 10）、B1 と B2（VLAN 20）もいます。受け取るのはどれですか？',
      },
      options: [
        { en: 'All of them', ja: 'SW1 の全員' },
        { en: 'A2 only', ja: 'A2 だけ' },
        { en: 'B1 and B2', ja: 'B1 と B2' },
        { en: 'No machine', ja: 'だれも受け取らない' },
      ],
      answer: 1,
      explanation: {
        en: 'A broadcast stays inside its VLAN, so only A2 receives it. The VLAN lesson calls each VLAN a network of its own.',
        ja: '全員あては VLAN の中だけに広がるので、受け取るのは A2 だけです。VLAN のレッスンで、VLAN はそれぞれ 1 つのネットワークだと説明しています。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    'stp-root',
    {
      id: 'l2-stp-detour',
      prompt: {
        en: 'In the triangle, the Switch B – Switch C link is blocked. Host B sends to Host C. Which way does the frame go?',
        ja: '三角形で Switch B – Switch C のリンクは止められています。Host B が Host C に送ります。フレームはどこを通りますか？',
      },
      options: [
        { en: 'Over the blocked link', ja: '止められたリンクを通る' },
        { en: 'Via Switch A, around', ja: 'Switch A を回る' },
        { en: 'It is dropped at B', ja: 'Switch B で捨てられる' },
        { en: 'Both ways at once', ja: '両方の道を同時に' },
      ],
      answer: 1,
      explanation: {
        en: 'A blocked link carries no frames, so the frame goes around through Switch A. The spanning-tree lesson’s B → C button shows the detour.',
        ja: '止められたリンクはフレームを運ばないので、Switch A を回って届きます。スパニングツリーのレッスンの B → C で、回り道が見られます。',
      },
      taughtBy: 'stp',
    },
  ],
  [
    'bgp-local-pref-exit',
    {
      id: 'l2-bgp-higher-pref',
      prompt: {
        en: 'A route through provider A has LOCAL_PREF 200 and AS_PATH 65010 65020 65040. A route through B has LOCAL_PREF 100 and AS_PATH 65030 65040. Which is used?',
        ja: 'プロバイダ A 経由の経路は LOCAL_PREF 200、AS_PATH 65010 65020 65040。B 経由は LOCAL_PREF 100、AS_PATH 65030 65040 です。どちらを使いますか？',
      },
      options: [
        { en: 'B, shorter AS_PATH', ja: 'B（AS_PATH が短い）' },
        { en: 'A, higher LOCAL_PREF', ja: 'A（LOCAL_PREF が大きい）' },
        { en: 'Both, half each', ja: '両方の経路を半分ずつ' },
        { en: 'B, the lower LOCAL_PREF', ja: 'B（LOCAL_PREF が小さい）' },
      ],
      answer: 1,
      explanation: {
        en: 'LOCAL_PREF is compared first and the higher wins, before AS_PATH length is looked at (RFC 4271 §9.1). The dynamic routing lesson shows LOCAL_PREF choosing the exit.',
        ja: 'LOCAL_PREF が AS_PATH より先に比べられ、大きいほうが勝ちます（RFC 4271 §9.1）。動的ルーティングのレッスンで、LOCAL_PREF が出口を決める様子が見られます。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'stateful-firewall-reply',
    {
      id: 'l2-stateful-wrong-port',
      prompt: {
        en: 'An inside client opened a connection to a server’s port 443. A packet now arrives from that server’s port 80 to the client. The firewall lets in only replies. What happens?',
        ja: '内側のクライアントが、サーバの 443 番に接続しました。そのサーバの 80 番から、クライアントあてにパケットが来ます。ファイアウォールは返事だけを通します。どうなりますか？',
      },
      options: [
        { en: 'Let in, same server', ja: '通る（同じサーバ）' },
        { en: 'Refused, not that reply', ja: '通らない（別の通信）' },
        { en: 'Let in, as port 80 is web', ja: '通る（80 は Web）' },
        { en: 'Refused at the client', ja: 'クライアントで拒否' },
      ],
      answer: 1,
      explanation: {
        en: 'A reply must match the connection’s addresses and ports; port 80 does not belong to the 443 connection, so it is refused. The ACL lesson shows replies to the client’s own connection getting in.',
        ja: '返事は接続のアドレスとポートに合っていなければなりません。80 番は 443 番の接続のものではないので止められます。ACL のレッスンで、自分の接続への返事が通る様子が見られます。',
      },
      taughtBy: 'acl',
    },
  ],
  [
    'rip-vs-ospf',
    {
      id: 'l2-ospf-cost-pick',
      prompt: {
        en: 'To reach a LAN, the path through R2 has link costs 1, 1 and 1; the path through R3 has costs 2 and 2. Which path does OSPF choose?',
        ja: 'LAN へ行く道は、R2 経由がコスト 1、1、1、R3 経由がコスト 2、2 です。OSPF はどちらを選びますか？',
      },
      options: [
        { en: 'R3, fewer routers', ja: 'R3（ルータが少ない）' },
        { en: 'R2, total cost 3', ja: 'R2（合計 3）' },
        { en: 'Both, equal', ja: '両方（同じ）' },
        { en: 'R3, total cost 4', ja: 'R3（合計 4）' },
      ],
      answer: 1,
      explanation: {
        en: 'OSPF adds link costs: 3 through R2 against 4 through R3, so R2 wins even with more routers. The dynamic routing lesson contrasts this with RIP.',
        ja: 'OSPF はコストを足します。R2 経由は 3、R3 経由は 4 なので、ルータが多くても R2 を選びます。動的ルーティングのレッスンで、RIP と比べています。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'ospf-reconverge',
    {
      id: 'l2-ospf-no-action',
      prompt: {
        en: 'A link on R1’s best path fails. What must an administrator do so that R1 uses another path?',
        ja: 'R1 のいちばん良い道のリンクが切れます。R1 が別の道を使うように、管理者は何をしますか？',
      },
      options: [
        { en: 'Add a static route', ja: '静的な経路を足して使う' },
        { en: 'Restart R1 to recompute', ja: 'R1 を再起動して計算させる' },
        { en: 'Nothing, OSPF does it', ja: '何も（OSPF がする）' },
        { en: 'Remove the link', ja: '切れたリンクを外す' },
      ],
      answer: 2,
      explanation: {
        en: 'OSPF learns of the failure and recomputes on its own; nobody needs to touch R1. The OSPF convergence lesson shows the new route with no settings changed.',
        ja: 'OSPF は障害を知って自分で計算し直すので、だれも R1 に触れる必要はありません。OSPF の収束のレッスンで、設定を変えずに新しい経路になる様子が見られます。',
      },
      taughtBy: 'ospf',
    },
  ],
  [
    'mtu-df',
    {
      id: 'l2-mtu-reassembly',
      prompt: {
        en: 'Host A’s ping is cut into fragments by R1. Which device puts them back together?',
        ja: 'Host A の ping が R1 で断片に分けられます。元に戻すのはどの機器ですか？',
      },
      options: [
        { en: 'R1 itself', ja: 'R1 自身が組む' },
        { en: 'The next router', ja: '次のルータが組む' },
        { en: 'Host B, the target', ja: '宛先の Host B' },
        { en: 'Host A, the sender', ja: '送り主の Host A' },
      ],
      answer: 2,
      explanation: {
        en: 'Only the destination reassembles; routers on the way forward the pieces as they are (RFC 791). The MTU lesson shows Host B joining them.',
        ja: '元に戻すのは宛先だけで、途中のルータは断片をそのまま送ります（RFC 791）。MTU のレッスンで、Host B が組み立てる様子が見られます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    'acl-default-deny',
    {
      id: 'l2-acl-empty-list',
      prompt: {
        en: 'A router interface has an ACL with no rules in it at all. A client sends web traffic through it. What happens in the ACL lesson?',
        ja: 'ルータのインタフェースに、ルールが 1 つもない ACL が付いています。クライアントがそこを通して Web の通信を送ります。ACL のレッスンではどうなりますか？',
      },
      options: [
        { en: 'All of it is dropped', ja: 'すべて止まる' },
        { en: 'Only port 80 passes', ja: '80 番だけ通る' },
        { en: 'It passes, nothing filters', ja: '通る（何も絞らない）' },
        { en: 'It is logged, then dropped', ja: '記録したうえで止まる' },
      ],
      answer: 2,
      explanation: {
        en: 'In the ACL lesson a list with no rules filters nothing, as if there were no list. The guide notes this beside the lesson.',
        ja: 'ACL のレッスンでは、ルールのない一覧は何も絞らず、一覧がないのと同じです。ガイドにも、このレッスンの説明として書かれています。',
      },
      taughtBy: 'acl',
    },
  ],
  [
    'dhcp-order',
    {
      id: 'l2-dhcp-ack-first',
      prompt: {
        en: 'During DHCP, which message is the first that lets the laptop start using its address?',
        ja: 'DHCP の途中で、ノートパソコンが自分のアドレスを使い始めてよい最初のメッセージはどれですか？',
      },
      options: [
        { en: 'The OFFER', ja: 'OFFER の時点' },
        { en: 'The DISCOVER', ja: 'DISCOVER の時点' },
        { en: 'The REQUEST', ja: 'REQUEST の時点' },
        { en: 'The ACK', ja: 'ACK の時点' },
      ],
      answer: 3,
      explanation: {
        en: 'An OFFER only proposes an address; the laptop may use it once the server’s ACK confirms it (RFC 2131). The DHCP and DNS lesson shows “BOUND” after the ACK.',
        ja: 'OFFER は提案だけで、サーバの ACK で確定してから使えます（RFC 2131）。DHCP と DNS のレッスンで、ACK のあとに BOUND と出ます。',
      },
      taughtBy: 'dhcp',
    },
  ],
  [
    'ipv6-dual-stack',
    {
      id: 'l2-ipv6-hop-limit',
      prompt: {
        en: 'An IPv6 echo crosses R1. What does R1 change in the IPv6 header?',
        ja: 'IPv6 の Echo が R1 を通ります。R1 は IPv6 ヘッダの何を変えますか？',
      },
      options: [
        { en: 'Hop limit, down by one', ja: 'ホップリミットを 1 減らす' },
        { en: 'Source, to its own', ja: '送信元を自分に変える' },
        { en: 'The checksum, recomputed', ja: 'ヘッダのチェックサムを計算し直す' },
        { en: 'Nothing at all', ja: '何も変えずに渡す' },
      ],
      answer: 0,
      explanation: {
        en: 'Like IPv4’s TTL, the hop limit goes down by one at each router; IPv6 has no header checksum to recompute (RFC 8200). The IPv6 lesson shows the hop at R1.',
        ja: 'IPv4 の TTL と同じく、ホップリミットはルータごとに 1 減ります。IPv6 のヘッダにチェックサムはありません（RFC 8200）。IPv6 のレッスンで R1 のホップが見られます。',
      },
      taughtBy: 'ipv6',
    },
  ],
  [
    'ecmp-flow-hash',
    {
      id: 'l3-ecmp-path-down',
      prompt: {
        en: 'Leaf A shares flows over two equal-cost spines. Spine 2 fails. What happens to the flows that used Spine 2?',
        ja: 'Leaf A は 2 つの同じコストの Spine にフローを分けています。Spine 2 が止まります。Spine 2 を使っていたフローはどうなりますか？',
      },
      options: [
        { en: 'They move to Spine 1', ja: 'Spine 1 に移る' },
        { en: 'They are dropped', ja: 'そのまま捨てられる' },
        { en: 'They wait for Spine 2', ja: 'Spine 2 を待つ' },
        { en: 'They are copied twice', ja: '2 重に送られる' },
      ],
      answer: 0,
      explanation: {
        en: 'With one equal-cost path gone, every flow is hashed onto the one that remains. The ECMP lesson shares flows between the spines.',
        ja: '同じコストの道が 1 つ減ると、すべてのフローが残った道に振り分けられます。ECMP のレッスンで、Spine にフローを分けています。',
      },
      taughtBy: 'ecmp',
    },
  ],
  [
    'ospf-remote-failure',
    {
      id: 'l3-ospf-new-metric',
      prompt: {
        en: 'After a failure, R1’s new path to a LAN costs R1–R3 2, R3–R4 2 and R4’s LAN 1. What metric does R1 now show?',
        ja: '障害のあと、R1 の LAN への新しい道のコストは R1–R3 が 2、R3–R4 が 2、R4 の LAN が 1 です。R1 に出る値は？',
      },
      options: [
        { en: '3', ja: '3' },
        { en: '4', ja: '4' },
        { en: '5', ja: '5' },
        { en: '2', ja: '2' },
      ],
      answer: 2,
      explanation: {
        en: 'OSPF adds the costs: 2 + 2 + 1 = 5. The OSPF convergence lesson shows the metric rise after the failure.',
        ja: 'OSPF はコストを足します。2 + 2 + 1 = 5 です。OSPF の収束のレッスンで、障害のあと値が上がる様子が見られます。',
      },
      taughtBy: 'ospf-convergence',
    },
  ],
  [
    'vrrp-failover',
    {
      id: 'l3-vrrp-arp-answer',
      prompt: {
        en: 'R1 is the VRRP master for 10.10.0.1 and R2 the backup. A host asks by ARP for 10.10.0.1. Which router answers?',
        ja: 'R1 は 10.10.0.1 の VRRP マスター、R2 はバックアップです。ホストが ARP で 10.10.0.1 を尋ねます。答えるのはどちらですか？',
      },
      options: [
        { en: 'Both, the same MAC', ja: '両方（同じ MAC）' },
        { en: 'R2, the backup', ja: 'バックアップの R2' },
        { en: 'R1, the master', ja: 'マスターの R1' },
        { en: 'Neither, it is virtual', ja: 'どちらも（仮想だから）' },
      ],
      answer: 2,
      explanation: {
        en: 'Only the master answers for the virtual address, with the virtual MAC (RFC 5798). The gateway HA lesson names the master.',
        ja: '仮想アドレスに答えるのはマスターだけで、仮想 MAC を返します（RFC 5798）。ゲートウェイ冗長のレッスンでマスターが表示されます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'lacp-member-failure',
    {
      id: 'l3-lacp-both-down',
      prompt: {
        en: 'Both members of a two-link LACP port-channel fail. What happens to traffic through it?',
        ja: '2 本の LACP ポートチャネルの両方のメンバーが止まります。そこを通る通信はどうなりますか？',
      },
      options: [
        { en: 'It uses the first link', ja: '最初のリンクを使う' },
        { en: 'The channel is down', ja: 'チャネルが止まる' },
        { en: 'It is compressed', ja: '圧縮して送る' },
        { en: 'Nothing changes', ja: '何も変わらない' },
      ],
      answer: 1,
      explanation: {
        en: 'With no member left the port-channel itself is down, and nothing crosses it. The gateway HA lesson fails members one at a time.',
        ja: 'メンバーが残らないとポートチャネル自体が止まり、何も通りません。ゲートウェイ冗長のレッスンで、メンバーを 1 本ずつ止められます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'dnat-port-forward',
    {
      id: 'l3-dnat-no-rule',
      prompt: {
        en: 'The edge router forwards only TCP 8080 inward. An internet host opens a connection to its global address on TCP 22, and nobody inside started it. What happens?',
        ja: 'エッジのルータは TCP 8080 だけを内側へ転送します。インターネットの機器が、そのグローバルアドレスの TCP 22 に接続を開きます。内側のだれも始めていません。どうなりますか？',
      },
      options: [
        { en: 'It reaches Client A', ja: 'Client A に届く' },
        { en: 'It is dropped', ja: 'ルータで捨てられる' },
        { en: 'It goes to port 8080', ja: '8080 番へ行く' },
        { en: 'It reaches every client', ja: '全クライアントへ' },
      ],
      answer: 1,
      explanation: {
        en: 'With no forwarding rule and no matching table row there is nobody to send it to, so the router drops it. The NAT lesson shows only the 8080 rule letting traffic in.',
        ja: '転送ルールも表の一致もないので送り先がなく、ルータは捨てます。NAT のレッスンで、8080 のルールだけが通す様子が見られます。',
      },
      taughtBy: 'nat',
    },
  ],
  [
    'tcp-loss-recovery',
    {
      id: 'l3-rto-cwnd',
      prompt: {
        en: 'A retransmission timeout fires. What does cwnd become?',
        ja: '再送タイマーが切れます。cwnd はいくつになりますか？',
      },
      options: [
        { en: 'Half of what it was', ja: '元の値の半分' },
        { en: 'One segment', ja: '1 セグメント' },
        { en: 'ssthresh plus three', ja: 'ssthresh ＋ 3' },
        { en: 'It stays the same', ja: 'そのまま変わらない' },
      ],
      answer: 1,
      explanation: {
        en: 'After a timeout cwnd falls to one segment, the loss window, and slow start begins again (RFC 5681 §3.1). The TCP congestion lesson shows the drop after the timeout.',
        ja: 'タイムアウトのあと cwnd は 1 セグメントに下がり、スロースタートからやり直します（RFC 5681 §3.1）。TCP 輻輳制御のレッスンで、タイムアウト後の低下が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    'igmp-snooping-ports',
    {
      id: 'l3-igmp-other-vlan',
      prompt: {
        en: 'A receiver in VLAN 20 has joined 239.1.1.1. The sender is in VLAN 10 on the same switch, and nothing routes multicast between them. Does the receiver get the stream?',
        ja: 'VLAN 20 の受信者が 239.1.1.1 に参加しています。送り手は同じスイッチの VLAN 10 で、間でマルチキャストを中継するものはありません。受信者に届きますか？',
      },
      options: [
        { en: 'Yes, as it has joined', ja: '届く（参加済み）' },
        { en: 'Yes, same switch', ja: '届く（同じスイッチだから）' },
        { en: 'Only its first packet arrives', ja: '最初の 1 つだけ' },
        { en: 'No, VLANs keep it apart', ja: '届かない（VLAN が別）' },
      ],
      answer: 3,
      explanation: {
        en: 'A VLAN is its own network, so multicast does not cross into VLAN 20 without a router. The multicast lesson shows this receiver getting nothing.',
        ja: 'VLAN は別のネットワークなので、ルータなしでマルチキャストは VLAN 20 に入りません。マルチキャストのレッスンで、この受信者に届かない様子が見られます。',
      },
      taughtBy: 'multicast',
    },
  ],
  [
    'h3-head-of-line',
    {
      id: 'l3-h2-tcp-loss',
      prompt: {
        en: 'Over HTTP/2, one TCP segment carrying part of /b is lost. Why must /a, /c and /d wait too?',
        ja: 'HTTP/2 で、/b の一部を運ぶ TCP セグメントが 1 つ失われます。なぜ /a、/c、/d も待つのですか？',
      },
      options: [
        { en: 'They share one TCP stream', ja: '1 つの TCP の流れを共有' },
        { en: 'The server stops all four', ja: 'サーバが 4 つとも止める' },
        { en: 'HTTP/2 resends all four', ja: 'HTTP/2 が 4 つとも再送' },
        { en: 'They were also lost', ja: 'それらも失われた' },
      ],
      answer: 0,
      explanation: {
        en: 'TCP delivers bytes in order, so everything after the gap waits for the resend, whichever stream it belongs to. The HTTP/3 lesson compares this with QUIC.',
        ja: 'TCP はバイトを順番どおりに渡すので、穴のあとのデータはどのストリームでも再送を待ちます。HTTP/3 のレッスンで QUIC と比べています。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    'mpls-php',
    {
      id: 'l3-mpls-vpn-label',
      prompt: {
        en: 'A packet reaches PE2 with the VPN label 24010. What does that label tell PE2?',
        ja: 'パケットが VPN ラベル 24010 を付けて PE2 に着きます。そのラベルは PE2 に何を伝えますか？',
      },
      options: [
        { en: 'The next P router', ja: '次の P ルータ' },
        { en: 'Which customer VRF', ja: 'どの顧客の VRF か' },
        { en: 'The packet’s TTL', ja: 'パケットの TTL' },
        { en: 'The packet’s source MAC', ja: 'パケットの送信元 MAC' },
      ],
      answer: 1,
      explanation: {
        en: 'The VPN label picks the customer’s VRF, so PE2 knows which routing table to forward the packet in (RFC 4364). The MPLS lesson shows PE2 using it.',
        ja: 'VPN ラベルで顧客の VRF が決まり、PE2 はどの経路表で転送するかが分かります（RFC 4364）。MPLS のレッスンで、PE2 がそれを使う様子が見られます。',
      },
      taughtBy: 'mpls',
    },
  ],
  [
    'evpn-arp-suppression',
    {
      id: 'l3-evpn-miss-flood',
      prompt: {
        en: 'Host A asks by ARP for a host that Leaf1 has no EVPN Type-2 route for. ARP suppression is on. What does Leaf1 do?',
        ja: 'Host A が、Leaf1 に EVPN Type-2 経路のない機器を ARP で尋ねます。ARP 抑止は有効です。Leaf1 はどうしますか？',
      },
      options: [
        { en: 'Answers with its own MAC', ja: '自分の MAC で答える' },
        { en: 'Drops the request', ja: '要求を捨てる' },
        { en: 'Floods it to the VNI', ja: 'VNI に広げて送る' },
        { en: 'Asks the Type-5 route', ja: 'Type-5 経路に聞く' },
      ],
      answer: 2,
      explanation: {
        en: 'Suppression answers only from a known Type-2 entry; on a miss the request is flooded to the VTEPs of the VNI (RFC 7432). The VXLAN lesson shows the miss.',
        ja: '抑止は知っている Type-2 からしか答えません。見つからなければ、要求を VNI の VTEP に広げて送ります（RFC 7432）。VXLAN のレッスンで、見つからない場合が見られます。',
      },
      taughtBy: 'vxlan',
    },
  ],
  [
    'ecmp-exact-split',
    {
      id: 'l4-ecmp-unequal',
      prompt: {
        en: 'A router has two routes to the same network, one with cost 10 and one with cost 20. Does it share flows between them with ECMP?',
        ja: 'ルータは同じネットワークへの経路を 2 つ持ち、コストは 10 と 20 です。ECMP でフローを分けますか？',
      },
      options: [
        { en: 'Yes, two to one', ja: '分ける（2 対 1）' },
        { en: 'Yes, half each', ja: '分ける（半分ずつ）' },
        { en: 'No, all take cost 10', ja: '分けない（全部 10）' },
        { en: 'No, all take cost 20', ja: '分けない（全部 20）' },
      ],
      answer: 2,
      explanation: {
        en: 'ECMP shares only between routes of equal cost; here the cost-10 route alone is used. The ECMP lesson’s two routes have equal cost.',
        ja: 'ECMP が分けるのは同じコストの経路の間だけで、ここではコスト 10 の経路だけを使います。ECMP のレッスンの 2 つの経路は同じコストです。',
      },
      taughtBy: 'ecmp',
    },
  ],
  [
    'mtu-slider-floor-df',
    {
      id: 'l4-mtu-mf-last',
      prompt: {
        en: 'A packet is cut into three fragments. Which of them has the More Fragments flag cleared (0)?',
        ja: 'パケットが 3 つの断片に分けられます。More Fragments の印が 0 なのはどれですか？',
      },
      options: [
        { en: 'The first one', ja: '1 つ目の断片' },
        { en: 'The second one', ja: '2 つ目の断片' },
        { en: 'The last one', ja: '最後の 1 つ' },
        { en: 'None of them', ja: 'どれでもない' },
      ],
      answer: 2,
      explanation: {
        en: 'Every fragment but the last says more follow; the last one clears the flag (RFC 791). The MTU lesson shows the flag on each fragment.',
        ja: '最後以外の断片には「まだ続く」の印が付き、最後の 1 つだけ 0 です（RFC 791）。MTU のレッスンで、各断片の印が見られます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    'ha-fail-fail-restore',
    {
      id: 'l4-lacp-spread',
      prompt: {
        en: 'A two-link LACP bundle is up and carries many flows. How are the flows spread over the two links?',
        ja: '2 本の LACP バンドルが動いていて、多くのフローを運びます。フローは 2 本にどう分けられますか？',
      },
      options: [
        { en: 'Packet by packet, in turn', ja: 'パケットごとに交互' },
        { en: 'By a hash of each flow', ja: 'フローごとのハッシュ' },
        { en: 'All on the first link', ja: '全部を 1 本目に流す' },
        { en: 'By the packet’s size', ja: 'パケットの大きさ' },
      ],
      answer: 1,
      explanation: {
        en: 'Each flow is hashed to one member, so its packets stay in order and many flows share both links. The gateway HA lesson names each flow’s member.',
        ja: 'フローごとにハッシュで 1 本が決まるので、パケットの順番は保たれ、多くのフローが 2 本を分け合います。ゲートウェイ冗長のレッスンで、フローごとのメンバーが見られます。',
      },
      taughtBy: 'ha',
    },
  ],
  [
    'ospf-bgp-transit-link',
    {
      id: 'l4-ebgp-next-hop',
      prompt: {
        en: 'R2 learns a route over eBGP from its neighbour at 10.0.12.1. What next hop does the route carry?',
        ja: 'R2 は、隣の 10.0.12.1 から eBGP で経路を教わります。その経路の次のホップは？',
      },
      options: [
        { en: 'R2’s own interface address', ja: 'R2 自身のアドレス' },
        { en: '10.0.12.1, the neighbour', ja: '隣の 10.0.12.1' },
        { en: 'The network itself', ja: 'ネットワークそのもの' },
        { en: '0.0.0.0, meaning any', ja: '0.0.0.0（どれでも）' },
      ],
      answer: 1,
      explanation: {
        en: 'Over eBGP the sender puts its own address as NEXT_HOP, so the route points at 10.0.12.1 (RFC 4271 §5.1.3). The dynamic routing lesson lists BGP next hops.',
        ja: 'eBGP では送る側が自分のアドレスを NEXT_HOP に書くので、経路は 10.0.12.1 を指します（RFC 4271 §5.1.3）。動的ルーティングのレッスンで BGP の次のホップが並びます。',
      },
      taughtBy: 'dynamic',
    },
  ],
  [
    'ospf-reconverged-metrics',
    {
      id: 'l4-ospf-equal-cost',
      prompt: {
        en: 'After a change, R1 has two paths to a LAN that both cost 4. What does OSPF do with them?',
        ja: '変化のあと、R1 にはどちらもコスト 4 の、LAN への道が 2 つあります。OSPF はどうしますか？',
      },
      options: [
        { en: 'Keeps the older one', ja: '古いほうを使う' },
        { en: 'Uses both of them', ja: '両方を使う' },
        { en: 'Uses neither of them', ja: 'どちらも使わない' },
        { en: 'Asks the admin', ja: '管理者に聞く' },
      ],
      answer: 1,
      explanation: {
        en: 'OSPF keeps every equal-cost shortest path and may share traffic over them (RFC 2328 §16.1). The OSPF convergence lesson shows the routes R1 keeps.',
        ja: 'OSPF は同じコストの最短の道をすべて残し、通信を分けて使えます（RFC 2328 §16.1）。OSPF の収束のレッスンで、R1 が残す経路が見られます。',
      },
      taughtBy: 'ospf-convergence',
    },
  ],
  [
    'nat-port-order',
    {
      id: 'l4-nat-reply-back',
      prompt: {
        en: 'A reply arrives at the router’s global address on port 1025, and the table maps 1025 to Client B’s port 54321. What does the router do?',
        ja: '返事がルータのグローバルアドレスの 1025 番に届きます。表では 1025 が Client B の 54321 番に対応しています。ルータはどうしますか？',
      },
      options: [
        { en: 'Drops it, not asked', ja: '捨てる（求めていない）' },
        { en: 'Sends it to Client A', ja: 'Client A のほうに送る' },
        { en: 'Rewrites it to B, 54321', ja: 'B の 54321 に書き換え' },
        { en: 'Sends it to all clients', ja: '全クライアントに送る' },
      ],
      answer: 2,
      explanation: {
        en: 'The router puts back Client B’s address and port from its table and sends the reply on. The NAT lesson’s reply button shows the rewrite.',
        ja: 'ルータは表から Client B のアドレスとポートに戻して、返事を送ります。NAT のレッスンの返事のボタンで、書き換えが見られます。',
      },
      taughtBy: 'nat',
    },
  ],
  [
    'stp-two-priorities',
    {
      id: 'l4-stp-why',
      prompt: {
        en: 'Three switches are wired in a triangle with spanning tree turned off. A host sends one broadcast. What happens?',
        ja: '3 台のスイッチを三角形につなぎ、スパニングツリーを止めます。ある機器が全員あてに 1 つ送ります。どうなりますか？',
      },
      options: [
        { en: 'It is delivered once', ja: '1 回だけ届く' },
        { en: 'It circles and multiplies', ja: '回り続けて増える' },
        { en: 'It is dropped at once', ja: 'すぐに捨てられる' },
        { en: 'It goes to the root and stops', ja: 'ルートに行く' },
      ],
      answer: 1,
      explanation: {
        en: 'Each switch copies the broadcast to its other ports, and in a loop the copies come back forever: a broadcast storm. The spanning-tree lesson explains why one link is blocked.',
        ja: 'スイッチはそれぞれ全員あてをほかのポートに写すので、輪の中で写しがいつまでも戻ってきます（ブロードキャストストーム）。スパニングツリーのレッスンで、1 本を止める理由を説明しています。',
      },
      taughtBy: 'stp',
    },
  ],
  [
    'qos-bandwidth-for-target',
    {
      id: 'l4-qos-crossing',
      prompt: {
        en: 'Sending a packet onto a link takes 2 ms and the link adds 10 ms of delay. How long does the packet take to cross?',
        ja: 'パケットをリンクに送り出すのに 2 ms かかり、リンクには 10 ms の遅れがあります。パケットが渡りきるまでの時間は？',
      },
      options: [
        { en: '10 ms', ja: '10 ms' },
        { en: '12 ms', ja: '12 ms' },
        { en: '20 ms', ja: '20 ms' },
        { en: '8 ms', ja: '8 ms' },
      ],
      answer: 1,
      explanation: {
        en: 'Crossing time is sending time plus propagation delay: 2 + 10 = 12 ms. The per-link QoS lesson splits the time this way.',
        ja: '渡る時間は、送り出す時間と伝わる遅れの合計で、2 + 10 = 12 ms です。リンクごとの QoS のレッスンで、こうして分けて示します。',
      },
      taughtBy: 'link-qos',
    },
  ],
  [
    'wifi-distance-loss',
    {
      id: 'l4-wifi-csma',
      prompt: {
        en: 'Two stations on one Wi-Fi channel both have a frame to send. How does 802.11 try to avoid them sending at the same time?',
        ja: '同じ Wi-Fi のチャネルの 2 台が、どちらも送るフレームを持っています。802.11 は同時に送らないよう、どうしますか？',
      },
      options: [
        { en: 'Each listens, then waits', ja: '聞いてから待つ' },
        { en: 'The AP gives fixed slots', ja: 'AP が時間を割り当てる' },
        { en: 'They send at once', ja: '両方すぐに送る' },
        { en: 'They use cables', ja: 'ケーブルを使う' },
      ],
      answer: 0,
      explanation: {
        en: 'Stations listen before sending and wait a random backoff if the channel is busy: CSMA/CA (IEEE 802.11). The wireless lesson notes the shared channel.',
        ja: '端末は送る前にチャネルを聞き、使われていればランダムな時間待ちます（CSMA/CA、IEEE 802.11）。無線のレッスンで、チャネルを共有することが示されます。',
      },
      taughtBy: 'wireless',
    },
  ],
  [
    'tcp-third-dupack-state',
    {
      id: 'l4-fast-recovery-cwnd',
      prompt: {
        en: 'MSS is 1000 bytes. At the third duplicate ACK ssthresh is set to 4000 bytes. What does cwnd become?',
        ja: 'MSS は 1000 バイトです。3 個目の重複 ACK で ssthresh が 4000 バイトになります。cwnd はいくつになりますか？',
      },
      options: [
        { en: '4000 bytes', ja: '4000 バイト' },
        { en: '1000 bytes', ja: '1000 バイト' },
        { en: '7000 bytes', ja: '7000 バイト' },
        { en: '8000 bytes', ja: '8000 バイト' },
      ],
      answer: 2,
      explanation: {
        en: 'cwnd = ssthresh + 3 × MSS = 4000 + 3000 = 7000, for the three segments that left the network (RFC 5681 §3.2). The TCP congestion lesson shows cwnd at that step.',
        ja: 'cwnd = ssthresh + 3 × MSS = 4000 + 3000 = 7000 です。ネットワークを出た 3 つのセグメント分です（RFC 5681 §3.2）。TCP 輻輳制御のレッスンで、そのステップの cwnd が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    's7-tls-clear',
    {
      id: 'l8-tls-cert-hidden',
      prompt: {
        en: 'An on-path device records a TLS 1.3 handshake. Can it read the server’s certificate?',
        ja: '経路上の機器が TLS 1.3 のハンドシェイクを記録します。サーバの証明書を読めますか？',
      },
      options: [
        { en: 'Yes, it is in the clear', ja: '読める（平文で流れる）' },
        { en: 'Yes, in the ServerHello', ja: '読める（ServerHello）' },
        { en: 'No, it is encrypted', ja: '読めない（暗号化される）' },
        { en: 'No, it is never sent', ja: '読めない（送られない）' },
      ],
      answer: 2,
      explanation: {
        en: 'In TLS 1.3 the Certificate comes after the ServerHello and is encrypted (RFC 8446), unlike TLS 1.2. The HTTPS lesson marks what is encrypted.',
        ja: 'TLS 1.3 では Certificate は ServerHello のあとで暗号化されます（RFC 8446）。TLS 1.2 とは違います。HTTPS のレッスンで、暗号化されるものが示されます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-alpn-hidden',
    {
      id: 'l8-alpn-no-match',
      prompt: {
        en: 'A browser offers only h2 by ALPN, and the server supports only http/1.1 and insists on ALPN. What happens?',
        ja: 'ブラウザは ALPN で h2 だけを示し、サーバは http/1.1 しか使えず ALPN を必須にしています。どうなりますか？',
      },
      options: [
        { en: 'They use http/1.1', ja: 'http/1.1 を使う' },
        { en: 'They use h2 all the same', ja: 'それでも h2' },
        { en: 'The handshake fails', ja: 'ハンドシェイクが失敗' },
        { en: 'They use HTTP/3', ja: 'HTTP/3 を使う' },
      ],
      answer: 2,
      explanation: {
        en: 'With no protocol in common the server ends the handshake with a no_application_protocol alert (RFC 7301 §3.2). The HTTPS lesson shows an ALPN mismatch.',
        ja: '共通のプロトコルがなければ、サーバは no_application_protocol の警告でハンドシェイクを終えます（RFC 7301 §3.2）。HTTPS のレッスンで ALPN が合わない場合が見られます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-order',
    {
      id: 'l8-tls-client-finished',
      prompt: {
        en: 'The server has sent its Finished. What does the client send to complete a full TLS 1.3 handshake?',
        ja: 'サーバが Finished を送りました。TLS 1.3 の完全なハンドシェイクを終えるため、クライアントは何を送りますか？',
      },
      options: [
        { en: 'Its own Finished', ja: '自分の Finished' },
        { en: 'A ClientHello', ja: 'ClientHello' },
        { en: 'Its own certificate', ja: '自分の証明書（Certificate）' },
        { en: 'A ServerHello', ja: 'ServerHello' },
      ],
      answer: 0,
      explanation: {
        en: 'The client answers with its own Finished, which proves it saw the same handshake (RFC 8446 §2). The HTTPS lesson lists both Finished messages.',
        ja: 'クライアントは自分の Finished を返し、同じハンドシェイクを見たことを示します（RFC 8446 §2）。HTTPS のレッスンで、両方の Finished が並びます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-tls-first-data',
    {
      id: 'l8-tls-response',
      prompt: {
        en: 'After the handshake the server sends the HTTP response. Can a device on the path read it?',
        ja: 'ハンドシェイクのあと、サーバが HTTP の応答を送ります。経路上の機器は読めますか？',
      },
      options: [
        { en: 'Yes, it is plain HTTP', ja: '読める（平文の HTTP）' },
        { en: 'Only its headers', ja: 'ヘッダだけ読める' },
        { en: 'No, it is encrypted', ja: '読めない（暗号化）' },
        { en: 'Only its first line', ja: '1 行目だけ読める' },
      ],
      answer: 2,
      explanation: {
        en: 'All application data after the handshake travels in encrypted records. The HTTPS lesson shows the request and response as application data.',
        ja: 'ハンドシェイクのあとのデータは、すべて暗号化されたレコードで流れます。HTTPS のレッスンで、要求と応答がアプリケーションデータとして見られます。',
      },
      taughtBy: 'https',
    },
  ],
  [
    's7-h2-one-connection',
    {
      id: 'l8-h1-connections',
      prompt: {
        en: 'A browser fetches /a to /d over HTTP/1.1, which has one request at a time per connection. To fetch them side by side, what does it do?',
        ja: 'ブラウザが HTTP/1.1 で /a〜/d を取ります。HTTP/1.1 は接続ごとに一度に 1 つの要求です。並べて取るにはどうしますか？',
      },
      options: [
        { en: 'Uses one connection', ja: '1 つの接続を使う' },
        { en: 'Opens several connections', ja: '複数の接続を開く' },
        { en: 'Uses UDP instead', ja: 'UDP を使う' },
        { en: 'Sends one big request instead', ja: '1 つにまとめる' },
      ],
      answer: 1,
      explanation: {
        en: 'HTTP/1.1 serves one request at a time on a connection, so browsers open several TCP connections in parallel; HTTP/2 needs only one. The HTTP/2 lesson makes this comparison.',
        ja: 'HTTP/1.1 は 1 つの接続で一度に 1 つなので、ブラウザは TCP 接続を複数並べて開きます。HTTP/2 なら 1 つで足ります。HTTP/2 のレッスンでこの比較をしています。',
      },
      taughtBy: 'http2',
    },
  ],
  [
    's7-h2-stream-ids',
    {
      id: 'l8-h2-server-ids',
      prompt: {
        en: 'Over HTTP/2, which stream IDs may the server itself open, for example to push a resource?',
        ja: 'HTTP/2 で、サーバ自身が開けるストリーム ID は（たとえばプッシュのため）どれですか？',
      },
      options: [
        { en: 'Only odd numbers', ja: '奇数の ID' },
        { en: 'Even numbers', ja: '偶数の ID' },
        { en: 'Only stream 0', ja: '0 番だけ' },
        { en: 'Any number', ja: 'どの数でもよい' },
      ],
      answer: 1,
      explanation: {
        en: 'Client-opened streams are odd and server-opened streams are even; 0 is the connection itself (RFC 9113 §5.1.1). The HTTP/2 lesson shows the client’s odd IDs.',
        ja: 'クライアントが開くのは奇数、サーバが開くのは偶数で、0 は接続そのものです（RFC 9113 §5.1.1）。HTTP/2 のレッスンで、クライアントの奇数の ID が見られます。',
      },
      taughtBy: 'http2',
    },
  ],
  [
    's7-h3-stream-ids',
    {
      id: 'l8-h3-low-bits',
      prompt: {
        en: 'In QUIC, what do the two lowest bits of stream ID 3 say about the stream?',
        ja: 'QUIC で、ストリーム ID 3 の下位 2 ビットは何を表しますか？',
      },
      options: [
        { en: 'Client, both ways', ja: 'クライアント・双方向' },
        { en: 'Server, both ways', ja: 'サーバ・双方向' },
        { en: 'Client, one way', ja: 'クライアント・一方向' },
        { en: 'Server, one way', ja: 'サーバ・一方向' },
      ],
      answer: 3,
      explanation: {
        en: '3 is binary 11: bit 0 set means the server opened it, bit 1 set means one way only (RFC 9000 §2.1). The HTTP/3 lesson explains the low bits.',
        ja: '3 は 2 進数で 11 です。ビット 0 が 1 ならサーバが開き、ビット 1 が 1 なら一方向です（RFC 9000 §2.1）。HTTP/3 のレッスンで、下位ビットを説明しています。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    's7-h3-udp-firewall',
    {
      id: 'l8-quic-port',
      prompt: {
        en: 'HTTP/3 for an https:// site usually travels to which port?',
        ja: 'https:// のサイトへの HTTP/3 は、ふつうどのポートに送られますか？',
      },
      options: [
        { en: 'TCP 443', ja: 'TCP の 443' },
        { en: 'UDP 443', ja: 'UDP の 443' },
        { en: 'UDP 53', ja: 'UDP の 53' },
        { en: 'TCP 80', ja: 'TCP の 80' },
      ],
      answer: 1,
      explanation: {
        en: 'HTTP/3 runs on QUIC over UDP, usually to port 443, the same number HTTPS uses on TCP. The HTTP/3 lesson shows UDP 443.',
        ja: 'HTTP/3 は UDP の上の QUIC で動き、ふつう 443 番を使います。TCP の HTTPS と同じ番号です。HTTP/3 のレッスンで UDP の 443 が見られます。',
      },
      taughtBy: 'http3',
    },
  ],
  [
    's7-cc-rto-ssthresh',
    {
      id: 'l8-rto-ssthresh-floor',
      prompt: {
        en: 'MSS is 1000 bytes. A retransmission timeout fires with only 1000 bytes in flight. What becomes the new ssthresh?',
        ja: 'MSS は 1000 バイトです。送信中が 1000 バイトだけのときに再送タイマーが切れます。新しい ssthresh はいくつですか？',
      },
      options: [
        { en: '500 bytes', ja: '500 バイト' },
        { en: '1000 bytes', ja: '1000 バイト' },
        { en: '2000 bytes', ja: '2000 バイト' },
        { en: '4000 bytes', ja: '4000 バイト' },
      ],
      answer: 2,
      explanation: {
        en: 'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(500, 2000) = 2000: it never goes below two segments (RFC 5681 §3.1). The TCP congestion lesson shows ssthresh after a timeout.',
        ja: 'ssthresh = max(送信中 ÷ 2, 2 × MSS) = max(500, 2000) = 2000 で、2 セグメントより下がりません（RFC 5681 §3.1）。TCP 輻輳制御のレッスンで、タイムアウト後の ssthresh が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
  [
    's7-cc-deflate',
    {
      id: 'l8-after-deflate',
      prompt: {
        en: 'Fast recovery has just ended and cwnd equals ssthresh. How does cwnd grow from now on, while no loss occurs?',
        ja: '高速回復が終わり、cwnd は ssthresh と同じです。この先、損失がない間 cwnd はどう増えますか？',
      },
      options: [
        { en: 'Doubles every RTT', ja: '往復ごとに 2 倍' },
        { en: 'About one MSS per RTT', ja: '往復ごとに約 1 MSS' },
        { en: 'Stays the same', ja: 'そのまま変わらない' },
        { en: 'It falls back to one segment', ja: '1 セグメントにまで戻る' },
      ],
      answer: 1,
      explanation: {
        en: 'At or above ssthresh the sender is in congestion avoidance and adds about one MSS per round trip (RFC 5681 §3.1). The TCP congestion lesson shows the slower growth.',
        ja: 'ssthresh 以上では輻輳回避で、往復ごとに約 1 MSS ずつ増やします（RFC 5681 §3.1）。TCP 輻輳制御のレッスンで、ゆっくりした増え方が見られます。',
      },
      taughtBy: 'tcp-congestion',
    },
  ],
];

/** The further questions of each slot, by the id of its original question. */
export const POOL_B: ReadonlyMap<string, readonly ExamQuestion[]> = ENTRIES.reduce(
  (pool, [slot, question]) => pool.set(slot, [...(pool.get(slot) ?? []), question]),
  new Map<string, readonly ExamQuestion[]>(),
);
