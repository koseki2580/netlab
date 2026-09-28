import type { ExamLevel } from './examQuestions';

/**
 * Level 2 of the final test: how networks behave once the parts are known —
 * VLANs and switch loops, how routers pick and change routes, packet size,
 * filtering, address hand-out and IPv6. Every answer was checked against what
 * the named lesson shows or does when run.
 */
export const EXAM_LEVEL_2: ExamLevel = {
  level: 2,
  title: { en: 'Level 2 · Intermediate', ja: 'レベル 2・中級' },
  summary: {
    en: 'How networks behave: VLANs and loops, how routes are chosen and changed, packet size, filtering and IPv6.',
    ja: 'ネットワークのふるまい。VLAN とループ、経路の選ばれ方と切り替わり方、パケットの大きさ、フィルタ、IPv6。',
  },
  path: [
    {
      id: 'vlan',
      path: '/networking/vlan',
      title: { en: 'VLAN Segmentation', ja: 'VLAN による分離' },
      teaches: {
        en: 'Splitting one switch into separate networks',
        ja: '1 台のスイッチを別々のネットワークに分けること',
      },
    },
    {
      id: 'stp',
      path: '/networking/stp',
      title: { en: 'Spanning Tree', ja: 'スパニングツリー' },
      teaches: {
        en: 'Redundant links between switches',
        ja: 'スイッチどうしの冗長なリンク',
      },
    },
    {
      id: 'step',
      path: '/simulation/step',
      title: { en: 'Step-by-Step', ja: '1ホップずつ進める' },
      teaches: {
        en: 'How a router picks a row of its route table',
        ja: 'ルータが経路表の行を選ぶしくみ',
      },
    },
    {
      id: 'trace',
      path: '/simulation/trace-inspector',
      title: { en: 'Trace Inspector', ja: '通信の詳細を見る' },
      teaches: {
        en: 'What changes in a packet from hop to hop',
        ja: 'ホップごとにパケットの何が変わるか',
      },
    },
    {
      id: 'dynamic',
      path: '/routing/dynamic',
      title: { en: 'Dynamic Routing', ja: '動的ルーティング' },
      teaches: {
        en: 'Routing protocols and how they measure a path',
        ja: 'ルーティングプロトコルと、経路の測り方',
      },
    },
    {
      id: 'ospf',
      path: '/routing/ospf-convergence',
      title: { en: 'OSPF Convergence', ja: 'OSPF の収束' },
      teaches: {
        en: 'When a link on the path fails',
        ja: '経路の途中のリンクが落ちたとき',
      },
    },
    {
      id: 'mtu',
      path: '/networking/mtu-fragmentation',
      title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
      teaches: {
        en: 'Packets larger than a link allows',
        ja: 'リンクの上限より大きいパケット',
      },
    },
    {
      id: 'acl',
      path: '/simulation/acl',
      title: { en: 'Firewalls & ACLs', ja: 'ファイアウォールと ACL' },
      teaches: {
        en: 'Filtering traffic on a router',
        ja: 'ルータで通信をふるい分けること',
      },
    },
    {
      id: 'dhcp',
      path: '/services/dhcp-dns',
      title: { en: 'DHCP & DNS', ja: 'DHCP と DNS' },
      teaches: {
        en: 'The messages that give a new device its address',
        ja: '新しい機器にアドレスが決まるまでのやりとり',
      },
    },
    {
      id: 'ipv6',
      path: '/networking/ipv6',
      title: { en: 'IPv6 Dual-Stack', ja: 'IPv6 デュアルスタック' },
      teaches: {
        en: 'IPv6 addresses alongside IPv4',
        ja: 'IPv4 と並ぶ IPv6 のアドレス',
      },
    },
  ],
  questions: [
    {
      id: 'vlan-same-switch',
      prompt: {
        en: 'A1 (VLAN 10) and B1 (VLAN 20) are plugged into the same switch, SW1. In this lesson’s network, how does a packet from A1 reach B1?',
        ja: 'A1（VLAN 10）と B1（VLAN 20）は同じスイッチ SW1 につながっています。このレッスンのネットワークで、A1 から B1 へのパケットはどう届きますか？',
      },
      options: [
        {
          en: 'SW1 sends it straight to B1’s port, because both are on SW1',
          ja: '両方とも SW1 にいるので、SW1 がそのまま B1 のポートへ送る',
        },
        {
          en: 'SW1 copies it to every port, and B1 keeps it',
          ja: 'SW1 がすべてのポートにコピーし、B1 が受け取る',
        },
        {
          en: 'SW1 sends it up the trunk to the router R1, which routes it back down into VLAN 20',
          ja: 'SW1 がトランクでルータ R1 へ送り、R1 が VLAN 20 側へ転送して戻す',
        },
        {
          en: 'It never can — different VLANs can never talk, even through a router',
          ja: '届くことはない。VLAN が違えば、ルータを通しても話せない',
        },
      ],
      answer: 2,
      explanation: {
        en: 'Different VLANs are different networks even on one switch, so the switch cannot hand the frame across; the lesson’s trace goes A1 → SW1 → R1 → SW1 → B1. Cut the trunk and A1 → B1 is dropped at SW1 while A1 → A2 (same VLAN) still arrives.',
        ja: 'VLAN が違えば、同じスイッチの上でも別のネットワークなので、スイッチはそのまま渡せません。レッスンの記録は A1 → SW1 → R1 → SW1 → B1 で、トランクを切ると A1 → B1 は SW1 で落ち、同じ VLAN の A1 → A2 は届きます。',
      },
      taughtBy: 'vlan',
    },
    {
      id: 'stp-root',
      prompt: {
        en: 'Three switches are wired in a triangle. Switch A (priority 4096) is the root, and the Switch B – Switch C link is blocked. You set Switch C’s priority to 0. What happens?',
        ja: '3 台のスイッチが三角形につながっています。Switch A（優先度 4096）がルートで、Switch B – Switch C のリンクが遮断されています。Switch C の優先度を 0 にすると、どうなりますか？',
      },
      options: [
        {
          en: 'Nothing — Switch A stays root because it was elected first',
          ja: '何も変わらない。先に選ばれた Switch A がルートのまま',
        },
        {
          en: 'Switch C becomes the root, and spanning tree chooses again which link to block',
          ja: 'Switch C がルートになり、どのリンクを遮断するかが選び直される',
        },
        {
          en: 'Switch C blocks all its links, because a lower priority means less important',
          ja: '優先度が低い（数が小さい）ほど重要でないので、Switch C のリンクがすべて遮断される',
        },
        {
          en: 'All three links forward, because a root removes the loop by itself',
          ja: 'ルートがあればループはなくなるので、3 本のリンクがすべて使われる',
        },
      ],
      answer: 1,
      explanation: {
        en: 'The switch with the lowest priority number becomes the root, and the tree is rebuilt around it. In the lesson, Switch C becomes root, the blocked link moves to Switch A – Switch B, and B → C now goes directly.',
        ja: '優先度の数がいちばん小さいスイッチがルートになり、ツリーはそこを中心に作り直されます。レッスンでは Switch C がルートになり、遮断されるのは Switch A – Switch B に移り、B → C は直接届くようになります。',
      },
      taughtBy: 'stp',
    },
    {
      id: 'longest-prefix',
      prompt: {
        en: 'R-1’s route table has both 203.0.113.0/24 and 0.0.0.0/0. A packet for 203.0.113.10 arrives. Which row does R-1 use?',
        ja: 'R-1 の経路表には 203.0.113.0/24 と 0.0.0.0/0 の両方があります。203.0.113.10 あてのパケットが届きました。R-1 はどの行を使いますか？',
      },
      options: [
        {
          en: '0.0.0.0/0 — the default route matches everything, so it is used first',
          ja: '0.0.0.0/0。デフォルト経路はすべてに一致するので、先に使われる',
        },
        {
          en: '203.0.113.0/24 — both match, and the longer (more specific) prefix wins',
          ja: '203.0.113.0/24。どちらも一致し、より長い（詳しい）プレフィックスが選ばれる',
        },
        {
          en: 'Neither — a router needs a row for exactly 203.0.113.10',
          ja: 'どちらでもない。ルータには 203.0.113.10 ぴったりの行が必要',
        },
        {
          en: 'Both — the packet is copied out along each matching row',
          ja: '両方。一致した行ごとにパケットがコピーされて送られる',
        },
      ],
      answer: 1,
      explanation: {
        en: 'A router compares all rows and, of those that match, uses the one with the longest prefix — /24 beats /0. In the lesson, R-1’s table marks 0.0.0.0/0 as a match but 203.0.113.0/24 as the one adopted.',
        ja: 'ルータはすべての行と比べ、一致した行のうちプレフィックスがいちばん長いものを使います。/24 は /0 より長いので勝ちます。レッスンの R-1 の表では 0.0.0.0/0 は「一致」、203.0.113.0/24 が「採用」でした。',
      },
      taughtBy: 'step',
    },
    {
      id: 'ttl',
      prompt: {
        en: 'The client sends a packet with TTL 64. It passes three routers (R-1, R-2, R-3) and reaches the server. What TTL does the server see?',
        ja: 'クライアントが TTL 64 のパケットを送ります。3 台のルータ（R-1、R-2、R-3）を通ってサーバに届きました。サーバが受け取ったときの TTL はいくつですか？',
      },
      options: [
        {
          en: '64 — only the sender sets the TTL; nothing on the way changes it',
          ja: '64。TTL を決めるのは送り手だけで、途中では変わらない',
        },
        {
          en: '61 — each router takes one off as it forwards',
          ja: '61。ルータが転送するたびに 1 ずつ減らす',
        },
        {
          en: '60 — every device after the client takes one off, the server included',
          ja: '60。クライアントの次からは、サーバも含めて機器ごとに 1 ずつ減る',
        },
        {
          en: '0 — TTL counts down to zero when the packet arrives',
          ja: '0。パケットが届いた時点で TTL は 0 になる',
        },
      ],
      answer: 1,
      explanation: {
        en: 'Each router subtracts one when it forwards, so three routers make 64 → 61; a packet whose TTL reaches zero is dropped, which is what stops one circling forever in a loop. In the lesson, the CREATE hop shows TTL 64 and the server’s DELIVER hop shows TTL 61.',
        ja: 'ルータは転送するたびに TTL を 1 減らすので、3 台で 64 → 61 になります。0 になったパケットは捨てられ、ループで回り続けるのを止めます。レッスンでは、最初の CREATE のホップが TTL 64、サーバの DELIVER のホップが TTL 61 でした。',
      },
      taughtBy: 'trace',
    },
    {
      id: 'rip-vs-ospf',
      prompt: {
        en: 'R1 can reach C2 through R2 or through R3 — two routers either way. The R1 – R3 link is given cost 3; the other links cost 1. How do RIP and OSPF measure these two paths?',
        ja: 'R1 から C2 へは R2 経由と R3 経由があり、どちらもルータ 2 台ぶんです。R1 – R3 のリンクはコスト 3、ほかのリンクはコスト 1 にしてあります。RIP と OSPF は、この 2 つの経路をどう測りますか？',
      },
      options: [
        {
          en: 'Both count routers, so both see the two paths as equal',
          ja: 'どちらもルータの数を数えるので、どちらにとっても 2 つの経路は同じ',
        },
        {
          en: 'Both add up link costs, so both avoid the R3 path',
          ja: 'どちらもリンクのコストを足すので、どちらも R3 経由を避ける',
        },
        {
          en: 'RIP counts hops, so the paths tie; OSPF adds link costs, so the R2 path (3) beats the R3 path (5)',
          ja: 'RIP はホップ数を数えるので同点。OSPF はリンクのコストを足すので、R2 経由（3）が R3 経由（5）に勝つ',
        },
        {
          en: 'RIP adds link costs; OSPF counts hops',
          ja: 'RIP はリンクのコストを足し、OSPF はホップ数を数える',
        },
      ],
      answer: 2,
      explanation: {
        en: 'RIP’s only measure is hop count, so it cannot see the cost 3 and just keeps the first 2-hop path it learned; OSPF’s SPF adds interface costs and prefers the cheaper R2 side. For C2’s network the lesson’s RIP table shows metric 2 (two routers away) and its OSPF table shows metric 3 (R1→R2, R2→R4 and R4’s interface on C2’s LAN, cost 1 each).',
        ja: 'RIP が測るのはホップ数だけなのでコスト 3 は見えず、先に覚えた 2 ホップの経路を使います。OSPF の SPF はインタフェースのコストを足し、安い R2 側を選びます。C2 のネットワークについて、レッスンの RIP の経路表はメトリック 2（ルータ 2 台先）、OSPF の経路表はメトリック 3（R1→R2、R2→R4、C2 の LAN 上の R4 のインタフェースが各 1）を示します。',
      },
      taughtBy: 'dynamic',
    },
    {
      id: 'ospf-reconverge',
      prompt: {
        en: 'R1 sends traffic for C2 over the lower-cost path through R2. The link on that path fails, and nobody changes any settings. In this lesson, what happens to the next packet from C1 to C2?',
        ja: 'R1 は C2 あての通信を、コストの低い R2 経由で送っています。その経路のリンクが落ち、誰も設定を変えません。このレッスンで、C1 から C2 への次のパケットはどうなりますか？',
      },
      options: [
        {
          en: 'It is dropped until someone adds a static route through R3',
          ja: '誰かが R3 経由の静的経路を足すまで、落ち続ける',
        },
        {
          en: 'R1 keeps sending it toward R2, because a chosen route never changes',
          ja: '一度選んだ経路は変わらないので、R1 は R2 へ送り続ける',
        },
        {
          en: 'R1 recalculates by itself and sends it through R3, at a higher cost',
          ja: 'R1 が自分で計算し直し、コストは高くなるが R3 経由で送る',
        },
        {
          en: 'R1 sends it through both R2 and R3 at once to be safe',
          ja: '念のため、R1 は R2 と R3 の両方へ同時に送る',
        },
      ],
      answer: 2,
      explanation: {
        en: 'A routing protocol notices the lost link and recomputes the best path on its own — something a static route cannot do. In the lesson, R1’s preferred route changes from next hop 10.0.12.2 (metric 3) to 10.0.13.2 (metric 5), and the probe goes C1 → R1 → R3 → R4 → C2.',
        ja: 'ルーティングプロトコルはリンクが消えたことに気づき、自分で最良の経路を計算し直します。静的経路にはできないことです。レッスンでは R1 の優先経路が次ホップ 10.0.12.2（メトリック 3）から 10.0.13.2（メトリック 5）に変わり、プローブは C1 → R1 → R3 → R4 → C2 と進みました。',
      },
      taughtBy: 'ospf',
    },
    {
      id: 'mtu-df',
      prompt: {
        en: 'Host A pings Host B with a 1200-byte payload and the DF (Don’t Fragment) bit set. R1’s next link has an MTU of 600 bytes. What happens?',
        ja: 'Host A が、DF（分割禁止）ビットを立てて、ペイロード 1200 バイトの ping を Host B へ送ります。R1 の先のリンクの MTU は 600 バイトです。どうなりますか？',
      },
      options: [
        {
          en: 'R1 splits it into fragments anyway, and Host B reassembles them',
          ja: 'R1 はそれでも断片に分け、Host B が組み立て直す',
        },
        {
          en: 'R1 cuts the packet down to 600 bytes and throws the rest away',
          ja: 'R1 はパケットを 600 バイトに切り詰め、残りは捨てる',
        },
        {
          en: 'R1 drops it and sends Host A an ICMP “Fragmentation Needed” message giving the MTU',
          ja: 'R1 はパケットを捨て、MTU を知らせる ICMP「Fragmentation Needed」を Host A へ返す',
        },
        {
          en: 'The link carries it anyway, because MTU is only a recommendation',
          ja: 'MTU は目安にすぎないので、リンクはそのまま運ぶ',
        },
      ],
      answer: 2,
      explanation: {
        en: 'DF forbids splitting, so a packet too big for the next link cannot go on; the router drops it and tells the sender the MTU so it can send smaller. In the lesson, with DF set the trace shows a DROP at R1 (“fragmentation-needed”) and an ICMP back to Host A with next-hop MTU 600; without DF, three fragments arrive and Host B reassembles them.',
        ja: 'DF は分割を禁じるので、次のリンクに大きすぎるパケットは先へ進めません。ルータは捨てて、小さくして送り直せるよう送り手に MTU を知らせます。レッスンでは DF ありで R1 に DROP（fragmentation-needed）が出て、次ホップの MTU 600 を載せた ICMP が Host A に戻りました。DF なしでは 3 つの断片が届き、Host B が組み立て直しました。',
      },
      taughtBy: 'mtu',
    },
    {
      id: 'acl-default-deny',
      prompt: {
        en: 'The router’s inbound ACL on its LAN side has two rules: permit TCP to port 80, permit TCP to port 443. A client on the LAN tries SSH (TCP port 22) to the server. What happens?',
        ja: 'ルータの LAN 側の入口 ACL には「TCP 80 番を許可」「TCP 443 番を許可」の 2 行だけがあります。LAN のクライアントがサーバへ SSH（TCP 22 番）を試みます。どうなりますか？',
      },
      options: [
        {
          en: 'It passes — no rule says to deny port 22',
          ja: '通る。22 番を拒否する行がないから',
        },
        {
          en: 'It passes — an ACL only lists which traffic to log',
          ja: '通る。ACL は記録する通信を並べているだけだから',
        },
        {
          en: 'It is dropped at the router — no rule matches, so the default policy denies it',
          ja: 'ルータで落ちる。一致する行がないので、既定のポリシーで拒否される',
        },
        {
          en: 'It reaches the server, which refuses it because it has no SSH',
          ja: 'サーバまで届き、SSH がないのでサーバが断る',
        },
      ],
      answer: 2,
      explanation: {
        en: 'A router checks the rules in order, and traffic that matches none of them is denied by default — an ACL of permits is a list of what may pass. In the lesson, HTTP matches rule #10 and is permitted, while SSH is dropped at R-FW with the rule shown as the default policy and the action DENY.',
        ja: 'ルータは行を順に確かめ、どの行にも一致しない通信は既定で拒否します。許可の行を並べた ACL は「通してよいもの」の一覧です。レッスンでは HTTP は #10 の行に一致して許可され、SSH は R-FW で、ルールが「既定のポリシー」、処理が DENY として落ちました。',
      },
      taughtBy: 'acl',
    },
    {
      id: 'dhcp-order',
      prompt: {
        en: 'A laptop has just been plugged in and has no address yet. In what order do the DHCP messages go?',
        ja: 'つないだばかりのノート PC には、まだアドレスがありません。DHCP のメッセージはどの順に流れますか？',
      },
      options: [
        {
          en: 'DISCOVER → OFFER → REQUEST → ACK',
          ja: 'DISCOVER → OFFER → REQUEST → ACK',
        },
        {
          en: 'REQUEST → OFFER → ACK (the laptop asks for an address first)',
          ja: 'REQUEST → OFFER → ACK（まずノート PC がアドレスを要求する）',
        },
        {
          en: 'OFFER → REQUEST → ACK (the server announces addresses on its own)',
          ja: 'OFFER → REQUEST → ACK（サーバが自分からアドレスを知らせる）',
        },
        {
          en: 'DISCOVER → ACK (one question, one answer)',
          ja: 'DISCOVER → ACK（1 回聞いて 1 回答える）',
        },
      ],
      answer: 0,
      explanation: {
        en: 'The client first looks for a server (DISCOVER), a server offers an address (OFFER), the client asks for that offer (REQUEST), and the server confirms the lease (ACK). The lesson’s flow list after “Run DHCP” shows exactly these four, in this order.',
        ja: 'クライアントはまずサーバを探し（DISCOVER）、サーバがアドレスを提案し（OFFER）、クライアントがその提案を求め（REQUEST）、サーバが貸し出しを確定します（ACK）。レッスンで「DHCP を実行」を押すと、通信の一覧にこの 4 つがこの順に並びます。',
      },
      taughtBy: 'dhcp',
    },
    {
      id: 'ipv6-dual-stack',
      prompt: {
        en: 'In this lesson, R1’s eth0 shows IP 10.0.1.1/24 and IPv6 2001:db8:1::1/64, and an echo goes from 2001:db8:1::10 to 2001:db8:2::20 through R1. What does this show?',
        ja: 'このレッスンでは、R1 の eth0 に IP 10.0.1.1/24 と IPv6 2001:db8:1::1/64 があり、2001:db8:1::10 から 2001:db8:2::20 へ R1 を通って echo が届きます。これは何を示していますか？',
      },
      options: [
        {
          en: 'R1 converts the IPv6 packet to IPv4 to forward it, then back again',
          ja: 'R1 は IPv6 のパケットを IPv4 に変えて転送し、あとで元に戻している',
        },
        {
          en: 'Each interface has both an IPv4 and an IPv6 address, and the IPv6 echo travels as IPv6 all the way',
          ja: 'インタフェースが IPv4 と IPv6 の両方のアドレスを持ち、IPv6 の echo は最後まで IPv6 のまま運ばれる',
        },
        {
          en: 'The IPv6 address is the IPv4 address written in a longer form — they are one address',
          ja: 'IPv6 のアドレスは IPv4 のアドレスを長く書いたもので、同じ 1 つのアドレス',
        },
        {
          en: 'Both hosts start with 2001:db8, so they are on one network and R1 is not needed',
          ja: 'どちらも 2001:db8 で始まるので同じネットワークにいて、R1 は要らない',
        },
      ],
      answer: 1,
      explanation: {
        en: 'Dual stack means IPv4 and IPv6 run side by side, each with its own addresses, and an IPv6 packet is forwarded as IPv6. In the lesson, R1’s interfaces list an IP and an IPv6 address each, and the ICMPv6 hops show the echo forwarded by R1 between the 2001:db8:1:: and 2001:db8:2:: networks.',
        ja: 'デュアルスタックとは、IPv4 と IPv6 がそれぞれのアドレスを持って並んで動き、IPv6 のパケットは IPv6 のまま転送されることです。レッスンでは R1 の各インタフェースに IP と IPv6 のアドレスがあり、ICMPv6 のホップには 2001:db8:1:: と 2001:db8:2:: のネットワークの間を R1 が転送した様子が出ます。',
      },
      taughtBy: 'ipv6',
    },
  ],
};
