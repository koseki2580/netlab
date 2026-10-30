import { lessonPath } from '../lessonManifest';
import type { ExamLevel } from './examQuestions';

/**
 * The test of stage 3 (IP): crossing routers, choosing a row of a route table,
 * what changes in a packet on the way, and packets too big for a link. Every
 * answer is what the named lesson shows when run, and what a real IP network
 * does (RFC 791, RFC 1812).
 */
export const EXAM_STAGE_3: ExamLevel = {
  level: 7,
  title: { en: 'Stage 3 · IP', ja: '段階 3・IP' },
  summary: {
    en: 'Crossing routers: route tables, what changes in a packet on the way, and packet size.',
    ja: 'ルータを越えること。経路表、途中でパケットの何が変わるか、パケットの大きさ。',
  },
  path: [
    {
      id: 'client-server',
      path: lessonPath('/routing/client-server'),
      title: { en: 'Client and server', ja: 'クライアントとサーバ' },
      teaches: {
        en: 'One packet crossing one router',
        ja: '1 つのパケットが 1 台のルータを越えること',
      },
    },
    {
      id: 'routing-decision',
      path: lessonPath('/learning/routing-decision'),
      title: { en: 'Routing decision drill', ja: 'ルーティング判断の練習' },
      teaches: {
        en: 'Choosing the row of a route table',
        ja: '経路表の行を選ぶこと',
      },
    },
    {
      id: 'step',
      path: lessonPath('/simulation/step'),
      title: { en: 'Step-by-Step', ja: '1ホップずつ進める' },
      teaches: {
        en: 'A router’s choice, one hop at a time',
        ja: 'ルータの選び方を 1 ホップずつ',
      },
    },
    {
      id: 'trace',
      path: lessonPath('/simulation/trace-inspector'),
      title: { en: 'Trace Inspector', ja: '通信の詳細を見る' },
      teaches: {
        en: 'What changes in a packet from hop to hop',
        ja: 'ホップごとにパケットの何が変わるか',
      },
    },
    {
      id: 'mtu',
      path: lessonPath('/networking/mtu-fragmentation'),
      title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
      teaches: {
        en: 'Packets larger than a link allows',
        ja: 'リンクの上限より大きいパケット',
      },
    },
  ],
  questions: [
    {
      id: 's3-sender-kept',
      prompt: {
        en: 'The Client (10.0.0.10) sends to the Server (203.0.113.10) through the router R-1, which does no NAT. Which sender address does the Server see in the packet?',
        ja: 'Client（10.0.0.10）から、NAT をしないルータ R-1 を通って Server（203.0.113.10）へ送ります。Server が見るパケットの送り主の住所はどれですか？',
      },
      options: [
        { en: '10.0.0.1, R-1’s side toward the Client', ja: '10.0.0.1（R-1 の Client 側）' },
        { en: '203.0.113.1, R-1’s side toward it', ja: '203.0.113.1（R-1 の Server 側）' },
        { en: '10.0.0.10, the Client’s own', ja: '10.0.0.10（Client のもの）' },
        { en: '203.0.113.10, its own address', ja: '203.0.113.10（自分の住所）' },
      ],
      answer: 2,
      explanation: {
        en: 'A router forwards a packet without rewriting its IP addresses; only NAT changes the sender, and that is a separate job. The client–server lesson says it does no rewriting, and its packet panel shows 10.0.0.10 → 203.0.113.10 on every hop.',
        ja: 'ルータは IP アドレスを書き換えずに転送します。送り主を書き換えるのは NAT で、別の働きです。クライアントとサーバのレッスンは書き換えをしないと明記し、パケットの欄ではどのホップでも 10.0.0.10 → 203.0.113.10 です。',
      },
      taughtBy: 'client-server',
    },
    {
      id: 's3-ttl-switches',
      prompt: {
        en: 'A packet leaves the Client with TTL 64 and crosses SW-1, the router R-1 and SW-2 to reach the Server. What TTL does the Server see?',
        ja: 'パケットが TTL 64 で Client を出て、SW-1、ルータ R-1、SW-2 を通って Server に届きます。Server が見る TTL はいくつですか？',
      },
      options: [
        { en: '61, one less at each device', ja: '61（機器ごとに 1 減る）' },
        { en: '63, one less at the router', ja: '63（ルータでだけ 1 減る）' },
        { en: '64, nothing changes it', ja: '64（何も変えない）' },
        { en: '62, one less at each switch', ja: '62（スイッチごとに 1 減る）' },
      ],
      answer: 1,
      explanation: {
        en: 'Only a router takes one off the TTL when it forwards; a switch passes the frame on without touching the packet. One router means 64 → 63. The client–server lesson shows 64 on the R-1 row and 63 from SW-2 onward, the Server included.',
        ja: 'TTL を 1 減らすのは、転送するルータだけです。スイッチはパケットに触れずに渡します。ルータが 1 台なので 64 → 63 です。クライアントとサーバのレッスンでは、R-1 の行が 64、SW-2 から先（Server を含む）が 63 です。',
      },
      taughtBy: 'client-server',
    },
    {
      id: 's3-lpm-nested',
      prompt: {
        en: 'A router has four rows: 0.0.0.0/0 → D, 10.0.0.0/8 → A, 10.1.0.0/16 → B, 10.1.2.0/24 → C. A packet for 10.1.9.4 arrives. Which way does it go?',
        ja: 'ルータに 4 つの行があります：0.0.0.0/0 → D、10.0.0.0/8 → A、10.1.0.0/16 → B、10.1.2.0/24 → C。10.1.9.4 あてのパケットが届きました。どちらへ送りますか？',
      },
      options: [
        { en: 'C, the most specific row in the table', ja: 'C（表でいちばん詳しい行）' },
        { en: 'A, the first row that matches', ja: 'A（最初に一致した行）' },
        { en: 'D, the default for any address', ja: 'D（どの住所にも使う既定の行）' },
        { en: 'B, the longest row that matches', ja: 'B（一致した中で最も長い行）' },
      ],
      answer: 3,
      explanation: {
        en: '10.1.9.4 matches 0.0.0.0/0, 10.0.0.0/8 and 10.1.0.0/16, but not 10.1.2.0/24 (its third number is 9, not 2). Of the rows that match, the longest prefix wins: /16, so B. The routing decision drill asks exactly this kind of nested table.',
        ja: '10.1.9.4 は 0.0.0.0/0、10.0.0.0/8、10.1.0.0/16 に一致しますが、10.1.2.0/24 には一致しません（3 つ目の数が 2 ではなく 9）。一致した行のうちプレフィックスがいちばん長い /16 が勝つので B です。ルーティング判断の練習で、まさにこの入れ子の表を解きます。',
      },
      taughtBy: 'routing-decision',
    },
    {
      id: 's3-no-route',
      prompt: {
        en: 'A router has only two rows, 10.0.0.0/8 and 172.16.0.0/16, and no default route. A packet for 192.0.2.5 arrives. What does the router do?',
        ja: 'ルータには 10.0.0.0/8 と 172.16.0.0/16 の 2 行だけがあり、デフォルト経路はありません。192.0.2.5 あてのパケットが届きました。ルータはどうしますか？',
      },
      options: [
        { en: 'Sends it out of every interface', ja: 'すべてのインタフェースから送る' },
        { en: 'Drops it: no row matches', ja: '捨てる。一致する行がない' },
        { en: 'Uses the closest row, 172.16.0.0/16', ja: 'いちばん近い 172.16.0.0/16 を使う' },
        { en: 'Sends it back to where it came from', ja: '来た方向へそのまま送り返す' },
      ],
      answer: 1,
      explanation: {
        en: 'A router forwards only along a row that matches; with no match and no default route it discards the packet (RFC 1812; a real router also reports it with ICMP). The routing decision drill marks such a packet as dropped.',
        ja: 'ルータが転送するのは一致した行がある場合だけです。一致する行もデフォルト経路もなければ、パケットを捨てます（RFC 1812。実際のルータは ICMP でも知らせます）。ルーティング判断の練習でも、このパケットは「捨てる」が答えです。',
      },
      taughtBy: 'routing-decision',
    },
    {
      id: 's3-default-route',
      prompt: {
        en: 'R-1’s table has 10.0.0.0/24 (direct), 172.16.0.0/30 (direct), 203.0.113.0/24 via 172.16.0.2 and 0.0.0.0/0 via 172.16.0.2. A packet for 198.51.100.7 arrives. What does R-1 do?',
        ja: 'R-1 の表には 10.0.0.0/24（直結）、172.16.0.0/30（直結）、172.16.0.2 経由の 203.0.113.0/24、172.16.0.2 経由の 0.0.0.0/0 があります。198.51.100.7 あてのパケットが届きました。R-1 はどうしますか？',
      },
      options: [
        {
          en: 'Drops it, since no network row matches',
          ja: 'ネットワークの行に一致しないので捨てる',
        },
        { en: 'Uses the default row: to 172.16.0.2', ja: '既定の行で 172.16.0.2 へ送る' },
        { en: 'Delivers it on its own 10.0.0.0/24 side', ja: '自分の 10.0.0.0/24 側に届ける' },
        { en: 'Asks ARP for 198.51.100.7', ja: '198.51.100.7 を ARP で聞く' },
      ],
      answer: 1,
      explanation: {
        en: '198.51.100.7 is in none of the three networks, but 0.0.0.0/0 matches every address, so the default row is used and the packet goes to 172.16.0.2. The Step-by-Step lesson’s R-1 has exactly these rows.',
        ja: '198.51.100.7 は 3 つのネットワークのどれにも入りませんが、0.0.0.0/0 はどの住所にも一致するので、デフォルトの行が使われ、172.16.0.2 へ送られます。1ホップずつ進めるレッスンの R-1 が、まさにこの表を持っています。',
      },
      taughtBy: 'step',
    },
    {
      id: 's3-mac-per-link',
      prompt: {
        en: 'A packet goes Client → R-1 → R-2 → R-3 → Server. On the cable from R-2 to R-3, which pair of addresses does the frame carry as its senders?',
        ja: 'パケットが Client → R-1 → R-2 → R-3 → Server と進みます。R-2 から R-3 へのケーブルの上で、フレームの送り主として書かれている住所の組はどれですか？',
      },
      options: [
        { en: 'R-2’s MAC, and the Client’s IP', ja: 'R-2 の MAC と、Client の IP' },
        { en: 'The Client’s MAC and IP', ja: 'Client の MAC と IP' },
        { en: 'R-2’s MAC and R-2’s IP', ja: 'R-2 の MAC と、R-2 の IP' },
        { en: 'R-1’s MAC, and the Client’s IP', ja: 'R-1 の MAC と、Client の IP' },
      ],
      answer: 0,
      explanation: {
        en: 'Each router writes a new frame for the next cable with its own MAC address as the sender, while the IP packet inside keeps the Client’s address from end to end. The Trace Inspector lesson shows the MAC addresses changing on every link and the IP addresses staying the same.',
        ja: '各ルータは次のケーブル用に新しいフレームを作り、送り主の MAC には自分のものを書きます。中の IP パケットは、最後まで Client の住所のままです。通信の詳細を見るレッスンで、MAC アドレスはリンクごとに変わり、IP アドレスは変わらないのが見られます。',
      },
      taughtBy: 'trace',
    },
    {
      id: 's3-ttl-at-r3',
      prompt: {
        en: 'The Client sends with TTL 64 across R-1, R-2 and R-3. In the trace, which TTL does the packet carry as it reaches R-3?',
        ja: 'Client が TTL 64 で送り、R-1、R-2、R-3 を通ります。記録の上で、R-3 に着いたときのパケットの TTL はいくつですか？',
      },
      options: [
        { en: '64', ja: '64' },
        { en: '61', ja: '61' },
        { en: '63', ja: '63' },
        { en: '62', ja: '62' },
      ],
      answer: 3,
      explanation: {
        en: 'R-1 and R-2 have each taken one off as they forwarded it, so it reaches R-3 with 62; R-3 then takes one more, and the Server sees 61. The Trace Inspector lesson lists 64 at R-1, 63 at R-2 and 62 at R-3.',
        ja: 'R-1 と R-2 が転送するたびに 1 ずつ減らしたので、R-3 に着いたときは 62 です。R-3 がさらに 1 減らし、Server では 61 になります。通信の詳細を見るレッスンでは、R-1 で 64、R-2 で 63、R-3 で 62 と並びます。',
      },
      taughtBy: 'trace',
    },
    {
      id: 's3-who-splits',
      prompt: {
        en: 'Host A sends a 1200-byte ping without the DF bit. The link after R1 has a smaller MTU than the packet. Which device cuts the packet into fragments?',
        ja: 'Host A が DF ビットなしで 1200 バイトの ping を送ります。R1 の先のリンクの MTU はパケットより小さいです。パケットを断片に分けるのはどの機器ですか？',
      },
      options: [
        { en: 'Host A, before it sends', ja: '送る前に Host A が' },
        { en: 'Host B, after it arrives', ja: '届いたあとに Host B が' },
        { en: 'R1, at the small link', ja: '小さいリンクの手前の R1 が' },
        { en: 'No one; it is dropped', ja: 'だれも分けない。捨てられる' },
      ],
      answer: 2,
      explanation: {
        en: 'Without DF, the router that meets the smaller link splits the packet so each piece fits that link (RFC 791). Host A sends one packet; only with DF set would R1 drop it instead. The MTU lesson’s trace shows the fragments leaving R1.',
        ja: 'DF がなければ、小さいリンクの手前にあるルータが、そのリンクに収まるようにパケットを分けます（RFC 791）。Host A が送るのは 1 つのパケットです。DF があれば、R1 は分けずに捨てます。MTU のレッスンの記録で、R1 から断片が出ていきます。',
      },
      taughtBy: 'mtu',
    },
    {
      id: 's3-who-joins',
      prompt: {
        en: 'The fragments of Host A’s ping cross R1 and R2 on the way to Host B. Where are they put back together?',
        ja: 'Host A の ping の断片が、R1 と R2 を通って Host B へ向かいます。断片が組み立て直されるのはどこですか？',
      },
      options: [
        { en: 'At R2, the next router', ja: '次のルータ R2 で' },
        { en: 'At R1, the router that cut them', ja: '分けたルータ R1 で' },
        { en: 'On the link between them', ja: 'その間をつなぐリンクの上で' },
        { en: 'At the destination, Host B', ja: '宛先の Host B で' },
      ],
      answer: 3,
      explanation: {
        en: 'IPv4 fragments travel separately and only the destination reassembles them (RFC 791); routers on the way forward each fragment as it is. In the MTU lesson the fragments reach Host B, which reassembles them.',
        ja: 'IPv4 の断片は別々に進み、組み立て直すのは宛先だけです（RFC 791）。途中のルータは断片をそのまま転送します。MTU のレッスンでも、断片は Host B に届き、Host B が組み立て直します。',
      },
      taughtBy: 'mtu',
    },
    {
      id: 's3-route-row-direct',
      prompt: {
        en: 'R-1’s table marks 203.0.113.0/24 "direct". A packet for the Server, 203.0.113.10, arrives from the Client’s side. What does R-1 do with it?',
        ja: 'R-1 の表で 203.0.113.0/24 は「direct（直結）」です。Client 側から Server（203.0.113.10）あてのパケットが届きました。R-1 はどうしますか？',
      },
      options: [
        { en: 'Hands it to the next router', ja: '次のルータに渡す' },
        { en: 'Delivers it onto that network', ja: '自分で直接届ける' },
        { en: 'Drops it as already delivered', ja: '届け済みとして捨てる' },
        { en: 'Sends it back to the sender', ja: '送り主に送り返す' },
      ],
      answer: 1,
      explanation: {
        en: '"Direct" means R-1 itself has an interface on 203.0.113.0/24 (203.0.113.1), so there is no next router: it finds 203.0.113.10’s MAC address with ARP and delivers the packet on that network. The client–server lesson’s route table shows this direct row, and the packet goes from R-1 through SW-2 to the Server.',
        ja: '「direct」は、R-1 自身が 203.0.113.0/24 にインタフェース（203.0.113.1）を持っているという意味です。次のルータはなく、203.0.113.10 の MAC アドレスを ARP で調べて、そのネットワークに自分で届けます。クライアントとサーバのレッスンの経路表にこの直結の行が出て、パケットは R-1 から SW-2 を通って Server に届きます。',
      },
      taughtBy: 'client-server',
    },
  ],
};
