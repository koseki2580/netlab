/**
 * Wave A of the question pools (REQ-194): a second question for each slot of
 * the tests of stages 1–4 (levels 5, 6, 7 and 1), keyed by the id of the
 * question already in that slot. Each asks the same topic in another
 * situation and is taught by the same stop of the path. Answers whose truth is
 * arithmetic or the simulator's are checked in `examPoolA.test.ts`.
 */
import type { ExamQuestion } from './examQuestions';

const STAGE_1: readonly (readonly [string, ExamQuestion])[] = [
  [
    's1-hops',
    {
      id: 's1-hops-one-switch',
      prompt: {
        en: 'PC-A and PC-B are plugged into one switch. PC-A sends a packet to PC-B. How many hops does it take?',
        ja: 'PC-A と PC-B が 1 台のスイッチにつながっています。PC-A から PC-B へパケットを送ります。何ホップかかりますか？',
      },
      options: [
        { en: '1, the switch in between', ja: '1。間のスイッチの分' },
        { en: '2, one for each cable', ja: '2。ケーブル 1 本で 1' },
        { en: '3, counting both PCs', ja: '3。両方の PC も数える' },
        { en: '0, no router is crossed', ja: '0。ルータを越えないから' },
      ],
      answer: 3,
      explanation: {
        en: 'A hop is one router crossed; a switch only passes the frame on (RFC 791, RFC 1812 §5.3.1). Between PC-A and PC-B there is no router, so 0 hops. The course counts hops by routers.',
        ja: 'ホップは越えたルータの数で、スイッチはフレームをそのまま渡すだけです（RFC 791、RFC 1812 §5.3.1）。PC-A と PC-B の間にルータはないので 0 ホップです。入門コースでもルータで数えます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-same-16',
    {
      id: 's1-same-24',
      prompt: {
        en: 'A PC is 192.168.5.20/24. Which of these machines is on the same network as the PC?',
        ja: 'PC のアドレスは 192.168.5.20/24 です。この PC と同じネットワークにいるのはどれですか？',
      },
      options: [
        { en: '192.168.6.205', ja: '192.168.6.205' },
        { en: '192.169.5.20', ja: '192.169.5.20' },
        { en: '10.192.168.5', ja: '10.192.168.5' },
        { en: '192.168.5.200', ja: '192.168.5.200' },
      ],
      answer: 3,
      explanation: {
        en: '/24 means the first three numbers name the network: 192.168.5. Only 192.168.5.200 starts with them; the last number names the machine. The subnetting practice asks this same question first.',
        ja: '/24 は「最初の 3 つの数がネットワーク」という意味で、ここでは 192.168.5 です。それで始まるのは 192.168.5.200 だけで、最後の数は機器の番号です。サブネットの練習でも、最初にこの問いを考えます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-mask-24',
    {
      id: 's1-mask-written',
      prompt: {
        en: 'A PC’s settings say address 10.1.2.3, mask 255.255.255.0. How is the same thing written with a slash?',
        ja: 'PC の設定に、アドレス 10.1.2.3、マスク 255.255.255.0 とあります。同じことをスラッシュで書くとどうなりますか？',
      },
      options: [
        { en: '10.1.2.3/24', ja: '10.1.2.3/24' },
        { en: '10.1.2.3/8', ja: '10.1.2.3/8' },
        { en: '10.1.2.3/16', ja: '10.1.2.3/16' },
        { en: '10.1.2.3/255', ja: '10.1.2.3/255' },
      ],
      answer: 0,
      explanation: {
        en: 'Each 255 is one whole number of the address kept for the network, 8 bits each: three of them are 24 bits, so /24. The course explains /24 and its mask side by side.',
        ja: '255 の 1 つは、アドレスの数 1 つ分（8 ビット）をネットワークに使うという意味です。3 つで 24 ビットなので /24 です。入門コースで、/24 とマスクを並べて説明しています。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-copy-discard',
    {
      id: 's1-copy-learned',
      prompt: {
        en: 'PC-A, PC-B and PC-C share one switch. PC-A has just sent to PC-B, and PC-B’s answer has come back. PC-A sends to PC-B again. Which PCs receive this frame?',
        ja: 'PC-A、PC-B、PC-C が 1 台のスイッチにつながっています。PC-A が PC-B に送り、PC-B の返事も戻ってきたところです。PC-A がもう一度 PC-B に送ります。このフレームを受け取るのはどれですか？',
      },
      options: [
        { en: 'PC-B and PC-C', ja: 'PC-B と PC-C' },
        { en: 'Every PC on it', ja: 'スイッチの全部の PC' },
        { en: 'PC-B only', ja: 'PC-B だけ' },
        { en: 'None until asked', ja: '聞き直すまでどれも' },
      ],
      answer: 2,
      explanation: {
        en: 'The switch noted which port each sender was on as the frames passed, so it now knows PC-B’s port and sends there only. Only a destination it has not learned is copied to every port. The course’s third step shows the copy once and then none.',
        ja: 'スイッチは、フレームが通るたびに送り主がどのポートにいるかを覚えています。PC-B のポートをもう知っているので、そこにだけ送ります。全部のポートに写すのは、まだ覚えていない宛先のときだけです。入門コースの 3 番目のステップで、写しが 1 回だけ出る様子が見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-gateway-value',
    {
      id: 's1-gateway-other-side',
      prompt: {
        en: 'The router has 10.0.0.1 on PC-A’s network and 192.168.1.1 on PC-D’s. PC-D is 192.168.1.11/24. What should PC-D’s default gateway be?',
        ja: 'ルータは、PC-A の側に 10.0.0.1、PC-D の側に 192.168.1.1 を持っています。PC-D は 192.168.1.11/24 です。PC-D のデフォルトゲートウェイは何にしますか？',
      },
      options: [
        { en: '10.0.0.1', ja: '10.0.0.1' },
        { en: '192.168.1.1', ja: '192.168.1.1' },
        { en: '192.168.1.11', ja: '192.168.1.11' },
        { en: '10.0.0.11', ja: '10.0.0.11' },
      ],
      answer: 1,
      explanation: {
        en: 'A default gateway is the way out of the PC’s own network, so it must be the router’s address on that network: 192.168.1.1. 10.0.0.1 is the way out for PC-A’s side. The course sets each side’s gateway at its fifth step.',
        ja: 'デフォルトゲートウェイは自分のネットワークの外への出口なので、同じネットワークにあるルータのアドレス 192.168.1.1 にします。10.0.0.1 は PC-A の側の出口です。入門コースの 5 番目のステップで、それぞれの側の出口を設定します。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-two-switches',
    {
      id: 's1-switch-chain',
      prompt: {
        en: 'PC-A (10.0.0.11/24) is on Switch-1 and PC-B (10.0.0.12/24) on Switch-2. A cable joins the two switches. There is no router. Can PC-A reach PC-B?',
        ja: 'PC-A（10.0.0.11/24）は Switch-1 に、PC-B（10.0.0.12/24）は Switch-2 につながっています。2 台のスイッチはケーブルでつながっていて、ルータはありません。PC-A から PC-B に届きますか？',
      },
      options: [
        { en: 'No, switches need a router', ja: '届かない。ルータが要る' },
        { en: 'Only if the switches have IPs', ja: 'スイッチに IP があれば届く' },
        { en: 'Only the first packet does', ja: '最初の 1 通だけ届く' },
        { en: 'Yes, it is one network', ja: '届く。同じネットワークだから' },
      ],
      answer: 3,
      explanation: {
        en: 'Both PCs are on 10.0.0.x/24, one network, and joined switches carry a network’s frames between them. A router is needed only to reach another network, which is why the course’s fourth step fails and this does not.',
        ja: '2 台とも 10.0.0.x/24 で同じネットワークです。つながったスイッチは、同じネットワークのフレームを互いに運びます。ルータが要るのは別のネットワークへ行くときだけで、入門コースの 4 番目のステップが失敗するのはそのためです。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-usable-address',
    {
      id: 's1-usable-pick',
      prompt: {
        en: 'A new PC joins network 10.0.5.0/24. Which address can it be given?',
        ja: '新しい PC がネットワーク 10.0.5.0/24 に加わります。どのアドレスを付けられますか？',
      },
      options: [
        { en: '10.0.5.0', ja: '10.0.5.0' },
        { en: '10.0.5.255', ja: '10.0.5.255' },
        { en: '10.0.6.1', ja: '10.0.6.1' },
        { en: '10.0.5.1', ja: '10.0.5.1' },
      ],
      answer: 3,
      explanation: {
        en: 'In a /24 the last number 0 names the network itself and 255 is the address for everyone at once, so neither can be a machine’s. 10.0.6.1 is on another network. The subnetting practice marks these two ends.',
        ja: '/24 では、最後の数が 0 のものはネットワークそのもの、255 は全員あての特別なアドレスで、どちらも機器には付けられません。10.0.6.1 は別のネットワークです。サブネットの練習で、この両端を確かめます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-host-count',
    {
      id: 's1-host-room',
      prompt: {
        en: 'An office network is 192.168.10.0/24. It already has 250 PCs and its router. How many more machines can it take?',
        ja: 'ある事務所のネットワークは 192.168.10.0/24 です。すでに PC が 250 台とルータが 1 台あります。あと何台つなげますか？',
      },
      options: [
        { en: '5 more', ja: 'あと 5 台' },
        { en: '3 more', ja: 'あと 3 台' },
        { en: '4 more', ja: 'あと 4 台' },
        { en: '254 more', ja: 'あと 254 台' },
      ],
      answer: 1,
      explanation: {
        en: 'A /24 has 256 addresses; the first and the last cannot be a machine’s, leaving 254. 250 PCs and the router use 251, so 3 remain. The subnetting practice counts these 254.',
        ja: '/24 のアドレスは 256 個で、最初と最後は機器に使えないので 254 個です。PC 250 台とルータで 251 個使っているので、残りは 3 個です。サブネットの練習で、この 254 を数えます。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    's1-switch-keeps-addresses',
    {
      id: 's1-switch-two-hops',
      prompt: {
        en: 'PC-A’s packet to PC-B crosses two switches in a row. What does the second switch change in it?',
        ja: 'PC-A から PC-B へのパケットが、続けて 2 台のスイッチを通ります。2 台目のスイッチは、その中の何を変えますか？',
      },
      options: [
        { en: 'Both of the MAC addresses', ja: '2 つの MAC アドレス' },
        { en: 'The TTL, down by one', ja: 'TTL を 1 減らす' },
        { en: 'The sender’s IP address', ja: '送り主の IP アドレス' },
        { en: 'Nothing, it passes it on', ja: '何も変えずに渡す' },
      ],
      answer: 3,
      explanation: {
        en: 'A switch passes a frame on as it is: no address and no TTL changes, however many switches there are. Only a router takes one off the TTL and writes new MAC addresses. The course shows a switch changing nothing.',
        ja: 'スイッチはフレームをそのまま渡します。何台通っても、アドレスも TTL も変わりません。TTL を減らし MAC アドレスを書き換えるのはルータだけです。入門コースで、スイッチが何も変えない様子を見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    's1-who-reads-ip',
    {
      id: 's1-who-decides-local',
      prompt: {
        en: 'PC-A (10.0.0.11/24) and PC-B (10.0.0.12/24) share one switch. PC-A sends to 10.0.0.12. Who looks at 10.0.0.12 and decides it can go straight to PC-B?',
        ja: 'PC-A（10.0.0.11/24）と PC-B（10.0.0.12/24）が 1 台のスイッチにつながっています。PC-A が 10.0.0.12 へ送ります。10.0.0.12 を見て「PC-B へ直接届けられる」と決めるのはだれですか？',
      },
      options: [
        { en: 'The switch, by the IP', ja: 'スイッチが IP を見て' },
        { en: 'PC-A, by its own network', ja: 'PC-A が自分の側を見て' },
        { en: 'PC-B, by every packet', ja: 'PC-B が全部のパケットを見て' },
        { en: 'Nobody: no choice is needed', ja: 'だれも。何も決める必要はない' },
      ],
      answer: 1,
      explanation: {
        en: 'The sender compares the destination with its own network: 10.0.0.12 is on 10.0.0.x/24, so it hands the frame straight to PC-B. A switch reads only the MAC address. The course shows the PC making this choice before the router appears.',
        ja: '送り主が、宛先を自分のネットワークと比べます。10.0.0.12 は 10.0.0.x/24 の中なので、そのまま PC-B に渡します。スイッチが見るのは MAC アドレスだけです。入門コースで、ルータが出てくる前に PC がこの判断をする様子を見られます。',
      },
      taughtBy: 'course',
    },
  ],
];

const STAGE_2: readonly (readonly [string, ExamQuestion])[] = [
  [
    's2-arp-broadcast',
    {
      id: 's2-arp-question-ip',
      prompt: {
        en: 'PC-A (10.0.0.11) has never sent to PC-B (10.0.0.12), on its own network. It asks by ARP. Which IP address does the question name?',
        ja: 'PC-A（10.0.0.11）は、同じネットワークの PC-B（10.0.0.12）にまだ送ったことがありません。ARP で尋ねます。質問に書かれる IP アドレスはどれですか？',
      },
      options: [
        { en: '10.0.0.11, its own', ja: '10.0.0.11（自分）' },
        { en: '10.0.0.255, meaning everyone', ja: '10.0.0.255（全員あて）' },
        { en: '10.0.0.12, the one it seeks', ja: '10.0.0.12（探す相手）' },
        { en: '10.0.0.1, the router', ja: '10.0.0.1（ルータ）' },
      ],
      answer: 2,
      explanation: {
        en: 'An ARP question asks “who has 10.0.0.12?”: it names the address it wants the MAC of. It is sent to everyone, but the address inside is the one sought. The ARP lesson’s timeline row reads “who has …”.',
        ja: 'ARP の質問は「10.0.0.12 の持ち主は？」で、MAC を知りたい相手のアドレスを書きます。全員あてに送られますが、中に書くのは探している相手のアドレスです。ARP のレッスンのタイムラインにも「… の持ち主は？」と出ます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-who-answers',
    {
      id: 's2-arp-router-answers',
      prompt: {
        en: 'In the ARP lesson, the Client (10.0.0.10) asks “who has 10.0.0.1?” before its first ping. Which device answers?',
        ja: 'ARP のレッスンで、Client（10.0.0.10）は最初の ping の前に「10.0.0.1 の持ち主は？」と尋ねます。答えるのはどれですか？',
      },
      options: [
        { en: 'The Server, its destination', ja: '行き先の Server' },
        { en: 'Every device that heard it', ja: '聞いた機器のすべて' },
        { en: 'Nobody, it is for all', ja: 'だれも。全員あての質問だから' },
        { en: 'The Router, which has it', ja: 'その住所を持つ Router' },
      ],
      answer: 3,
      explanation: {
        en: '10.0.0.1 is the Router’s address on the Client’s network, so only the Router answers, with its MAC. The Server is on another network and never hears the question. Step to the Router’s answer in the ARP lesson to see it.',
        ja: '10.0.0.1 は Client 側にある Router のアドレスなので、答えるのは Router だけで、自分の MAC を返します。Server は別のネットワークにいて、この質問は届きません。ARP のレッスンで Router の答えまで進めると確かめられます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-reply-unicast',
    {
      id: 's2-arp-reply-to-client',
      prompt: {
        en: 'The Router answers the Client’s ARP question. Which MAC address is the answer sent to?',
        ja: 'Router が Client の ARP の質問に答えます。答えはどの MAC アドレスあてに送られますか？',
      },
      options: [
        { en: 'The Client’s', ja: 'Client の MAC' },
        { en: 'ff:ff:ff:ff:ff:ff', ja: 'ff:ff:ff:ff:ff:ff' },
        { en: 'The Router’s own', ja: 'Router 自身の MAC' },
        { en: 'The Server’s', ja: 'Server の MAC' },
      ],
      answer: 0,
      explanation: {
        en: 'The question carried the Client’s MAC, so the answer goes back to the Client alone; only the question is for everyone. The ARP lesson’s answer row shows it addressed to the asker.',
        ja: '質問には Client の MAC が書かれているので、答えは Client だけに返します。全員あてなのは質問だけです。ARP のレッスンの答えの行で、尋ねた機器あてになっているのが見られます。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-arp-who-asks',
    {
      id: 's2-arp-way-back',
      prompt: {
        en: 'In the ARP lesson the Client pings the Server for the first time. The ping arrives, and the Server replies. Who asks by ARP on the way back?',
        ja: 'ARP のレッスンで、Client が初めて Server に ping を送ります。ping は届き、Server が返事をします。帰り道で ARP を尋ねるのはだれですか？',
      },
      options: [
        { en: 'The Server, for the Router', ja: 'Server が Router を' },
        { en: 'The Router, for the Client', ja: 'Router が Client を' },
        { en: 'Nobody, both know already', ja: 'だれも。もう知っている' },
        { en: 'Both of them, once each', ja: '両方が 1 回ずつ' },
      ],
      answer: 2,
      explanation: {
        en: 'The one asked learns the asker from the question: the Router learned the Client, and the Server learned the Router, on the way out. So the reply needs no question. The ARP lesson’s timeline shows no ARP row after the ping arrives.',
        ja: '尋ねられた側は、質問から尋ねた側を覚えます。行きの間に Router は Client を、Server は Router を覚えたので、返事に質問は要りません。ARP のレッスンのタイムラインでも、ping が届いたあとに ARP の行はありません。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-first-frame-mac',
    {
      id: 's2-first-frame-local',
      prompt: {
        en: 'The Client (10.0.0.10/24) sends to a printer at 10.0.0.20 on its own network and already knows the printer’s MAC. Which destination MAC does the frame carry?',
        ja: 'Client（10.0.0.10/24）が、同じネットワークのプリンター 10.0.0.20 に送ります。プリンターの MAC はもう知っています。フレームの宛先 MAC はどれですか？',
      },
      options: [
        { en: 'The Router’s', ja: 'Router の MAC' },
        { en: 'The printer’s', ja: 'プリンターの MAC' },
        { en: 'ff:ff:ff:ff:ff:ff', ja: 'ff:ff:ff:ff:ff:ff' },
        { en: 'The switch’s', ja: 'スイッチの MAC' },
      ],
      answer: 1,
      explanation: {
        en: 'On its own network the next device is the destination itself, so the frame goes to the printer’s MAC; the Router’s MAC is used only to leave the network. The ARP lesson explains the frame’s two addresses.',
        ja: '同じネットワークでは、次に渡す相手が宛先そのものなので、フレームはプリンターの MAC あてです。Router の MAC を使うのは、ネットワークの外へ出るときだけです。ARP のレッスンで、フレームの 2 つのアドレスを説明しています。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    's2-star-first-send',
    {
      id: 's2-star-second-send',
      prompt: {
        en: 'Four clients and a server hang off one switch. Client-1 has sent to the Server once, and the Server answered. Client-1 sends again. Which devices does this frame reach?',
        ja: '1 台のスイッチに 4 台のクライアントとサーバがつながっています。Client-1 はサーバに 1 度送り、サーバも答えました。Client-1 がもう一度送ります。このフレームはどの機器に届きますか？',
      },
      options: [
        { en: 'Only the Server', ja: 'サーバだけに届く' },
        { en: 'All clients and the Server', ja: '全クライアント' },
        { en: 'The Server and Client-2', ja: 'サーバと C-2' },
        { en: 'None, it is still learning', ja: 'どこにも。まだ学習中' },
      ],
      answer: 0,
      explanation: {
        en: 'The first exchange taught the switch which port the Server is on, so the frame goes down that one cable. Only a destination not yet learned is copied to every port. The star lesson says so in its result.',
        ja: '最初のやり取りで、スイッチはサーバがどのポートにいるかを覚えたので、フレームはその 1 本にだけ流れます。全部のポートに写すのは、まだ覚えていない宛先のときだけです。スター型のレッスンの結果にもそう書かれています。',
      },
      taughtBy: 'star',
    },
  ],
  [
    's2-vlan-same',
    {
      id: 's2-vlan-same-b',
      prompt: {
        en: 'B1 and B2 are both in VLAN 20 on switch SW1. B1 sends to B2. Which way does the frame go?',
        ja: 'B1 と B2 はどちらもスイッチ SW1 の VLAN 20 です。B1 が B2 に送ります。フレームはどこを通りますか？',
      },
      options: [
        { en: 'Through R1 and back', ja: 'R1 を通って戻る' },
        { en: 'Over the trunk, tagged', ja: 'タグ付きでトランクを通る' },
        { en: 'Only through SW1', ja: 'SW1 の中だけ' },
        { en: 'Nowhere, VLANs block it', ja: 'どこも。VLAN が止める' },
      ],
      answer: 2,
      explanation: {
        en: 'Inside one VLAN the switch carries the frame itself; the router is needed only between VLANs. The VLAN lesson’s B1 → B2 button shows it never leaving SW1.',
        ja: '同じ VLAN の中なら、スイッチだけで運びます。ルータが要るのは VLAN の間だけです。VLAN のレッスンの B1 → B2 で、SW1 から出ないことが見られます。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-vlan-trunk-cut',
    {
      id: 's2-vlan-trunk-cut-b',
      prompt: {
        en: 'The trunk between SW1 and R1 is cut. B1 (VLAN 20) sends to A1 (VLAN 10). Where does the frame stop?',
        ja: 'SW1 と R1 の間のトランクが切れています。B1（VLAN 20）が A1（VLAN 10）に送ります。フレームはどこで止まりますか？',
      },
      options: [
        { en: 'At R1, with no route', ja: 'R1 で。経路がない' },
        { en: 'At A1, wrong VLAN', ja: 'A1 で。VLAN が違う' },
        { en: 'It still arrives', ja: '止まらずに届く' },
        { en: 'At SW1, no way out', ja: 'SW1 で。出口がない' },
      ],
      answer: 3,
      explanation: {
        en: 'Between VLANs the only way is through R1, and the trunk to R1 is cut, so SW1 has no port in VLAN 20 to send it out of. The VLAN lesson’s break-the-trunk button shows the drop at SW1.',
        ja: 'VLAN の間を行くには R1 を通るしかなく、R1 へのトランクが切れているので、SW1 には VLAN 20 で送り出せるポートがありません。VLAN のレッスンでトランクを切ると、SW1 で止まる様子が見られます。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-vlan-access-reach',
    {
      id: 's2-vlan-access-a1',
      prompt: {
        en: 'A1 is on an access port of VLAN 10. With no router in use, which machine can A1 reach?',
        ja: 'A1 は VLAN 10 のアクセスポートにつながっています。ルータを使わないとき、A1 が届くのはどれですか？',
      },
      options: [
        { en: 'B1, on the same switch', ja: '同じスイッチにいる B1' },
        { en: 'A2, also VLAN 10', ja: 'VLAN 10 の A2' },
        { en: 'B2, on the same switch', ja: '同じスイッチの B2' },
        { en: 'All three of them', ja: 'ほかの 3 台すべて' },
      ],
      answer: 1,
      explanation: {
        en: 'A VLAN is a network of its own: without a router, A1 reaches only machines in VLAN 10, which is A2. Being on the same switch does not matter. The VLAN lesson defines the access port this way.',
        ja: 'VLAN はそれ自体が 1 つのネットワークです。ルータなしでは、A1 は VLAN 10 の機器、つまり A2 にしか届きません。同じスイッチかどうかは関係ありません。VLAN のレッスンでアクセスポートをこう説明しています。',
      },
      taughtBy: 'vlan',
    },
  ],
  [
    's2-trunk-tag',
    {
      id: 's2-access-untagged',
      prompt: {
        en: 'A frame of VLAN 10 leaves SW1 for A2, which is on an access port of VLAN 10. Does the frame carry a VLAN tag on that cable?',
        ja: 'VLAN 10 のフレームが、SW1 から A2 へ出ていきます。A2 は VLAN 10 のアクセスポートにつながっています。そのケーブルでは、フレームに VLAN タグは付いていますか？',
      },
      options: [
        { en: 'Yes, VLAN 10’s tag', ja: '付いている（VLAN 10）' },
        { en: 'Yes, a tag for each VLAN', ja: 'VLAN ごとに付く' },
        { en: 'Only if A2 asks for it', ja: 'A2 が求めたときだけ' },
        { en: 'No, it leaves untagged', ja: 'タグは付いていない' },
      ],
      answer: 3,
      explanation: {
        en: 'An access port belongs to one VLAN, and the device on it knows nothing of VLANs, so the switch sends frames out of it without a tag. Tags are used only on a trunk. The VLAN lesson defines both kinds of port first.',
        ja: 'アクセスポートは 1 つの VLAN だけに属し、その先の機器は VLAN を知らないので、スイッチはタグを付けずに送ります。タグを使うのはトランクの上だけです。VLAN のレッスンが最初に 2 種類のポートを説明しています。',
      },
      taughtBy: 'vlan',
    },
  ],
];

const STAGE_3: readonly (readonly [string, ExamQuestion])[] = [
  [
    's3-sender-kept',
    {
      id: 's3-destination-kept',
      prompt: {
        en: 'The Client (10.0.0.10) sends to the Server (203.0.113.10) through the router R-1, which does no NAT. Which destination IP does the packet carry on the cable after R-1?',
        ja: 'Client（10.0.0.10）が、NAT をしないルータ R-1 を通して Server（203.0.113.10）に送ります。R-1 の先のケーブルで、パケットの宛先 IP はどれですか？',
      },
      options: [
        { en: 'R-1’s outer, 203.0.113.1', ja: 'R-1 の外側 203.0.113.1' },
        { en: 'The Server’s, 203.0.113.10', ja: '203.0.113.10（Server）' },
        { en: 'The Client’s own, 10.0.0.10', ja: 'Client 自身の 10.0.0.10' },
        { en: 'R-1’s inner, 10.0.0.1', ja: 'R-1 の内側 10.0.0.1' },
      ],
      answer: 1,
      explanation: {
        en: 'A router changes the MAC addresses and the TTL, never the IP addresses (without NAT): the destination stays the Server’s from end to end. The client–server lesson shows the same addresses on every hop.',
        ja: 'ルータが変えるのは MAC アドレスと TTL で、NAT がなければ IP アドレスは変えません。宛先は最初から最後まで Server のままです。クライアント・サーバのレッスンで、どのホップでも同じアドレスなのが見られます。',
      },
      taughtBy: 'client-server',
    },
  ],
  [
    's3-ttl-switches',
    {
      id: 's3-ttl-two-routers',
      prompt: {
        en: 'A packet leaves the Client with TTL 64 and crosses SW-1, R-1, R-2 and SW-2 to reach the Server. What TTL does the Server see?',
        ja: 'パケットは TTL 64 で Client を出て、SW-1、R-1、R-2、SW-2 を通って Server に届きます。Server が受け取るときの TTL はいくつですか？',
      },
      options: [
        { en: '64', ja: '64' },
        { en: '63', ja: '63' },
        { en: '62', ja: '62' },
        { en: '60', ja: '60' },
      ],
      answer: 2,
      explanation: {
        en: 'Only routers take one off the TTL; switches leave it alone. Two routers make 64 − 2 = 62. The client–server lesson’s TTL sentence counts only the routers.',
        ja: 'TTL を 1 減らすのはルータだけで、スイッチは変えません。ルータが 2 台なので 64 − 2 = 62 です。クライアント・サーバのレッスンの TTL の説明も、ルータだけを数えています。',
      },
      taughtBy: 'client-server',
    },
  ],
  [
    's3-lpm-nested',
    {
      id: 's3-lpm-25',
      prompt: {
        en: 'A router has four rows: 0.0.0.0/0 → D, 172.16.0.0/12 → A, 172.16.5.0/24 → B, 172.16.5.128/25 → C. A packet for 172.16.5.200 arrives. Which way does it go?',
        ja: 'ルータに 4 行あります：0.0.0.0/0 → D、172.16.0.0/12 → A、172.16.5.0/24 → B、172.16.5.128/25 → C。172.16.5.200 あてのパケットが来ました。どちらへ送りますか？',
      },
      options: [
        { en: 'A, by the /12', ja: 'A（/12 の行）' },
        { en: 'B, by the /24', ja: 'B（/24 の行）' },
        { en: 'C, by the /25', ja: 'C（/25 の行）' },
        { en: 'D, by the default', ja: 'D（既定の行）' },
      ],
      answer: 2,
      explanation: {
        en: 'All four rows fit 172.16.5.200 (the /25 covers .128 to .255), and the longest match wins: /25. The routing-decision lesson lines up its rows and picks the longest the same way.',
        ja: '4 行すべてが 172.16.5.200 に合います（/25 は .128〜.255）。いちばん長く一致する /25 が選ばれます。経路の選び方のレッスンでも、行を並べて最長一致で選びます。',
      },
      taughtBy: 'routing-decision',
    },
  ],
  [
    's3-no-route',
    {
      id: 's3-no-route-back',
      prompt: {
        en: 'R-2 knows the Server’s network but has no row for the Client’s network, 10.0.0.0/24, and no default route. The Client pings the Server. Where does it stop?',
        ja: 'R-2 は Server のネットワークは知っていますが、Client のネットワーク 10.0.0.0/24 の行も既定の行もありません。Client が Server に ping を送ります。どこで止まりますか？',
      },
      options: [
        { en: 'The request, at R-1', ja: '行きが R-1 で' },
        { en: 'The request, at R-2', ja: '行きが R-2 で' },
        { en: 'Nowhere, it returns', ja: '止まらずに戻る' },
        { en: 'The reply, at R-2', ja: '返事が R-2 で' },
      ],
      answer: 3,
      explanation: {
        en: 'The request needs only a way to the Server, which R-2 has, so it arrives; the reply needs a way back to 10.0.0.0/24, which R-2 lacks, so R-2 drops it. The routing-decision lesson shows a router with no matching row dropping the packet.',
        ja: '行きに要るのは Server への道だけで R-2 は知っているので、届きます。返事には 10.0.0.0/24 への道が要りますが、R-2 にはないので R-2 で捨てられます。経路の選び方のレッスンで、合う行のないルータが捨てる様子が見られます。',
      },
      taughtBy: 'routing-decision',
    },
  ],
  [
    's3-default-route',
    {
      id: 's3-default-only',
      prompt: {
        en: 'R-1’s table has only 10.0.0.0/24 (direct) and 0.0.0.0/0 via 172.16.0.2. A packet for 8.8.8.8 arrives from the Client’s side. What does R-1 do?',
        ja: 'R-1 の表には、10.0.0.0/24（direct）と 0.0.0.0/0（次は 172.16.0.2）しかありません。Client の側から 8.8.8.8 あてのパケットが来ました。R-1 はどうしますか？',
      },
      options: [
        { en: 'Drops it, no row fits', ja: '捨てる。合う行がないから' },
        { en: 'Hands it to 172.16.0.2', ja: '172.16.0.2 に渡す' },
        { en: 'Sends it to 8.8.8.8', ja: '8.8.8.8 あてに直接送る' },
        { en: 'Returns it to the Client', ja: 'Client に送り返す' },
      ],
      answer: 1,
      explanation: {
        en: '0.0.0.0/0 fits every address, so when nothing longer does, the packet goes to its next router, 172.16.0.2. The step-by-step lesson highlights this default row.',
        ja: '0.0.0.0/0 はどのアドレスにも合うので、もっと長い行がなければ、次のルータ 172.16.0.2 に渡します。ステップごとのレッスンで、この既定の行が強調されます。',
      },
      taughtBy: 'step',
    },
  ],
  [
    's3-mac-per-link',
    {
      id: 's3-mac-destination-link',
      prompt: {
        en: 'A packet goes Client → R-1 → R-2 → Server. On the cable from R-1 to R-2, whose MAC is the frame’s destination?',
        ja: 'パケットは Client → R-1 → R-2 → Server と進みます。R-1 から R-2 へのケーブルで、フレームの宛先 MAC はだれのものですか？',
      },
      options: [
        { en: 'The Server’s', ja: 'Server の MAC' },
        { en: 'The Client’s', ja: 'Client の MAC' },
        { en: 'R-2’s own', ja: 'R-2 の MAC' },
        { en: 'R-1’s own', ja: 'R-1 の MAC' },
      ],
      answer: 2,
      explanation: {
        en: 'A frame only crosses one cable, so it is addressed to the next device on it, R-2; R-1 writes a new frame for each link. The trace inspector lesson shows the MAC pair change at every router.',
        ja: 'フレームは 1 本のケーブルしか渡らないので、宛先はその先の機器 R-2 です。R-1 は区間ごとに新しいフレームを書きます。トレースを見るレッスンで、ルータごとに MAC の組が変わる様子が見られます。',
      },
      taughtBy: 'trace',
    },
  ],
  [
    's3-ttl-at-r3',
    {
      id: 's3-ttl-at-r2',
      prompt: {
        en: 'The Client sends with TTL 64 across R-1, R-2 and R-3. In the trace, which TTL does the packet carry as it reaches R-2?',
        ja: 'Client が TTL 64 で送り、R-1、R-2、R-3 を通ります。トレースで、R-2 に着いたときのパケットの TTL はいくつですか？',
      },
      options: [
        { en: '64', ja: '64' },
        { en: '63', ja: '63' },
        { en: '62', ja: '62' },
        { en: '61', ja: '61' },
      ],
      answer: 1,
      explanation: {
        en: 'R-1 took one off before sending it on, so it reaches R-2 with 63; R-2 then takes another. The trace inspector lesson lists the TTL as each router receives it.',
        ja: 'R-1 が送り出す前に 1 減らしたので、R-2 には 63 で着きます。そのあと R-2 がさらに 1 減らします。トレースを見るレッスンで、各ルータが受け取ったときの TTL が並びます。',
      },
      taughtBy: 'trace',
    },
  ],
  [
    's3-who-splits',
    {
      id: 's3-df-set',
      prompt: {
        en: 'Host A sends a 1200-byte ping with the DF bit set. The link after R1 has a smaller MTU than the packet. What happens?',
        ja: 'Host A が DF ビットを立てて 1200 バイトの ping を送ります。R1 の先のリンクの MTU はパケットより小さいです。どうなりますか？',
      },
      options: [
        { en: 'R1 cuts it into pieces', ja: 'R1 が分割する' },
        { en: 'R2 cuts it up instead', ja: '代わりに R2 が分割する' },
        { en: 'It is sent on as it is', ja: 'そのまま送られる' },
        { en: 'R1 drops it, says why', ja: 'R1 が捨てて理由を返す' },
      ],
      answer: 3,
      explanation: {
        en: 'DF means “do not fragment”, so R1 may not cut it: it drops the packet and sends back an ICMP message (type 3, code 4) naming the smaller MTU. The MTU lesson shows this with DF on.',
        ja: 'DF は「分割しないで」という印なので、R1 は分割できません。パケットを捨て、小さい MTU を書いた ICMP（タイプ 3・コード 4）を送り返します。MTU のレッスンで、DF を付けたときの様子が見られます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    's3-who-joins',
    {
      id: 's3-fragments-pass',
      prompt: {
        en: 'The fragments of Host A’s ping reach R2, whose next link takes them as they are. What does R2 do with them?',
        ja: 'Host A の ping の断片が R2 に着きます。R2 の先のリンクは、断片をそのまま通せます。R2 は断片をどうしますか？',
      },
      options: [
        { en: 'Joins them back first', ja: '先に元に戻す' },
        { en: 'Passes each on as it is', ja: '1 つずつそのまま渡す' },
        { en: 'Cuts them smaller again', ja: 'さらに小さく分ける' },
        { en: 'Drops all but the first', ja: '最初の 1 つ以外捨てる' },
      ],
      answer: 1,
      explanation: {
        en: 'Routers on the way only forward fragments; only the destination, Host B, puts them back together. The MTU lesson shows the pieces crossing R2 unchanged.',
        ja: '途中のルータは断片を送るだけで、元に戻すのは宛先の Host B だけです。MTU のレッスンで、断片がそのまま R2 を通る様子が見られます。',
      },
      taughtBy: 'mtu',
    },
  ],
  [
    's3-route-row-direct',
    {
      id: 's3-route-row-via',
      prompt: {
        en: 'R-1’s table marks 203.0.113.0/24 “via 172.16.0.2”. A packet for 203.0.113.10 arrives. Whose MAC does R-1 write as the frame’s destination?',
        ja: 'R-1 の表では、203.0.113.0/24 は「次は 172.16.0.2」です。203.0.113.10 あてのパケットが来ました。R-1 はフレームの宛先にだれの MAC を書きますか？',
      },
      options: [
        { en: 'The Server’s own', ja: 'Server の MAC' },
        { en: 'The next router’s', ja: '次のルータの MAC' },
        { en: 'R-1’s own MAC', ja: 'R-1 自身の MAC' },
        { en: 'ff:ff:ff:ff:ff:ff', ja: 'ff:ff:ff:ff:ff:ff' },
      ],
      answer: 1,
      explanation: {
        en: '“Via” names the next router: the Server is not on R-1’s cable, so the frame goes to the router at 172.16.0.2, which carries it on. Only a direct row sends it to the Server itself. The client–server lesson reads a route row this way.',
        ja: '「次は」は次のルータを表します。Server は R-1 のケーブルの先にいないので、フレームは 172.16.0.2 のルータあてで、そこから先へ運ばれます。Server あてに直接送るのは direct の行のときだけです。クライアント・サーバのレッスンで、経路の行をこう読みます。',
      },
      taughtBy: 'client-server',
    },
  ],
];

const LEVEL_1: readonly (readonly [string, ExamQuestion])[] = [
  [
    'packet-destination',
    {
      id: 'packet-destination-learned',
      prompt: {
        en: 'PC-A (10.0.0.11), PC-B (10.0.0.12) and PC-C (10.0.0.13) share one switch that has already learned all three. PC-A sends a packet to 10.0.0.12. Which machine takes it?',
        ja: 'PC-A（10.0.0.11）、PC-B（10.0.0.12）、PC-C（10.0.0.13）が、3 台とも覚えたスイッチにつながっています。PC-A が 10.0.0.12 あてにパケットを送ります。受け取るのはどれですか？',
      },
      options: [
        { en: 'PC-C, the last one', ja: '最後の PC-C' },
        { en: 'Both PC-B and PC-C', ja: 'PC-B と PC-C' },
        { en: 'PC-B, its owner', ja: '持ち主の PC-B' },
        { en: 'The switch itself', ja: 'スイッチ自身' },
      ],
      answer: 2,
      explanation: {
        en: 'The packet is for the owner of 10.0.0.12, PC-B, and a switch that knows PC-B’s port sends it there only. The course’s third step shows the packet going to PC-B.',
        ja: 'パケットは 10.0.0.12 の持ち主 PC-B あてで、PC-B のポートを覚えたスイッチはそこにだけ送ります。入門コースの 3 番目のステップで、PC-B に届く様子が見られます。',
      },
      taughtBy: 'course',
    },
  ],
  [
    'same-network',
    {
      id: 'same-network-b',
      prompt: {
        en: 'A PC has the address 10.20.30.40/24. Which of these addresses is on the same network as the PC?',
        ja: 'PC のアドレスは 10.20.30.40/24 です。この PC と同じネットワークにあるのはどれですか？',
      },
      options: [
        { en: '10.20.31.40', ja: '10.20.31.40' },
        { en: '10.21.30.40', ja: '10.21.30.40' },
        { en: '20.10.30.40', ja: '20.10.30.40' },
        { en: '10.20.30.4', ja: '10.20.30.4' },
      ],
      answer: 3,
      explanation: {
        en: '/24 keeps the first three numbers for the network, 10.20.30, and only 10.20.30.4 starts with them. The subnetting practice asks exactly this.',
        ja: '/24 は最初の 3 つの数 10.20.30 がネットワークで、それで始まるのは 10.20.30.4 だけです。サブネットの練習で、まさにこれを問います。',
      },
      taughtBy: 'subnetting',
    },
  ],
  [
    'tcp-zero-window',
    {
      id: 'tcp-window-reopens',
      prompt: {
        en: 'A sender has been probing a zero window. The receiver’s app reads 2000 bytes, and its next ACK shows a window of 2000. The sender has 8000 bytes left. What does it do?',
        ja: '送り手はウィンドウ 0 の相手を確かめ続けていました。受け手のアプリが 2000 バイト読み、次の ACK のウィンドウは 2000 です。送り手には 8000 バイト残っています。どうしますか？',
      },
      options: [
        { en: 'Sends all 8000 at once', ja: '8000 を一度に送る' },
        { en: 'Keeps probing only', ja: '確かめ続けるだけ' },
        { en: 'Sends up to 2000 bytes', ja: '2000 までを送る' },
        { en: 'Closes the connection', ja: 'そこで接続を閉じる' },
      ],
      answer: 2,
      explanation: {
        en: 'The window is how much the receiver can take now: 2000 bytes may go, then the sender waits for the window to open again. The TCP flow-control lesson shows the window reopening as the app reads.',
        ja: 'ウィンドウは、受け手がいま受け取れる量です。2000 バイトまで送り、そのあとはまたウィンドウが開くのを待ちます。TCP フロー制御のレッスンで、アプリが読むとウィンドウが開く様子が見られます。',
      },
      taughtBy: 'tcp-flow',
    },
  ],
  [
    'tcp-mss',
    {
      id: 'tcp-mss-server',
      prompt: {
        en: 'In the handshake a client announces MSS 1200 and the server announces MSS 1460. What is the most data the server can put in one segment to the client?',
        ja: 'ハンドシェイクで、クライアントは MSS 1200、サーバは MSS 1460 を知らせます。サーバがクライアントへ送る 1 つのセグメントに入れられるデータは最大いくつですか？',
      },
      options: [
        { en: '1460 bytes', ja: '1460 バイト' },
        { en: '1200 bytes', ja: '1200 バイト' },
        { en: '2660 bytes', ja: '2660 バイト' },
        { en: '1000 bytes', ja: '1000 バイト' },
      ],
      answer: 1,
      explanation: {
        en: 'An MSS is what its sender can receive, so the server sends at most what the client announced, 1200 bytes. The TCP flow-control lesson shows each side using the other’s MSS.',
        ja: 'MSS は、知らせた側が受け取れる大きさです。サーバはクライアントが知らせた 1200 バイトまでしか入れられません。TCP フロー制御のレッスンで、それぞれ相手の MSS を使う様子が見られます。',
      },
      taughtBy: 'tcp-flow',
    },
  ],
  [
    'first-packet',
    {
      id: 'first-packet-again',
      prompt: {
        en: 'PC-A sent to 10.0.0.12, on its own network, a minute ago, and asked by ARP then. It sends to 10.0.0.12 again. What does it do first?',
        ja: 'PC-A は 1 分前、同じネットワークの 10.0.0.12 に送り、そのとき ARP で尋ねました。もう一度 10.0.0.12 に送ります。最初に何をしますか？',
      },
      options: [
        { en: 'Asks by ARP', ja: 'もう一度 ARP で尋ねる' },
        { en: 'Sends at once', ja: '覚えた MAC で送る' },
        { en: 'Asks the router', ja: '先にルータに聞く' },
        { en: 'Waits for it', ja: '10.0.0.12 を待つ' },
      ],
      answer: 1,
      explanation: {
        en: 'A device keeps an ARP answer and uses it for the next send, so it sends straight away; only its first send to an address asks. The ARP lesson’s note says how long a real device keeps it.',
        ja: '機器は ARP の答えを覚えて次の送信に使うので、すぐに送ります。尋ねるのは、そのアドレスへの最初の送信だけです。ARP のレッスンの注に、本物の機器が覚えておく時間が書かれています。',
      },
      taughtBy: 'arp',
    },
  ],
  [
    'dns-second-lookup',
    {
      id: 'dns-first-lookup',
      prompt: {
        en: 'The office DNS server has never looked up www.example.org. Your laptop asks it for that name. Whom does the office server ask first?',
        ja: '事務所の DNS サーバは、www.example.org を一度も調べたことがありません。ノートパソコンがこの名前を尋ねます。事務所のサーバが最初に尋ねる相手はだれですか？',
      },
      options: [
        { en: 'The .org servers', ja: '.org のサーバ' },
        { en: 'A root server', ja: 'いちばん上のルートサーバ' },
        { en: 'example.org’s server', ja: 'example.org のサーバ' },
        { en: 'Your laptop again', ja: 'ノートパソコン自身' },
      ],
      answer: 1,
      explanation: {
        en: 'With nothing kept, the search starts from the top: a root server names the .org servers, they name example.org’s, and that one answers. The DNS resolution lesson walks these steps.',
        ja: '何も覚えていなければ、上から順に調べます。ルートサーバが .org のサーバを教え、.org のサーバが example.org のサーバを教え、そこが答えます。DNS の名前解決のレッスンで、この順をたどります。',
      },
      taughtBy: 'dns-resolution',
    },
  ],
  [
    'tcp-next',
    {
      id: 'tcp-first-segment',
      prompt: {
        en: 'A browser opens a TCP connection to a web server. Which segment does the browser send first?',
        ja: 'ブラウザが Web サーバへの TCP 接続を開きます。ブラウザが最初に送るセグメントはどれですか？',
      },
      options: [
        { en: 'A SYN, to connect', ja: 'SYN（接続したい）' },
        { en: 'A SYN-ACK, to accept', ja: 'SYN-ACK（受け入れる）' },
        { en: 'An ACK, to confirm', ja: 'ACK（確認する）' },
        { en: 'The data, at once', ja: 'データをすぐに' },
      ],
      answer: 0,
      explanation: {
        en: 'The one opening a connection starts with SYN; the server answers SYN-ACK and the browser ACK, and only then is data sent. The TCP handshake lesson steps through the three.',
        ja: '接続を開く側は SYN から始めます。サーバが SYN-ACK、ブラウザが ACK を返し、それからデータを送ります。TCP ハンドシェイクのレッスンで、この 3 つを順に見られます。',
      },
      taughtBy: 'tcp',
    },
  ],
  [
    'udp-lost',
    {
      id: 'udp-middle-lost',
      prompt: {
        en: 'An app sends three messages to a server with UDP. The second is lost on the way. What does the server receive?',
        ja: 'アプリが UDP でサーバに 3 つのメッセージを送ります。2 つ目が途中で失われました。サーバは何を受け取りますか？',
      },
      options: [
        { en: 'All three, the second resent', ja: '3 つとも（再送）' },
        { en: 'The first and the third', ja: '1 つ目と 3 つ目' },
        { en: 'Nothing until all three', ja: '3 つそろうまで何も' },
        { en: 'The first only', ja: '1 つ目だけ届く' },
      ],
      answer: 1,
      explanation: {
        en: 'UDP sends each message on its own and never resends one, so the others still arrive and the lost one is simply missing. The UDP lesson contrasts this with TCP.',
        ja: 'UDP はメッセージを 1 つずつ送り、再送はしません。ほかは届き、失われたものはそのまま欠けます。UDP のレッスンで、TCP との違いを示しています。',
      },
      taughtBy: 'udp',
    },
  ],
  [
    'name-fails',
    {
      id: 'name-server-missing',
      prompt: {
        en: 'A laptop’s DNS server is set to an address where no server is running. You type www.example.com. What happens?',
        ja: 'ノートパソコンの DNS サーバの設定が、サーバの動いていないアドレスになっています。www.example.com と入力します。どうなりますか？',
      },
      options: [
        { en: 'The page opens slowly', ja: 'ページがゆっくり開く' },
        { en: 'The router finds the name', ja: 'ルータが名前を調べる' },
        { en: 'The name is not found', ja: '名前が調べられない' },
        { en: 'Only the IP address fails', ja: 'IP アドレスでは開かない' },
      ],
      answer: 2,
      explanation: {
        en: 'Without an answering DNS server the name cannot be turned into an address, so the page does not open; typing the server’s IP address still works. The DHCP and DNS lesson shows the lookup a name needs.',
        ja: 'DNS サーバが答えなければ、名前をアドレスに変えられず、ページは開きません。サーバの IP アドレスを入力すれば開きます。DHCP と DNS のレッスンで、名前に必要な問い合わせが見られます。',
      },
      taughtBy: 'dns',
    },
  ],
  [
    'nat-sender',
    {
      id: 'nat-reply-to',
      prompt: {
        en: 'A phone (192.168.1.10) at home opens a website through the router, whose global address is 203.0.113.1. To which address does the website send its reply?',
        ja: '家のスマートフォン（192.168.1.10）が、グローバルアドレス 203.0.113.1 のルータを通して Web サイトを開きます。Web サイトは返事をどのアドレスに送りますか？',
      },
      options: [
        { en: '192.168.1.10, the phone', ja: 'スマホの 192.168.1.10' },
        { en: '203.0.113.1, the router', ja: 'ルータの 203.0.113.1' },
        { en: '192.168.1.1, the router', ja: 'ルータの 192.168.1.1' },
        { en: 'Its own, then forwarded', ja: '自分あてに送って転送' },
      ],
      answer: 1,
      explanation: {
        en: 'The website saw the request come from 203.0.113.1, so it replies there; the router then puts the phone’s address back by its table. The NAT lesson’s reply button shows this.',
        ja: 'Web サイトには要求が 203.0.113.1 から来たように見えるので、そこへ返します。ルータが表を見て、スマホのアドレスに戻します。NAT のレッスンの返事のボタンで確かめられます。',
      },
      taughtBy: 'nat',
    },
  ],
];

/** The pool partner of each slot's original question, by its id. */
export const POOL_A: ReadonlyMap<string, ExamQuestion> = new Map([
  ...STAGE_1,
  ...STAGE_2,
  ...STAGE_3,
  ...LEVEL_1,
]);
