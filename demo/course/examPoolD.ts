/**
 * Wave D of the question pools: one question for each lesson added by
 * REQ-429 to REQ-440, keyed, like wave C, by the id of the original question
 * of the slot (topic) it joins in its stage's test. A wave D question comes
 * after its slot's three and is taught by the new lesson's own stop, which the
 * level's path lists. Every key is checked against the lesson's model in
 * `examPoolD.test.ts`.
 */
import type { ExamQuestion } from './examQuestions';

const ENTRIES: readonly (readonly [string, ExamQuestion])[] = [
  // --- Stage 2 (level 6) ---------------------------------------------------
  [
    's2-star-first-send',
    {
      id: 's2-mac-moved-silent',
      prompt: {
        en: 'A switch has learned host A on port 1 and host B on port 2; its ageing time is 300 s, the IEEE recommended default. A is moved to port 3 and sends nothing. Five seconds later B sends a frame to A. Where does the switch send it?',
        ja: 'スイッチは、ホスト A をポート 1、ホスト B をポート 2 で学習しています。エージングタイムは IEEE の推奨値の 300 秒です。A はポート 3 につなぎ替えられ、そのあと何も送っていません。5 秒後、B が A 宛てにフレームを送ります。スイッチはそれをどこへ出しますか？',
      },
      options: [
        { en: 'Port 3 only, A’s new port', ja: 'ポート 3 だけ（A の新しいポート）' },
        { en: 'Ports 1, 3 and 4', ja: 'ポート 1、3、4 のすべて' },
        { en: 'Port 1 only; A misses it', ja: 'ポート 1 だけ。A には届かない' },
        { en: 'Nowhere: it drops it', ja: 'どこにも出さずに捨てる' },
      ],
      answer: 2,
      explanation: {
        en: 'A switch learns a port only from the source address of a frame it receives, and A has sent nothing from port 3; its entry is seconds old, far from the 300 s ageing time. So the table still says port 1, the frame leaves by port 1 only, and A does not get it until A sends something (IEEE 802.1Q §8.7). The MAC learning lesson moves a host that says nothing.',
        ja: 'スイッチがポートを覚えるのは、受け取ったフレームの送信元アドレスからだけです。A はポート 3 から何も送っておらず、エントリは数秒前のもので、300 秒のエージングタイムにはほど遠い状態です。そのため表はポート 1 のままで、フレームはポート 1 だけから出ます。A が何かを送るまで、A には届きません（IEEE 802.1Q §8.7）。MAC アドレス学習のレッスンで、何も送らずに移ったホストを試せます。',
      },
      taughtBy: 'mac-learning',
    },
  ],
  [
    's2-vlan-trunk-cut',
    {
      id: 's2-optical-margin',
      prompt: {
        en: 'A 30 km single-mode fibre at 1310 nm loses 0.35 dB per km. The link also has two connectors of 0.5 dB each and five splices of 0.1 dB each. The optic sends at 0 dBm and the receiver needs −14 dBm (example datasheet figures). Does the link come up, and with what margin?',
        ja: '1310 nm で使う長さ 30 km のシングルモードファイバは、1 km あたり 0.35 dB 減衰します。リンクには 0.5 dB のコネクタが 2 つ、0.1 dB の融着接続が 5 か所あります。送信は 0 dBm、受信には −14 dBm が必要です（データシートの例の値）。リンクは上がりますか？ 余裕はどれだけですか？',
      },
      options: [
        { en: 'No, it is 2 dB short', ja: 'いいえ、2 dB 足りない' },
        { en: 'Yes, with 3.5 dB to spare', ja: 'はい、余裕は 3.5 dB' },
        { en: 'Yes, with 14 dB to spare', ja: 'はい、余裕は 14 dB' },
        { en: 'Yes, with 2 dB to spare', ja: 'はい、余裕は 2 dB' },
      ],
      answer: 3,
      explanation: {
        en: 'The fibre loses 30 × 0.35 = 10.5 dB, the connectors 1.0 dB and the splices 0.5 dB: 12 dB in all, so −12 dBm arrives, 2 dB above the −14 dBm the receiver needs. It comes up, but with less than the 3 dB many designers keep for ageing and repairs. 3.5 dB leaves out the connectors and splices; 14 dB leaves out the fibre. The optical lesson adds up each loss.',
        ja: 'ファイバで 30 × 0.35 = 10.5 dB、コネクタで 1.0 dB、融着接続で 0.5 dB、合計 12 dB 失われるので、届くのは −12 dBm です。受信に必要な −14 dBm より 2 dB 上なのでリンクは上がりますが、経年劣化や修理に備えて多くの設計者が残す 3 dB には足りません。3.5 dB はコネクタと融着接続を、14 dB はファイバを数え忘れた値です。光リンクバジェットのレッスンで、損失を 1 つずつ足せます。',
      },
      taughtBy: 'optical',
    },
  ],
  // --- Stage 3 (level 7) ---------------------------------------------------
  [
    's3-who-splits',
    {
      id: 's3-pmtud-black-hole',
      prompt: {
        en: 'A server sends 1500-byte IPv6 packets. A tunnel on the path has an MTU of 1400, and a firewall drops every ICMPv6 Packet Too Big message. The server uses only classic path MTU discovery (RFC 8201). What happens to its full-size packets?',
        ja: 'サーバが 1500 バイトの IPv6 パケットを送ります。経路の途中のトンネルの MTU は 1400 で、ファイアウォールが ICMPv6 の Packet Too Big をすべて捨てます。サーバが使うのは従来の経路 MTU 探索（RFC 8201）だけです。サーバの最大サイズのパケットはどうなりますか？',
      },
      options: [
        { en: 'The tunnel router fragments them', ja: 'トンネルのルータが分割して届ける' },
        { en: 'The server learns 1400 and resends', ja: 'サーバが 1400 を知って送り直す' },
        { en: 'They are lost, again and again', ja: '何度送り直しても失われる' },
        { en: 'They arrive, only more slowly', ja: '遅くはなるが、そのまま届く' },
      ],
      answer: 2,
      explanation: {
        en: 'An IPv6 router never fragments a packet in transit, so the tunnel drops each 1500-byte packet, and classic PMTUD learns a smaller size only from Packet Too Big. With that message filtered, the server hears nothing and resends the same size: a black hole. DPLPMTUD (RFC 8899), as QUIC uses it, probes sizes instead and needs no ICMP. The PLPMTUD lesson runs both.',
        ja: 'IPv6 のルータは途中でパケットを分割しないので、トンネルは 1500 バイトのパケットを 1 つずつ捨てます。従来の PMTUD が小さいサイズを知る手段は Packet Too Big だけです。それが捨てられるとサーバには何も届かず、同じサイズで送り直し続けます。これがブラックホールです。QUIC が使う DPLPMTUD（RFC 8899）は、ICMP に頼らずサイズを試して探します。PLPMTUD のレッスンで両方を試せます。',
      },
      taughtBy: 'plpmtud',
    },
  ],
  // --- Stage 4 (level 1) ---------------------------------------------------
  [
    'name-fails',
    {
      id: 'dhcp-lease-rebind',
      prompt: {
        en: 'A laptop gets an 8-hour lease from the network’s only DHCP server, which sends no T1 or T2 option. One hour later that server stops working. What does the laptop do 7 hours after it got the lease?',
        ja: 'ノート PC が、ネットワークで唯一の DHCP サーバから 8 時間のリースを受け取りました。サーバは T1 と T2 のオプションを送っていません。1 時間後、そのサーバが止まります。リースを受け取ってから 7 時間後に、ノート PC は何をしますか？',
      },
      options: [
        { en: 'Unicasts a DHCPREQUEST', ja: 'DHCPREQUEST をサーバへユニキャスト' },
        { en: 'Broadcasts a DHCPREQUEST', ja: 'DHCPREQUEST をブロードキャスト' },
        { en: 'Stops using its address', ja: 'アドレスを使うのをやめる' },
        { en: 'Starts over with DHCPDISCOVER', ja: 'DHCPDISCOVER からやり直す' },
      ],
      answer: 1,
      explanation: {
        en: 'With no options sent, T1 is half the lease (4 hours) and T2 is 87.5 % of it (7 hours) (RFC 2131 §4.4.5). From 4 hours the laptop unicasts DHCPREQUEST to its server and gets no answer; at 7 hours it starts rebinding and broadcasts the DHCPREQUEST, so any server may answer. It stops using the address only when the lease ends at 8 hours, and then starts over with DHCPDISCOVER. The DHCP lease lesson follows the client through each stage.',
        ja: 'オプションがないとき、T1 はリースの半分（4 時間）、T2 は 87.5 %（7 時間）です（RFC 2131 §4.4.5）。4 時間後からノート PC はサーバへ DHCPREQUEST をユニキャストしますが、答えはありません。7 時間後に再バインドに入り、どのサーバでも答えられるよう DHCPREQUEST をブロードキャストします。アドレスを使うのをやめるのはリースが切れる 8 時間後で、そこから DHCPDISCOVER でやり直します。DHCP リースのライフサイクルのレッスンで、各段階を追えます。',
      },
      taughtBy: 'dhcp-lease',
    },
  ],
  [
    'nat-sender',
    {
      id: 'cgnat-port-blocks',
      prompt: {
        en: 'A carrier-grade NAT shares one public IPv4 address among subscribers. It hands out only ports 1024–65535, in blocks of 512 ports, and gives each subscriber one block (both are the operator’s settings). How many subscribers can share the address?',
        ja: 'キャリアグレード NAT が、1 つのグローバル IPv4 アドレスを加入者で分け合います。渡すのはポート 1024〜65535 だけで、512 ポートずつのブロックにして、加入者ごとに 1 ブロック渡します（どちらも事業者の設定です）。このアドレスを何人の加入者で分け合えますか？',
      },
      options: [
        { en: '128', ja: '128' },
        { en: '126', ja: '126' },
        { en: '512', ja: '512' },
        { en: '64', ja: '64' },
      ],
      answer: 1,
      explanation: {
        en: 'Ports 1024 to 65535 are 64,512 ports, and 64,512 ÷ 512 = 126 blocks, one per subscriber. 128 counts ports 0–1023 too. The subscribers’ own WAN addresses come from the shared space 100.64.0.0/10 (RFC 6598). The carrier-grade NAT lesson changes the block size and shows what a subscriber that needs more ports meets.',
        ja: 'ポート 1024〜65535 は 64,512 個で、64,512 ÷ 512 = 126 ブロック、加入者 1 人に 1 ブロックです。128 はポート 0〜1023 まで数えた値です。加入者自身の WAN 側アドレスは共有アドレス空間 100.64.0.0/10（RFC 6598）から振られます。キャリアグレード NAT のレッスンで、ブロックの大きさを変え、ポートが足りない加入者に何が起きるかを見られます。',
      },
      taughtBy: 'cgnat',
    },
  ],
  [
    'tcp-next',
    {
      id: 'http-retry-post',
      prompt: {
        en: 'On one connection a client sends GET /feed, PUT /profile/name, DELETE /cart/items/7 and POST /orders. The connection drops before any response comes back. By HTTP’s rules (RFC 9110), which one may the client not resend automatically?',
        ja: 'クライアントが 1 本の接続で GET /feed、PUT /profile/name、DELETE /cart/items/7、POST /orders を送りました。どの応答も返ってくる前に接続が切れます。HTTP の決まり（RFC 9110）で、クライアントが自動で送り直してはいけないのはどれですか？',
      },
      options: [
        { en: 'GET', ja: 'GET' },
        { en: 'PUT', ja: 'PUT' },
        { en: 'POST', ja: 'POST' },
        { en: 'DELETE', ja: 'DELETE' },
      ],
      answer: 2,
      explanation: {
        en: 'GET, PUT and DELETE are idempotent: arriving twice leaves the server as arriving once (the name is set again to the same value, item 7 is already gone). POST is not: a second copy may place a second order, so a client must not resend it automatically unless it knows the request is safe to repeat (RFC 9110 §9.2.2). The polling and WebSocket lesson sends each request twice.',
        ja: 'GET、PUT、DELETE はべき等です。2 回届いても、サーバの状態は 1 回届いたときと同じです（名前は同じ値にもう一度なるだけで、商品 7 はもう消えています）。POST は違い、2 回目で注文がもう 1 つ入ることがあるので、繰り返しても安全だとわかっている場合を除き、自動で送り直してはいけません（RFC 9110 §9.2.2）。ポーリングと WebSocket のレッスンで、各要求を 2 回送れます。',
      },
      taughtBy: 'websocket',
    },
  ],
  // --- Stage 5 (level 2) ---------------------------------------------------
  [
    'dhcp-order',
    {
      id: 'ntp-offset',
      prompt: {
        en: 'An NTP client sends a request at t1 = 1000 ms on its clock. The server receives it at t2 = 1039 ms and replies at t3 = 1044 ms on its clock. The reply arrives at t4 = 1023 ms on the client’s clock. How far ahead of the client’s clock does NTP compute the server’s clock is?',
        ja: 'NTP のクライアントが、自分の時計で t1 = 1000 ms に要求を送ります。サーバは自分の時計で t2 = 1039 ms に受け取り、t3 = 1044 ms に返信します。返信はクライアントの時計で t4 = 1023 ms に届きます。NTP は、サーバの時計がクライアントの時計よりどれだけ進んでいると計算しますか？',
      },
      options: [
        { en: '39 ms ahead', ja: '39 ms 進んでいる' },
        { en: '21 ms ahead', ja: '21 ms 進んでいる' },
        { en: '30 ms ahead', ja: '30 ms 進んでいる' },
        { en: '9 ms ahead', ja: '9 ms 進んでいる' },
      ],
      answer: 2,
      explanation: {
        en: 'NTP takes the offset as ((t2 − t1) + (t3 − t4)) / 2 = (39 + 21) / 2 = 30 ms, and the round trip as (t4 − t1) − (t3 − t2) = 18 ms (RFC 5905 §8). It assumes the two directions take equally long; in the lesson the request took 14 ms and the reply 4 ms, so the server is really 25 ms ahead and NTP is 5 ms off, within half the round trip. The time-sync lesson moves that split.',
        ja: 'NTP はオフセットを ((t2 − t1) + (t3 − t4)) / 2 = (39 + 21) / 2 = 30 ms、往復の時間を (t4 − t1) − (t3 − t2) = 18 ms と計算します（RFC 5905 §8）。行きと帰りが同じ時間だと仮定するためです。レッスンでは行きが 14 ms、帰りが 4 ms かかっていて、サーバは本当は 25 ms 進んでおり、NTP の値は 5 ms ずれます。ずれは往復の半分以内に収まります。時刻同期のレッスンで、行きと帰りの配分を変えられます。',
      },
      taughtBy: 'time-sync',
    },
  ],
  [
    'ipv6-dual-stack',
    {
      id: 'ipv6-lans-in-56',
      prompt: {
        en: 'An ISP delegates the prefix 2001:db8:1234:5600::/56 to a home router, which gives each LAN one /64. How many LANs can it number from that prefix?',
        ja: 'ISP が家庭のルータにプレフィックス 2001:db8:1234:5600::/56 を委任し、ルータは LAN ごとに /64 を 1 つ割り当てます。このプレフィックスから、いくつの LAN に番号を振れますか？',
      },
      options: [
        { en: '128', ja: '128' },
        { en: '256', ja: '256' },
        { en: '512', ja: '512' },
        { en: '65,536', ja: '65,536' },
      ],
      answer: 1,
      explanation: {
        en: 'A /56 leaves 64 − 56 = 8 bits for the subnet ID, so it holds 2⁸ = 256 /64s, from 2001:db8:1234:5600::/64 to 2001:db8:1234:56ff::/64. 65,536 is what a /48 holds (RFC 6177). The IPv6 addressing lesson cuts a delegated prefix into LANs.',
        ja: '/56 ではサブネット ID に 64 − 56 = 8 ビットが残るので、/64 は 2⁸ = 256 個入ります。2001:db8:1234:5600::/64 から 2001:db8:1234:56ff::/64 までです。65,536 は /48 に入る数です（RFC 6177）。IPv6 アドレスとプレフィックスのレッスンで、委任されたプレフィックスを LAN に切り分けられます。',
      },
      taughtBy: 'ipv6-addressing',
    },
  ],
  // --- Stage 6 (level 4) ---------------------------------------------------
  [
    'ospf-bgp-transit-link',
    {
      id: 'l4-ibgp-no-reflector',
      prompt: {
        en: 'In one AS, router A has an iBGP session with B, and B one with C; there is no A–C session. A learns 203.0.113.0/24 from an eBGP neighbour. B is an ordinary iBGP router, not a route reflector. Does C learn the route?',
        ja: '1 つの AS の中で、ルータ A は B と、B は C と iBGP セッションを張っています。A と C の間にセッションはありません。A は eBGP の相手から 203.0.113.0/24 を学びます。B はルートリフレクタではない、普通の iBGP ルータです。C はこの経路を学びますか？',
      },
      options: [
        { en: 'Yes, with B as its next hop', ja: 'はい。ネクストホップは B' },
        { en: 'Yes, with A’s eBGP next hop', ja: 'はい。ネクストホップは eBGP のもの' },
        { en: 'No: B does not pass it on', ja: 'いいえ。B が C に渡さない' },
        { en: 'No: C drops it as a loop', ja: 'いいえ。C がループとして捨てる' },
      ],
      answer: 2,
      explanation: {
        en: 'A route learned from an iBGP peer is not advertised to another iBGP peer (RFC 4271 §9.2), so B keeps it and C never hears of it; that is why iBGP needs a full mesh or route reflectors. With B a reflector and A and C its clients, C gets it with NEXT_HOP 198.51.100.1 unchanged (RFC 4456). The route-reflector lesson runs both.',
        ja: 'iBGP の相手から学んだ経路は、別の iBGP の相手には広告されません（RFC 4271 §9.2）。そのため B は経路を手元に置くだけで、C には何も届きません。iBGP にフルメッシュかルートリフレクタが要るのはこのためです。B をリフレクタにして A と C をそのクライアントにすれば、C は NEXT_HOP 198.51.100.1 のままの経路を受け取ります（RFC 4456）。ルートリフレクタのレッスンで両方を試せます。',
      },
      taughtBy: 'route-reflector',
    },
  ],
  [
    'qos-bandwidth-for-target',
    {
      id: 'l4-pfc-innocent-flow',
      prompt: {
        en: 'Eight servers burst into one 100 Gbit/s switch port at the same moment. PFC is on for their priority; ECN is off. Flow V shares server S1’s uplink and priority but goes out of another, idle port. While the switch is pausing the burst, what happens to V?',
        ja: '8 台のサーバが同時に、スイッチの 100 Gbit/s のポート 1 つへバーストを送ります。その優先度では PFC が有効で、ECN は無効です。フロー V はサーバ S1 と上りリンクも優先度も同じですが、出ていくのは空いている別のポートです。スイッチがバーストを一時停止させている間、V はどうなりますか？',
      },
      options: [
        { en: 'It keeps its full rate', ja: '全速のまま流れる' },
        { en: 'It is paused along with S1', ja: 'S1 と一緒に止まる' },
        { en: 'Its frames are dropped', ja: 'フレームが捨てられる' },
        { en: 'It moves to a free priority', ja: '空いている優先度へ移る' },
      ],
      answer: 1,
      explanation: {
        en: 'PFC pauses one priority on a whole link, not one flow (IEEE 802.1Qbb). When the congested port’s buffer fills, the switch pauses S1’s link, and V, on that link and priority, stops too although its own port is idle: in the lesson V gets 174 of its 350 turns. Plain Ethernet pauses nothing but drops burst frames. The lossless Ethernet lesson runs all three modes.',
        ja: 'PFC が止めるのはリンク全体の 1 つの優先度で、1 本のフローではありません（IEEE 802.1Qbb）。混んだポートのバッファが埋まると、スイッチは S1 のリンクを一時停止させます。同じリンク・同じ優先度の V も、自分の出口は空いているのに止まります。レッスンでは、V は 350 回の送信機会のうち 174 回しか送れません。普通の Ethernet は何も止めませんが、バーストのフレームを捨てます。ロスレス Ethernet のレッスンで、3 つの方式を試せます。',
      },
      taughtBy: 'lossless-dc',
    },
  ],
  // --- Stage 7 (level 8) ---------------------------------------------------
  [
    's7-l4s-both',
    {
      id: 's7-cubic-recovery',
      prompt: {
        en: 'One flow fills a 10 Gbit/s path with a 100 ms round trip, using 1500-byte packets: a window of about 83,000 packets. It loses one packet and nothing else changes. How long until its window is back where it was, with Reno (RFC 5681) and with CUBIC (RFC 9438)?',
        ja: '1 本のフローが、往復 100 ms で 10 Gbit/s の経路を 1500 バイトのパケットで埋めています。ウィンドウは約 83,000 パケットです。パケットを 1 つ失い、ほかには何も変わりません。ウィンドウが元に戻るまで、Reno（RFC 5681）と CUBIC（RFC 9438）でそれぞれどれだけかかりますか？',
      },
      options: [
        { en: 'Both in about 40 s', ja: 'Reno も CUBIC も約 40 秒' },
        { en: 'Reno ~70 min, CUBIC ~40 s', ja: 'Reno 約 70 分、CUBIC 約 40 秒' },
        { en: 'Both in about 70 min', ja: 'Reno も CUBIC も約 70 分' },
        { en: 'Reno ~40 s, CUBIC ~70 min', ja: 'Reno 約 40 秒、CUBIC 約 70 分' },
      ],
      answer: 1,
      explanation: {
        en: 'Reno halves the window to about 41,700 packets and adds one per round trip: about 41,700 × 0.1 s ≈ 4,170 s, some 70 minutes. CUBIC drops to 0.7 of it and its curve returns at K = ∛(W_max × 0.3 / 0.4) ≈ 40 s, however long the round trip. The CUBIC and RACK-TLP lesson draws both windows.',
        ja: 'Reno はウィンドウを約 41,700 パケットに半減させ、往復ごとに 1 つずつ増やします。約 41,700 × 0.1 秒 ≈ 4,170 秒、およそ 70 分です。CUBIC は 0.7 倍に下げ、曲線は K = ∛(W_max × 0.3 / 0.4) ≈ 40 秒で元に戻ります。往復時間の長さには左右されません。CUBIC と RACK-TLP のレッスンで、両方のウィンドウを描けます。',
      },
      taughtBy: 'tcp-cubic',
    },
  ],
  [
    's7-h3-stream-ids',
    {
      id: 's7-5g-handover',
      prompt: {
        en: 'A phone’s 5G PDU session is in SSC mode 1 and anchored on UPF1, which is also the core’s end of the N3 tunnel; gNB1 serves the phone. It is handed over to gNB2 over Xn, and UPF1 keeps its own tunnel end and TEID. Which of these changes?',
        ja: 'スマートフォンの 5G の PDU セッションは SSC モード 1 で、アンカーは UPF1 です。UPF1 は N3 トンネルのコア側の端でもあり、スマートフォンには gNB1 がつながっています。Xn で gNB2 へハンドオーバーしますが、UPF1 は自分のトンネルの端と TEID を変えません。変わるのはどれですか？',
      },
      options: [
        { en: 'The phone’s IP address', ja: 'スマートフォンの IP アドレス' },
        { en: 'The N3 tunnel’s gNB end', ja: 'N3 トンネルの gNB 側の端' },
        { en: 'The session’s anchor UPF', ja: 'セッションのアンカーの UPF' },
        { en: 'Nothing at all on N3', ja: 'N3 では何も変わらない' },
      ],
      answer: 1,
      explanation: {
        en: 'In SSC mode 1 the anchor UPF and with it the phone’s IP address stay (3GPP TS 23.501). In the handover gNB2 gives the SMF its own downlink tunnel end, an address and a TEID, and the SMF tells UPF1 to send there; UPF1’s uplink end and TEID stay as they were. The 5G core lesson hands the phone over and shows which fields changed.',
        ja: 'SSC モード 1 では、アンカーの UPF も、それに結び付いたスマートフォンの IP アドレスも変わりません（3GPP TS 23.501）。ハンドオーバーでは gNB2 が自分の下りトンネルの端（アドレスと TEID）を SMF に渡し、SMF が UPF1 にそこへ送るよう伝えます。UPF1 側の上りの端と TEID はそのままです。5G コアのレッスンでハンドオーバーさせ、変わった項目を確かめられます。',
      },
      taughtBy: 'mobile-core',
    },
  ],
];

/** Wave D questions, by the id of the original question whose slot they join. */
export const POOL_D: ReadonlyMap<string, readonly ExamQuestion[]> = ENTRIES.reduce(
  (map, [key, question]) => map.set(key, [...(map.get(key) ?? []), question]),
  new Map<string, readonly ExamQuestion[]>(),
);
