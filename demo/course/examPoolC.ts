/**
 * Wave C of the question pools: one question for each stage 6 and stage 7
 * lesson no test asked about before, keyed by the id of the original question
 * of the slot (topic) it joins. A slot keeps its first three questions on its
 * own stop; a wave C question is taught by the new lesson's own stop, which
 * the level's path lists. Every key is checked against the lesson's model in
 * `examPoolC.test.ts`.
 */
import type { ExamQuestion } from './examQuestions';

const ENTRIES: readonly (readonly [string, ExamQuestion])[] = [
  // --- Stage 7 (level 8) ---------------------------------------------------
  [
    's7-vpc-private-in',
    {
      id: 's7-ztna-contractor',
      prompt: {
        en: 'In the zero-trust lesson a contractor may use only the code repository. On the company’s full-tunnel VPN (one ACL for everyone, permit 10.0.0.0/8) its laptop reaches all five apps. Under ZTNA, what does it reach?',
        ja: 'ゼロトラストのレッスンで、委託先の利用者に許されているのはコードリポジトリだけです。会社のフルトンネル VPN（全員共通の ACL で 10.0.0.0/8 を許可）では、そのノート PC から 5 つのアプリすべてに届きます。ZTNA では何に届きますか？',
      },
      options: [
        { en: 'All five, as on the VPN', ja: 'VPN と同じく 5 つすべて' },
        { en: 'All of 10.0.0.0/8', ja: '10.0.0.0/8 のすべて' },
        { en: 'Only the code repo', ja: 'コードリポジトリだけ' },
        { en: 'Nothing without the VPN', ja: 'VPN なしでは何にも' },
      ],
      answer: 2,
      explanation: {
        en: 'ZTNA decides each request from who is asking, for which app, from a device in what state, and hands out no network address: the contractor’s laptop reaches the code repository and no internal address. The VPN’s one ACL lets it reach every app in 10.0.0.0/8. The zero-trust lesson counts both.',
        ja: 'ZTNA は、だれが、どのアプリに、どんな状態の端末から要求したかで 1 件ずつ判断し、ネットワークのアドレスは渡しません。委託先のノート PC が届くのはコードリポジトリだけで、社内のアドレスには届きません。VPN の共通の ACL では、10.0.0.0/8 のすべてのアプリに届きます。ゼロトラストのレッスンで両方を数えられます。',
      },
      taughtBy: 'ztna',
    },
  ],
  [
    's7-vpc-private-in',
    {
      id: 's7-ice-two-symmetric',
      prompt: {
        en: 'Two peers in a call are each behind a symmetric NAT. Both learn their public address from STUN and try hole punching. Which ICE candidate pair ends up carrying the call?',
        ja: '通話する 2 台が、それぞれ対称型 NAT の内側にいます。どちらも STUN で自分の公開アドレスを知り、ホールパンチングを試します。最終的に通話を運ぶのは、ICE のどの候補の組ですか？',
      },
      options: [
        { en: 'The two STUN addresses', ja: 'STUN で知った 2 つのアドレス' },
        { en: 'The two private addresses', ja: '2 台のプライベートアドレス' },
        { en: 'None: the call cannot start', ja: 'なし。通話は始まらない' },
        { en: 'One through a TURN relay', ja: 'TURN の中継を通る組' },
      ],
      answer: 3,
      explanation: {
        en: 'A symmetric NAT gives each new destination a new port, so the address STUN reported is not the one the peer’s packets come from, and neither NAT lets the other’s check in. ICE picks the highest-priority pair that works, which goes through a TURN relay (RFC 8445, RFC 8656). The NAT traversal lesson runs every pair of NAT types.',
        ja: '対称型 NAT は宛先ごとに新しいポートを割り当てるので、STUN が教えたアドレスと相手に送るときのアドレスが違い、どちらの NAT も相手の確認を通しません。ICE は動く組のうち優先度がいちばん高いものを選び、それが TURN の中継を通る組です（RFC 8445、RFC 8656）。NAT 越えのレッスンで、NAT の種類のすべての組み合わせを試せます。',
      },
      taughtBy: 'nat-traversal',
    },
  ],
  [
    's7-tls-alpn-hidden',
    {
      id: 's7-happy-eyeballs-broken-v6',
      prompt: {
        en: 'A dual-stack laptop opens a site whose IPv6 path silently drops every packet; over IPv4 the round trip is 30 ms. With Happy Eyeballs v2 and its recommended 250 ms delay, how does it connect?',
        ja: 'IPv4 と IPv6 の両方を使えるノート PC がサイトにつなぎます。そのサイトへの IPv6 の経路は、パケットを何も言わずにすべて落とします。IPv4 の往復は 30 ms です。Happy Eyeballs v2 と推奨の 250 ms の待ち時間で、どうつながりますか？',
      },
      options: [
        { en: 'Over IPv6, after it retries', ja: '再試行のあと IPv6 で' },
        { en: 'Over IPv4, about 280 ms in', ja: '約 280 ms、IPv4 で' },
        { en: 'Over IPv4, after about 21 s', ja: '約 21 秒後に IPv4 で' },
        { en: 'Over IPv4, about 30 ms in', ja: '約 30 ms で IPv4 で' },
      ],
      answer: 1,
      explanation: {
        en: 'Happy Eyeballs tries IPv6 first and, if it is not up within the Connection Attempt Delay (250 ms recommended, RFC 8305), starts IPv4 too; the first to connect wins, so IPv4 is up at 250 + 30 = 280 ms. A client that waits for IPv6 to time out first takes over 21 s. The Happy Eyeballs lesson runs both.',
        ja: 'Happy Eyeballs はまず IPv6 を試し、接続試行の待ち時間（推奨 250 ms、RFC 8305）のうちにつながらなければ IPv4 も始めます。先につながった方を使うので、IPv4 で 250 + 30 = 280 ms につながります。IPv6 のタイムアウトを待ってから IPv4 を試す端末では、21 秒以上かかります。Happy Eyeballs のレッスンで両方を走らせられます。',
      },
      taughtBy: 'happy-eyeballs',
    },
  ],
  [
    's7-sdwan-voice',
    {
      id: 's7-anycast-withdraw',
      prompt: {
        en: 'A CDN announces one prefix, 192.0.2.0/24, from Tokyo, Frankfurt and New York. A user in Singapore is reaching Frankfurt when Frankfurt stops announcing it. What must the user’s device change to keep reaching the CDN?',
        ja: 'CDN が 1 つのプレフィックス 192.0.2.0/24 を、東京、フランクフルト、ニューヨークから広告しています。シンガポールの利用者はフランクフルトに届いていましたが、フランクフルトが広告をやめました。CDN に届き続けるには、利用者の端末は何を変える必要がありますか？',
      },
      options: [
        { en: 'Nothing; routes now lead to Tokyo', ja: '何も。経路が東京へ向かう' },
        { en: 'Its DNS answer, to a Tokyo address', ja: 'DNS の答えを東京のアドレスに' },
        { en: 'Its default gateway, to a new one', ja: 'デフォルトゲートウェイを変える' },
        { en: 'Nothing; it is cut off for good', ja: '何も。もう届かなくなる' },
      ],
      answer: 0,
      explanation: {
        en: 'Anycast puts one address in several places: when one site withdraws the prefix, the routers’ next choice leads the same address to another site, here Tokyo. Nothing changes on the device, though a connection that was open moves to a site that does not know it. The anycast lesson withdraws each site in turn.',
        ja: 'エニーキャストは 1 つのアドレスを複数の場所に置きます。1 か所が広告をやめると、ルータは次の候補を選び、同じアドレスが別の拠点（ここでは東京）へ向かいます。端末は何も変えませんが、開いていた接続は、それを知らない拠点へ移ります。エニーキャストのレッスンで、拠点を 1 つずつ止められます。',
      },
      taughtBy: 'anycast',
    },
  ],
  [
    's7-sdwan-voice',
    {
      id: 's7-netconf-bad-mtu',
      prompt: {
        en: 'Over NETCONF you send R2 one edit: a new description, a second address, and an MTU of 10000, which its YANG model does not allow. What is R2’s running configuration afterwards?',
        ja: 'NETCONF で R2 に 1 回の変更を送ります。説明文の変更、2 つ目のアドレス、そして YANG モデルが許さない MTU 10000 です。そのあとの R2 の running 設定はどうなっていますか？',
      },
      options: [
        { en: 'All three, the MTU capped', ja: '3 つとも、MTU は上限値' },
        { en: 'The first two, MTU at 1500', ja: '前の 2 つだけ、MTU 1500' },
        { en: 'Exactly as it was before', ja: '変更前とまったく同じ' },
        { en: 'Empty until it is fixed', ja: '直すまで設定が空になる' },
      ],
      answer: 2,
      explanation: {
        en: 'A NETCONF edit is checked against the YANG model as one whole: the MTU fails validation (invalid-value), so nothing is committed and running is exactly as before. A CLI script sent line by line would leave the description and address in and the MTU at 1500. The NETCONF lesson sends the same change both ways.',
        ja: 'NETCONF の変更は、まとめて YANG モデルで検証されます。MTU が検証で外れる（invalid-value）ので何も確定されず、running は変更前とまったく同じです。1 行ずつ送る CLI のスクリプトなら、説明文とアドレスだけが入り、MTU は 1500 のまま残ります。NETCONF のレッスンで、同じ変更を両方の方法で送れます。',
      },
      taughtBy: 'netconf',
    },
  ],
  [
    's7-ech-observer',
    {
      id: 's7-encdns-port-block',
      prompt: {
        en: 'A café network wants to stop encrypted DNS by blocking its port, without breaking ordinary web browsing. Which method can it not stop that way?',
        ja: 'カフェのネットワークが、普通の Web 閲覧を壊さずに、ポートをふさぐだけで暗号化 DNS を止めたいとします。その方法で止められないのはどれですか？',
      },
      options: [
        { en: 'DNS over TLS, TCP 853', ja: 'DNS over TLS（TCP 853）' },
        { en: 'DNS over HTTPS, TCP 443', ja: 'DNS over HTTPS（TCP 443）' },
        { en: 'DNS over QUIC, UDP 853', ja: 'DNS over QUIC（UDP 853）' },
        { en: 'Classic DNS on UDP port 53', ja: '暗号化しない昔ながらの DNS（UDP 53）' },
      ],
      answer: 1,
      explanation: {
        en: 'DoH runs on TCP 443, the port of every HTTPS site, so blocking the port blocks the web too; DoT and DoQ have port 853 to themselves (RFC 8484, RFC 7858, RFC 9250). The encrypted-DNS lesson shows what the café can do to each method.',
        ja: 'DoH は、すべての HTTPS サイトと同じ TCP 443 を使うので、ポートをふさぐと Web も止まります。DoT と DoQ は専用の 853 番です（RFC 8484、RFC 7858、RFC 9250）。DNS の暗号化のレッスンで、カフェが各方法に何をできるかが見られます。',
      },
      taughtBy: 'encrypted-dns',
    },
  ],
  [
    's7-ech-observer',
    {
      id: 's7-masque-two-hop',
      prompt: {
        en: 'You browse through two MASQUE relays, an ingress and an egress, each wrapping sealed to its relay alone. Besides you, who knows both your address and the site you visit?',
        ja: '入口と出口の 2 つの MASQUE リレーを通して閲覧します。包みはそれぞれ、そのリレーだけが開けるように封がされています。あなた以外で、あなたのアドレスと訪れるサイトの両方を知っているのはだれですか？',
      },
      options: [
        { en: 'The ingress relay', ja: '入口のリレー' },
        { en: 'The egress relay', ja: '出口のリレー' },
        { en: 'The café’s Wi-Fi', ja: 'カフェの Wi-Fi' },
        { en: 'No one of them', ja: 'だれもいない' },
      ],
      answer: 3,
      explanation: {
        en: 'The ingress relay sees your address but opens only a wrapping that names the egress; the egress relay opens that and learns the site, but sees traffic only from the ingress; the Wi-Fi sees you talk to the ingress. With one proxy, that proxy knows both. The MASQUE lesson reads this from the wrappings.',
        ja: '入口のリレーにはあなたのアドレスが見えますが、開けられるのは出口を指す包みだけです。出口のリレーはそれを開けてサイトを知りますが、通信は入口から来たようにしか見えません。Wi-Fi に見えるのは、入口と話していることだけです。プロキシが 1 つなら、そのプロキシが両方を知ります。MASQUE のレッスンで、包みから読み取れます。',
      },
      taughtBy: 'masque',
    },
  ],
  [
    's7-h3-stream-ids',
    {
      id: 's7-quic-migration-cid',
      prompt: {
        en: 'A phone downloading over QUIC walks out of Wi-Fi onto mobile data, so its address and port change. How does the server know the next packet belongs to the same connection?',
        ja: 'QUIC でダウンロード中のスマートフォンが、Wi-Fi の外に出てモバイル回線に切り替わり、アドレスとポートが変わります。サーバは、次のパケットが同じ接続のものだとどうして分かりますか？',
      },
      options: [
        { en: 'By its connection ID', ja: '接続 ID を見て' },
        { en: 'By its address and ports', ja: 'アドレスとポートを見て' },
        { en: 'By a new TLS handshake', ja: 'TLS をやり直して' },
        { en: 'It does not; it resets', ja: '分からない。切断する' },
      ],
      answer: 0,
      explanation: {
        en: 'QUIC finds a connection by its destination connection ID, not by addresses and ports, so the lookup still hits; the phone switches to a spare ID the server issued so the two paths cannot be linked, and the server checks the new path with PATH_CHALLENGE (RFC 9000 §9). A TCP connection is found by its 4-tuple and has to be opened again. The QUIC migration lesson moves the phone both ways.',
        ja: 'QUIC は、アドレスとポートではなく宛先の接続 ID で接続を探すので、移っても見つかります。スマートフォンは 2 つの経路を結び付けられないよう、サーバが渡しておいた予備の ID に切り替え、サーバは PATH_CHALLENGE で新しい経路を確かめます（RFC 9000 §9）。TCP の接続は 4 つ組で探すので、開き直しになります。QUIC の接続移行のレッスンで、両方を移動させられます。',
      },
      taughtBy: 'quic-migration',
    },
  ],
  [
    's7-cc-rto-ssthresh',
    {
      id: 's7-wscale-stripped',
      prompt: {
        en: 'A firewall strips the window-scale option from the SYN on a 1 Gbit/s path with a 150 ms round trip. What happens to the transfer?',
        ja: '1 Gbit/s、往復 150 ms の経路で、ファイアウォールが SYN からウィンドウスケールのオプションを取り除きます。転送はどうなりますか？',
      },
      options: [
        { en: 'It fails: no connection', ja: '失敗する。接続できない' },
        { en: 'It runs at nearly 1 Gbit/s', ja: 'ほぼ 1 Gbit/s で進む' },
        { en: 'It works, at about 3.5 Mbit/s', ja: '動くが、約 3.5 Mbit/s' },
        { en: 'It works, at about 500 Mbit/s', ja: '動くが、約 500 Mbit/s' },
      ],
      answer: 2,
      explanation: {
        en: 'Without the option in both SYNs neither side scales, so the window stays at 65,535 bytes: 65,535 × 8 ÷ 0.15 s ≈ 3.5 Mbit/s, where filling the path needs 18.75 MB in flight (RFC 7323). The connection still works, only slowly. The window-scaling lesson strips the option and shows the rate.',
        ja: '両方の SYN にオプションがそろわないと、どちらも倍率を使わず、ウィンドウは 65,535 バイトのままです。65,535 × 8 ÷ 0.15 秒 ≈ 3.5 Mbit/s で、経路を埋めるには 18.75 MB を送ったままにする必要があります（RFC 7323）。接続は動きますが、遅いだけです。ウィンドウスケールのレッスンで、オプションを外して速さを見られます。',
      },
      taughtBy: 'tcp-options',
    },
  ],
  [
    's7-cc-rto-ssthresh',
    {
      id: 's7-mptcp-stripped',
      prompt: {
        en: 'A phone downloads over Multipath TCP on Wi-Fi and LTE, but a middlebox on the way strips MP_CAPABLE from the handshake. Three seconds in, Wi-Fi is lost. What happens to the download?',
        ja: 'スマートフォンが Wi-Fi と LTE で Multipath TCP のダウンロードをしますが、途中の機器がハンドシェイクから MP_CAPABLE を取り除きます。3 秒後に Wi-Fi が切れます。ダウンロードはどうなりますか？',
      },
      options: [
        { en: 'It carries on over LTE', ja: 'LTE に移って続ける' },
        { en: 'It breaks: plain TCP', ja: '止まる。普通の TCP' },
        { en: 'It pauses, then resumes', ja: '一度止まり、再開する' },
        { en: 'It restarts from zero', ja: '最初からやり直す' },
      ],
      answer: 1,
      explanation: {
        en: 'Without MP_CAPABLE in the SYN, SYN-ACK and ACK, both ends fall back to plain TCP on Wi-Fi alone (RFC 8684), so there is no LTE subflow to move to and the download breaks when Wi-Fi goes. With the option through, it carries on over LTE. The Multipath TCP lesson strips the option and drops Wi-Fi.',
        ja: 'SYN、SYN-ACK、ACK に MP_CAPABLE がそろわないと、両端は Wi-Fi だけの普通の TCP に戻ります（RFC 8684）。移る先の LTE のサブフローがないので、Wi-Fi が切れるとダウンロードは止まります。オプションが通っていれば LTE で続きます。Multipath TCP のレッスンで、オプションを外して Wi-Fi を切れます。',
      },
      taughtBy: 'mptcp',
    },
  ],
  [
    's7-l4s-both',
    {
      id: 's7-telemetry-poll-miss',
      prompt: {
        en: 'In the telemetry lesson’s ten-minute run an uplink is down from 6:40 to 7:10 (minutes:seconds). SNMP polls its status every five minutes, at 5:00 and 10:00. What do the polls show?',
        ja: 'テレメトリのレッスンの 10 分間の実行で、上りの回線が 6:40〜7:10（分:秒）の間落ちます。SNMP は 5 分ごと、5:00 と 10:00 に状態を取りに行きます。取得した結果はどうなりますか？',
      },
      options: [
        { en: 'UP, then DOWN', ja: 'UP のあと DOWN' },
        { en: 'DOWN, then UP', ja: 'DOWN のあと UP' },
        { en: 'Both DOWN', ja: '2 回とも DOWN' },
        { en: 'Both UP', ja: '2 回とも UP' },
      ],
      answer: 3,
      explanation: {
        en: 'A poll sees only the moment it asks: at 5:00 and at 10:00 the link is up, and the 30-second outage falls between them. Streaming telemetry subscribed ON_CHANGE sends one update at 6:40 and another at 7:10. The telemetry lesson draws both.',
        ja: '取得で分かるのは、取りに行ったその瞬間だけです。5:00 にも 10:00 にも回線は上がっていて、30 秒の停止はその間に収まります。ON_CHANGE で購読したストリーミングテレメトリなら、6:40 と 7:10 に通知が届きます。テレメトリのレッスンで両方を描けます。',
      },
      taughtBy: 'telemetry',
    },
  ],

  // --- Stage 6 (level 3) ---------------------------------------------------
  [
    'ospf-remote-failure',
    {
      id: 'l3-isis-l1-areas',
      prompt: {
        en: 'In the IS-IS lesson R1 (Level 1, area 49.0001) and R5 (Level 1, area 49.0002) share a direct link. How does R1’s traffic for R5’s LAN go?',
        ja: 'IS-IS のレッスンで、R1（レベル 1、エリア 49.0001）と R5（レベル 1、エリア 49.0002）は直接リンクでつながっています。R1 から R5 の LAN への通信はどう進みますか？',
      },
      options: [
        { en: 'Straight over the R1–R5 link', ja: 'R1–R5 のリンクを直接' },
        { en: 'Nowhere: no route exists', ja: 'どこにも。経路がない' },
        { en: 'Via its area’s L1/L2 router', ja: 'エリアの L1/L2 ルータ経由' },
        { en: 'Over Level 2 from R1 itself', ja: 'R1 自身からレベル 2 を使う' },
      ],
      answer: 2,
      explanation: {
        en: 'Level 1 routers form an adjacency only within their own area, so R1 and R5 form none over their link. R1 follows its default route to the nearest router that sets the attached bit, R2, which carries the packet over Level 2 to R4 and on to R5 (metric 30). The IS-IS lesson traces it hop by hop.',
        ja: 'レベル 1 のルータは同じエリアの中でしか隣接を作らないので、R1 と R5 はリンクがあっても隣接になりません。R1 は、ATT ビットを立てたいちばん近いルータ R2 へのデフォルト経路に従い、R2 がレベル 2 で R4 へ、さらに R5 へ運びます（メトリック 30）。IS-IS のレッスンで、1 ホップずつたどれます。',
      },
      taughtBy: 'isis',
    },
  ],
  [
    'ecmp-flow-hash',
    {
      id: 'l3-spine-down',
      prompt: {
        en: 'In a spine-leaf fabric of eight leaves and four spines, each leaf has one 100 Gbit/s uplink to every spine. One spine fails. Between two leaves, what is left?',
        ja: 'リーフ 8 台、スパイン 4 台のスパイン・リーフ構成で、各リーフはすべてのスパインに 100 Gbit/s の上りを 1 本ずつ持ちます。スパインが 1 台故障しました。2 台のリーフの間には何が残りますか？',
      },
      options: [
        { en: 'Two paths, half the capacity', ja: '2 経路、容量の半分' },
        { en: 'Three paths, 75 % of capacity', ja: '3 経路、容量の 75 %' },
        { en: 'Four paths, but one hop longer', ja: '4 経路、1 ホップ長く' },
        { en: 'One path through a peer leaf', ja: '隣のリーフ経由の 1 経路' },
      ],
      answer: 1,
      explanation: {
        en: 'Every leaf reaches every other through each spine, always three switches apart; one of four spines down leaves three equal-cost paths and 300 of each leaf’s 400 Gbit/s of uplinks. The spine-leaf lesson fails spines one at a time.',
        ja: 'どのリーフも、各スパインを通って他のリーフに届き、間は常にスイッチ 3 台です。4 台中 1 台が落ちると、等コストの経路が 3 本と、各リーフの上り 400 Gbit/s のうち 300 Gbit/s が残ります。スパイン・リーフのレッスンで、スパインを 1 台ずつ止められます。',
      },
      taughtBy: 'spine-leaf',
    },
  ],
  [
    'vrrp-failover',
    {
      id: 'l3-lb-hash-remove',
      prompt: {
        en: 'In the load-balancer lesson the balancer picks web1, web2 or web3 by hashing the client’s address over the servers in service. web3 is taken out. Which clients now land on a different server?',
        ja: 'ロードバランサのレッスンで、ロードバランサは稼働中のサーバ web1、web2、web3 の中から、クライアントのアドレスのハッシュで振り分け先を決めます。web3 を外しました。振り分け先が変わるのはどのクライアントですか？',
      },
      options: [
        { en: 'web3’s, and some of the others', ja: 'web3 の分とほかの一部' },
        { en: 'Only those that were on web3', ja: 'web3 にいた分だけ' },
        { en: 'None; web3’s are refused', ja: 'なし。web3 の分は拒否' },
        { en: 'Every client, without exception', ja: '例外なく全クライアント' },
      ],
      answer: 0,
      explanation: {
        en: 'This lesson’s hash takes the client’s address modulo the number of servers in service, so going from three to two reshuffles some clients that were on web1 and web2 as well, and they lose their sessions. Consistent hashing would move only web3’s. The load-balancer lesson takes web3 out and shows who moves.',
        ja: 'このレッスンのハッシュは、クライアントのアドレスを稼働中のサーバ数で割った余りを使います。3 台から 2 台に減ると、web1 や web2 にいたクライアントの一部も移り、セッションを失います。コンシステントハッシュなら、移るのは web3 にいた分だけです。ロードバランサのレッスンで、web3 を外して、だれが移るかを見られます。',
      },
      taughtBy: 'load-balancer',
    },
  ],
  [
    'lacp-member-failure',
    {
      id: 'l3-netflow-one-flow',
      prompt: {
        en: 'In the flow observability lesson the client sends the same DNS query flow (UDP 53000 → 53) three times through R1, which runs NetFlow. What does R1’s flow record show?',
        ja: 'フローの可視化のレッスンで、クライアントが同じ DNS 問い合わせのフロー（UDP 53000 → 53）を、NetFlow が動く R1 を通して 3 回送ります。R1 のフロー記録はどうなりますか？',
      },
      options: [
        { en: 'Three flows of 1 packet', ja: '1 パケットのフローが 3 つ' },
        { en: 'One flow of 1 packet', ja: '1 パケットのフローが 1 つ' },
        { en: 'One flow of 3 packets', ja: '3 パケットのフローが 1 つ' },
        { en: 'No record: it was sampled', ja: '記録なし。抽出で漏れた' },
      ],
      answer: 2,
      explanation: {
        en: 'NetFlow keeps one record per flow, keyed by its addresses, ports and protocol, and counts every packet of it: the three sends are one flow of 3 packets. sFlow on the switch reports samples of packets instead. The flow observability lesson shows both.',
        ja: 'NetFlow は、アドレス、ポート、プロトコルで決まるフローごとに 1 つの記録を持ち、そのすべてのパケットを数えます。3 回の送信は、3 パケットのフロー 1 つです。スイッチの sFlow は、代わりに一部のパケットを抜き出して報告します。フローの可視化のレッスンで両方が見られます。',
      },
      taughtBy: 'observability',
    },
  ],
  [
    'igmp-snooping-ports',
    {
      id: 'l3-pim-rpf',
      prompt: {
        en: 'In the PIM lesson R5 is on the source tree, and its unicast route back to the source goes via R4. A copy of the group’s traffic arrives at R5 from R3. What does R5 do with it?',
        ja: 'PIM のレッスンで、R5 は送信元ツリーに乗っていて、送信元へ戻るユニキャスト経路は R4 経由です。グループの通信のコピーが R3 から R5 に届きました。R5 はそれをどうしますか？',
      },
      options: [
        { en: 'Forwards it to its receivers', ja: '受信者へ転送する' },
        { en: 'Forwards it back towards R3', ja: 'R3 の方へ送り返す' },
        { en: 'Keeps it, and drops R4’s copy', ja: 'R4 の分を捨てて使う' },
        { en: 'Drops it: it fails RPF', ja: '捨てる。RPF に失敗' },
      ],
      answer: 3,
      explanation: {
        en: 'On the source tree a router accepts a multicast packet only from the neighbour it would use to reach the source, here R4; a copy from R3 fails the reverse-path forwarding check and is dropped, which is what stops loops (RFC 7761). The PIM lesson runs the check for every router.',
        ja: '送信元ツリーでは、ルータはマルチキャストのパケットを、送信元へ向かうときに使う隣（ここでは R4）からしか受け取りません。R3 からのコピーは逆経路転送（RPF）の確認に失敗して捨てられ、これがループを防ぎます（RFC 7761）。PIM のレッスンで、すべてのルータの確認を試せます。',
      },
      taughtBy: 'pim',
    },
  ],
  [
    'mpls-php',
    {
      id: 'l3-sr-steer-r3',
      prompt: {
        en: 'In the segment-routing lesson R1 sends 10.4.0.0/24 to R4 by the shortest path, through R2. To send it through R3 instead, what has to change?',
        ja: 'セグメントルーティングのレッスンで、R1 は 10.4.0.0/24 を最短経路の R2 経由で R4 へ送っています。代わりに R3 を通すには、何を変える必要がありますか？',
      },
      options: [
        { en: 'A path entry on R2, R3 and R4', ja: 'R2、R3、R4 の経路の登録' },
        { en: 'Only the SIDs R1 pushes', ja: 'R1 が積む SID だけ' },
        { en: 'R3’s node SID, to 16004', ja: 'R3 のノード SID を 16004 に' },
        { en: 'A new label on every link', ja: 'すべてのリンクに新しいラベル' },
      ],
      answer: 1,
      explanation: {
        en: 'Every router already knows every node SID, so R1 writes the path into the packet: it pushes 16003 then 16004, R3 removes its own SID and the next one leads to R4. R2, R3 and R4 keep no per-path state and their tables do not change. (The lesson turns penultimate-hop popping off; with it on, the SR-MPLS default, the hop before a SID’s owner removes it instead.) The segment-routing lesson sends both.',
        ja: 'どのルータもすべてのノード SID を知っているので、R1 が通る道をパケットに書き込みます。16003、16004 の順に積むと、R3 が自分の SID を外し、次の SID が R4 へ導きます。R2、R3、R4 は経路ごとの状態を持たず、表も変わりません（このレッスンは PHP を無効にしています。SR-MPLS の既定である PHP ありでは、SID を持つルータの 1 つ手前で外されます）。セグメントルーティングのレッスンで両方を送れます。',
      },
      taughtBy: 'segment-routing',
    },
  ],
  [
    'mpls-php',
    {
      id: 'l3-te-cspf',
      prompt: {
        en: 'In the traffic-engineering lesson A–B–Z is the IGP shortest path, but LSP 1 has reserved 6 of A–B’s 10 Gbit/s. LSP 2 asks for 5 Gbit/s. A–C–Z (metric 30, 10 Gbit/s links) and A–E–Z (metric 40, 6 Gbit/s) are unreserved. Where does CSPF place LSP 2?',
        ja: 'トラフィックエンジニアリングのレッスンで、IGP の最短経路は A–B–Z ですが、LSP 1 が A–B の 10 Gbit/s のうち 6 Gbit/s を予約済みです。LSP 2 は 5 Gbit/s を求めます。A–C–Z（メトリック 30、10 Gbit/s のリンク）と A–E–Z（メトリック 40、6 Gbit/s）は予約がありません。CSPF は LSP 2 をどこに置きますか？',
      },
      options: [
        { en: 'A→B→Z, beside LSP 1', ja: 'A→B→Z（LSP 1 の隣）' },
        { en: 'A→B→D→Z, avoiding B–Z', ja: 'A→B→D→Z（B–Z を避ける）' },
        { en: 'A→C→Z, metric 30', ja: 'A→C→Z（メトリック 30）' },
        { en: 'A→E→Z, metric 40', ja: 'A→E→Z（メトリック 40）' },
      ],
      answer: 2,
      explanation: {
        en: 'CSPF first sets aside every link without 5 Gbit/s unreserved, here A–B with 4 left, then takes the shortest path that remains: A→C→Z at metric 30 (RFC 3209). Plain IGP forwarding would put both on A–B–Z and overload A–B. The MPLS traffic-engineering lesson places the LSPs one by one.',
        ja: 'CSPF はまず、予約されていない帯域が 5 Gbit/s に満たないリンク（残り 4 Gbit/s の A–B）を外し、残りの中で最短の経路、メトリック 30 の A→C→Z を選びます（RFC 3209）。IGP だけで転送すると、両方が A–B–Z に乗って A–B があふれます。MPLS トラフィックエンジニアリングのレッスンで、LSP を 1 本ずつ置けます。',
      },
      taughtBy: 'mpls-te',
    },
  ],
  [
    'evpn-arp-suppression',
    {
      id: 'l3-gre-key-mismatch',
      prompt: {
        en: 'In the GRE lesson Site A’s tunnel sends with GRE key 100, but Site B’s end of the tunnel is set to key 200. Host A pings Host B. What happens?',
        ja: 'GRE のレッスンで、拠点 A のトンネルは GRE キー 100 で送りますが、拠点 B のトンネルの端はキー 200 に設定されています。Host A が Host B に ping を送ります。どうなりますか？',
      },
      options: [
        { en: 'Site B drops it: keys differ', ja: '拠点 B で捨てられる' },
        { en: 'It arrives; keys are optional', ja: '届く。キーは付けなくてよい' },
        { en: 'It arrives, rekeyed to 200', ja: 'キー 200 に直して届く' },
        { en: 'The underlay drops it first', ja: '途中の網が先に捨てる' },
      ],
      answer: 0,
      explanation: {
        en: 'The key tells the receiving end which tunnel a packet belongs to (RFC 2890). The underlay carries the outer packet (198.51.100.1 → 198.51.100.6, protocol 47) all the way, but Site B has no tunnel for key 100 and drops it. The GRE lesson lets you change Site B’s key.',
        ja: 'キーは、受け取った側にパケットがどのトンネルのものかを示します（RFC 2890）。途中の網は外側のパケット（198.51.100.1 → 198.51.100.6、プロトコル 47）を最後まで運びますが、拠点 B にはキー 100 のトンネルがないので捨てます。GRE のレッスンで、拠点 B のキーを変えられます。',
      },
      taughtBy: 'gre',
    },
  ],
  [
    'evpn-arp-suppression',
    {
      id: 'l3-vpn-esp-observer',
      prompt: {
        en: 'Two offices are joined by IPsec ESP in tunnel mode. A packet goes from 10.1.0.10 to 10.2.0.20, port 80. What can an observer on the internet read of it?',
        ja: '2 つの拠点が、トンネルモードの IPsec ESP でつながっています。10.1.0.10 から 10.2.0.20 の 80 番へパケットが送られます。インターネット上の観測者は、そのどこを読めますか？',
      },
      options: [
        { en: 'The inner addresses and ports', ja: '内側のアドレスとポート' },
        { en: 'The public addresses and SPI', ja: '公開アドレスと SPI' },
        { en: 'Nothing, not even addresses', ja: 'アドレスも含め何も' },
        { en: 'All of it; ESP only signs', ja: 'すべて。ESP は署名だけ' },
      ],
      answer: 1,
      explanation: {
        en: 'Tunnel mode encrypts the whole inner packet, its addresses, ports and data, and adds an outer header between the two gateways’ public addresses and the ESP header with its SPI and sequence number (RFC 4303). GRE alone would leave everything readable. The site-to-site VPN lesson shows the bytes each method leaves readable.',
        ja: 'トンネルモードは内側のパケット全体（アドレス、ポート、データ）を暗号化し、2 つのゲートウェイの公開アドレスの外側ヘッダと、SPI と通番を持つ ESP ヘッダを付けます（RFC 4303）。GRE だけなら、すべて読めてしまいます。拠点間 VPN のレッスンで、方法ごとに読めるバイトが見られます。',
      },
      taughtBy: 'vpn-tunnel',
    },
  ],

  // --- Stage 6 (level 4) ---------------------------------------------------
  [
    'ospf-bgp-transit-link',
    {
      id: 'l4-community-no-export',
      prompt: {
        en: 'A customer (AS65000) sends its route to AS65001 tagged with the well-known community NO_EXPORT. AS65001 has routers E1, C1 and E2, and E2 peers with AS65002. Which routers end up holding the route?',
        ja: '顧客（AS65000）が、ウェルノウンコミュニティ NO_EXPORT を付けた経路を AS65001 に送ります。AS65001 にはルータ E1、C1、E2 があり、E2 が AS65002 とつながっています。最終的にその経路を持つのはどのルータですか？',
      },
      options: [
        { en: 'Only E1, the first to hear it', ja: '最初に受けた E1 だけ' },
        { en: 'Every router, AS65002’s too', ja: 'AS65002 も含め全ルータ' },
        { en: 'None: the tag rejects it', ja: 'なし。タグで拒否される' },
        { en: 'All of AS65001, not AS65002', ja: 'AS65001 の全ルータだけ' },
      ],
      answer: 3,
      explanation: {
        en: 'NO_EXPORT (65535:65281) lets a route travel inside the AS that received it, over iBGP to C1 and E2, but not out over eBGP to another AS (RFC 1997). NO_ADVERTISE would stop it at E1. The BGP policy lesson tags the route each way and shows who holds it.',
        ja: 'NO_EXPORT（65535:65281）を付けた経路は、受け取った AS の中では iBGP で C1 と E2 まで届きますが、eBGP で別の AS へは出ません（RFC 1997）。NO_ADVERTISE なら E1 で止まります。BGP ポリシーのレッスンで、付けるコミュニティを変えて、だれが持つかを見られます。',
      },
      taughtBy: 'bgp-policy',
    },
  ],
  [
    'ospf-bgp-transit-link',
    {
      id: 'l4-rpki-more-specific',
      prompt: {
        en: 'A ROA allows AS64500 to originate 192.0.2.0/24 with maxLength 24. AS64511 announces 192.0.2.0/25. What is the /25’s route origin validation state?',
        ja: 'ROA が、AS64500 による 192.0.2.0/24 の広告を最大長 24 で認めています。AS64511 が 192.0.2.0/25 を広告しました。この /25 の経路オリジン検証の結果は何ですか？',
      },
      options: [
        { en: 'Valid: it is inside the /24', ja: 'Valid（/24 の内側だから）' },
        { en: 'Invalid: no ROA allows it', ja: 'Invalid（認める ROA がない）' },
        { en: 'NotFound: no ROA for a /25', ja: 'NotFound（/25 の ROA がない）' },
        { en: 'Valid until the /24 is lost', ja: 'Valid（/24 が消えるまで）' },
      ],
      answer: 1,
      explanation: {
        en: 'The /24 ROA covers the /25, so the route is not NotFound; but it allows neither AS64511 nor a prefix longer than /24, so the /25 is Invalid (RFC 6811). A router that drops Invalid routes keeps sending 192.0.2.10 along the holder’s /24. The RPKI lesson validates each announcement.',
        ja: '/24 の ROA は /25 を覆っているので、NotFound ではありません。しかし AS64511 も、/24 より長いプレフィックスも認めていないので、/25 は Invalid です（RFC 6811）。Invalid を捨てるルータは、192.0.2.10 宛てを本来の持ち主の /24 に送り続けます。RPKI のレッスンで、広告を 1 つずつ検証できます。',
      },
      taughtBy: 'rpki',
    },
  ],
];

/** Wave C questions, by the id of the original question whose slot they join. */
export const POOL_C: ReadonlyMap<string, readonly ExamQuestion[]> = ENTRIES.reduce(
  (map, [key, question]) => map.set(key, [...(map.get(key) ?? []), question]),
  new Map<string, readonly ExamQuestion[]>(),
);
