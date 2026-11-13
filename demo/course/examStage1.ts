import { COURSE_PATH, lessonPath } from '../lessonManifest';
import type { ExamLevel } from './examQuestions';

/**
 * The test of stage 1 (準備): addresses, the parts of a small network, and the
 * "/number". Every answer is what the course or the subnetting practice shows
 * when run, and what a real network does.
 */
export const EXAM_STAGE_1: ExamLevel = {
  level: 5,
  title: { en: 'Stage 1 · Getting ready', ja: '段階 1・準備' },
  summary: {
    en: 'Addresses, the parts of a small network, and how to read a "/number".',
    ja: 'アドレス、小さなネットワークの部品、「/数字」の読み方。',
  },
  path: [
    {
      id: 'course',
      path: COURSE_PATH,
      title: { en: 'Getting started (6 steps)', ja: '入門コース（6 ステップ）' },
      teaches: {
        en: 'Machines, a switch and a router, one step at a time',
        ja: '機器、スイッチ、ルータを 1 つずつ',
      },
    },
    {
      id: 'subnetting',
      path: lessonPath('/learning/subnetting'),
      title: { en: 'Subnetting practice', ja: 'サブネットの練習' },
      teaches: {
        en: 'Which addresses share a network, and how many fit',
        ja: 'どのアドレスが同じネットワークか、何台入るか',
      },
    },
  ],
  questions: [
    {
      id: 's1-hops',
      prompt: {
        en: 'PC-A sends to PC-D. On the way the packet passes Switch-1, the router and Switch-2. How many hops does it take?',
        ja: 'PC-A から PC-D へ送ります。途中で Switch-1、ルータ、Switch-2 を通ります。何ホップかかりますか？',
      },
      options: [
        { en: '3, one for each device between', ja: '3。間の機器 1 台ごとに 1' },
        { en: '1, the router crossed', ja: '1。越えたルータの分' },
        { en: '4, one for each cable', ja: '4。ケーブル 1 本ごとに 1' },
        { en: '2, one for each network', ja: '2。ネットワークごとに 1' },
      ],
      answer: 1,
      explanation: {
        en: 'A hop is one router crossed: each router forwards the packet and takes one off its TTL, while switches only pass it on (RFC 791, RFC 1812 §5.3.1). PC-A to PC-D crosses one router, so 1 hop. The course counts it this way at its fifth step.',
        ja: 'ホップは「越えたルータ 1 台」です。ルータは転送するたびに TTL を 1 減らし、スイッチはそのまま渡すだけです（RFC 791、RFC 1812 §5.3.1）。PC-A から PC-D までに越えるルータは 1 台なので 1 ホップです。入門コースの 5 番目のステップでも、こう数えます。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-same-16',
      prompt: {
        en: 'A PC is 172.16.0.5/16. Which of these machines is on the same network as the PC?',
        ja: 'PC のアドレスは 172.16.0.5/16 です。この PC と同じネットワークにいるのはどれですか？',
      },
      options: [
        { en: '172.17.0.5', ja: '172.17.0.5' },
        { en: '172.16.200.9', ja: '172.16.200.9' },
        { en: '10.16.0.5', ja: '10.16.0.5' },
        { en: '192.172.16.5', ja: '192.172.16.5' },
      ],
      answer: 1,
      explanation: {
        en: '/16 means the first two numbers name the network: 172.16. Only 172.16.200.9 starts with 172.16. The third and fourth numbers differ, but under /16 they name machines, not networks — the subnetting practice compares exactly this pair.',
        ja: '/16 は「最初の 2 つの数がネットワーク」という意味で、ここでは 172.16 です。172.16 で始まるのは 172.16.200.9 だけです。3 つ目と 4 つ目の数は違いますが、/16 ではそこは機器の番号です。サブネットの練習で、この 2 つをそのまま比べます。',
      },
      taughtBy: 'subnetting',
    },
    {
      id: 's1-mask-24',
      prompt: {
        en: 'A PC’s settings show the mask 255.255.255.0. Written as a "/number" after the address, which is it?',
        ja: 'PC の設定にマスク 255.255.255.0 とあります。アドレスの後ろに付ける「/数字」で書くとどれですか？',
      },
      options: [
        { en: '/255', ja: '/255' },
        { en: '/3', ja: '/3' },
        { en: '/0', ja: '/0' },
        { en: '/24', ja: '/24' },
      ],
      answer: 3,
      explanation: {
        en: 'Each 255 marks one of the four numbers as part of the network, so three of them mean the first three numbers are the network — which is what /24 says. The course notes at its first step that 255.255.255.0 and /24 are the same split.',
        ja: '255 は「この数はネットワークの部分」という印で、それが 3 つあるので、最初の 3 つの数がネットワークです。/24 も同じ区切りを表します。入門コースの最初のステップの補足に、255.255.255.0 と /24 は同じだとあります。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-copy-discard',
      prompt: {
        en: 'PC-A, PC-B and PC-C share a switch that has just started. PC-A sends its first packet to PC-B, asking by ARP first. What does PC-C receive?',
        ja: 'PC-A、PC-B、PC-C が、動き始めたばかりのスイッチにつながっています。PC-A は ARP で尋ねてから、PC-B へ最初のパケットを送ります。PC-C に届くのはどれですか？',
      },
      options: [
        { en: 'Only the ARP question', ja: 'ARP の質問だけ' },
        { en: 'The question and the packet', ja: '質問とパケットの両方' },
        { en: 'Only the packet', ja: 'パケットだけ' },
        { en: 'Nothing at all', ja: '何も届かない' },
      ],
      answer: 0,
      explanation: {
        en: 'The ARP question is a broadcast, so the switch copies it to every port and PC-C sees it is not for it. PC-B’s answer teaches the switch PC-B’s port, so the packet then goes to PC-B only (IEEE 802.1D learning). The course’s third step shows this.',
        ja: 'ARP の質問は全員あてなので、スイッチは全部のポートに写し、PC-C は自分あてではないと見て捨てます。PC-B の答えでスイッチは PC-B のポートを覚えるので、そのあとのパケットは PC-B にだけ届きます（IEEE 802.1D の学習）。入門コースの 3 番目のステップで見られます。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-gateway-value',
      prompt: {
        en: 'PC-A is 10.0.0.11/24. The router between the networks has 10.0.0.1 on PC-A’s side and 192.168.1.1 on the other. What goes in PC-A’s "default gateway" box?',
        ja: 'PC-A は 10.0.0.11/24 です。2 つのネットワークの間のルータは、PC-A 側に 10.0.0.1、反対側に 192.168.1.1 を持っています。PC-A の「デフォルトゲートウェイ」の欄には何を入れますか？',
      },
      options: [
        { en: '192.168.1.1, the router’s far side', ja: '192.168.1.1（反対側）' },
        { en: '10.0.0.11, PC-A’s own address', ja: '10.0.0.11（自分の住所）' },
        { en: '10.0.0.1, the router on its side', ja: '10.0.0.1（自分の側のルータ）' },
        { en: '10.0.0.0, the network itself', ja: '10.0.0.0（自分のネットワーク）' },
      ],
      answer: 2,
      explanation: {
        en: 'The default gateway is the way out, and PC-A can only hand a packet to an address on its own network: the router’s 10.0.0.1. The router then puts the packet onto 192.168.1.x itself. The course’s fifth step names 10.0.0.1 as the box’s value.',
        ja: 'デフォルトゲートウェイは外への出口で、PC-A がパケットを渡せるのは自分のネットワークにある住所だけです。だからルータの 10.0.0.1 です。192.168.1.x 側へ出すのはルータの仕事です。入門コースの 5 番目のステップで、この欄に入るのは 10.0.0.1 だと示されます。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-two-switches',
      prompt: {
        en: 'PC-A (10.0.0.11/24) is on Switch-1; PC-D (192.168.1.11/24) is on Switch-2. Someone plugs a cable between the two switches. Can PC-A now reach PC-D?',
        ja: 'PC-A（10.0.0.11/24）は Switch-1 に、PC-D（192.168.1.11/24）は Switch-2 につながっています。だれかが 2 台のスイッチをケーブルでつなぎました。これで PC-A から PC-D へ届きますか？',
      },
      options: [
        { en: 'Yes, a cable now joins them', ja: '届く。ケーブルでつながったから' },
        { en: 'No, it still needs a router', ja: '届かない。まだルータが要る' },
        { en: 'Yes, but only the first packet', ja: '届く。ただし最初の 1 つだけ' },
        { en: 'No, a switch blocks every address', ja: '届かない。スイッチが全住所を止める' },
      ],
      answer: 1,
      explanation: {
        en: 'PC-A compares the addresses, sees 192.168.1.11 is on another network, and so must hand the packet to a way out — a router. Switches, however they are cabled, only pass packets along inside one network. The course’s fourth step makes the same point with two switches and no router.',
        ja: 'PC-A は住所を比べて、192.168.1.11 が別のネットワークだと分かるので、外への出口（ルータ）に渡す必要があります。スイッチは、どうつないでも 1 つのネットワークの中で渡すだけです。入門コースの 4 番目のステップが、ルータのない 2 台のスイッチで同じことを示します。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-usable-address',
      prompt: {
        en: 'A new PC joins the network 192.168.1.0/24. Which address can it be given?',
        ja: '新しい PC をネットワーク 192.168.1.0/24 に入れます。PC に付けられるアドレスはどれですか？',
      },
      options: [
        { en: '192.168.1.0', ja: '192.168.1.0' },
        { en: '192.168.1.255', ja: '192.168.1.255' },
        { en: '192.168.1.256', ja: '192.168.1.256' },
        { en: '192.168.1.77', ja: '192.168.1.77' },
      ],
      answer: 3,
      explanation: {
        en: 'In a /24 the last number runs 0 to 255. 0 names the network itself and 255 is the broadcast address to everyone on it, so neither can be a machine’s; 256 does not exist. 192.168.1.77 is free for a PC. The subnetting practice asks for the network and broadcast addresses of a range.',
        ja: '/24 では最後の数は 0〜255 です。0 はネットワークそのもの、255 は全員あてのブロードキャストの住所なので、どちらも機器には付けられません。256 はありません。PC に付けられるのは 192.168.1.77 です。サブネットの練習で、範囲のネットワークアドレスとブロードキャストアドレスを答えます。',
      },
      taughtBy: 'subnetting',
    },
    {
      id: 's1-host-count',
      prompt: {
        en: 'An office needs 300 PCs on one network. Is a single /24 network enough?',
        ja: 'ある事務所で、1 つのネットワークに PC を 300 台つなぎたいとします。/24 のネットワーク 1 つで足りますか？',
      },
      options: [
        { en: 'Yes, a /24 holds 300 machines', ja: '足りる。/24 には 300 台入る' },
        { en: 'Yes, any network holds as many as needed', ja: '足りる。台数に上限はない' },
        { en: 'No, a /24 holds 254 machines at most', ja: '足りない。/24 は最大 254 台' },
        { en: 'No, a /24 holds 24 machines', ja: '足りない。/24 は 24 台まで' },
      ],
      answer: 2,
      explanation: {
        en: 'A /24 leaves one number, 0 to 255, for the machines: 256 values, less the network address and the broadcast address, is 254. 300 PCs need a bigger network, such as a /23. The subnetting practice asks how many hosts fit.',
        ja: '/24 で機器に使えるのは最後の 1 つの数（0〜255）で、256 通りからネットワークアドレスとブロードキャストアドレスを除いて 254 台です。300 台には /23 のような、もっと大きいネットワークが要ります。サブネットの練習で「何台入るか」を答えます。',
      },
      taughtBy: 'subnetting',
    },
    {
      id: 's1-switch-keeps-addresses',
      prompt: {
        en: 'PC-A (10.0.0.11) sends to PC-B (10.0.0.12) through a switch. Which sender address is written in the packet when it reaches PC-B?',
        ja: 'PC-A（10.0.0.11）から PC-B（10.0.0.12）へ、スイッチを通して送ります。PC-B に届いたとき、パケットに書かれている送り主の住所はどれですか？',
      },
      options: [
        { en: '10.0.0.11, PC-A’s own', ja: '10.0.0.11（PC-A のもの）' },
        { en: 'The switch’s address', ja: 'スイッチに付いた住所' },
        { en: '10.0.0.12, PC-B’s own', ja: '10.0.0.12（PC-B のもの）' },
        { en: 'No sender is written', ja: '送り主は書かれていない' },
      ],
      answer: 0,
      explanation: {
        en: 'A switch passes a packet on without changing what is written in it, so the sender and destination IP addresses stay exactly as PC-A wrote them. The course’s second step shows the same packet arriving through the switch unchanged.',
        ja: 'スイッチは中身を書き換えずに渡すので、送り主と宛先の IP アドレスは PC-A が書いたままです。入門コースの 2 番目のステップで、スイッチを通っても同じパケットが変わらずに届くのが見られます。',
      },
      taughtBy: 'course',
    },
    {
      id: 's1-who-reads-ip',
      prompt: {
        en: 'A packet for 192.168.1.11 leaves PC-A’s network. Which device reads that IP address to choose which side to send it out of?',
        ja: '192.168.1.11 あてのパケットが PC-A のネットワークを出ます。その IP アドレスを読んで、どちら側へ送るかを決めるのはどの機器ですか？',
      },
      options: [
        { en: 'The switch next to PC-A', ja: 'PC-A のとなりのスイッチ' },
        { en: 'The cable between the devices', ja: '間をつなぐケーブル' },
        { en: 'PC-D, the destination', ja: '宛先にいる PC-D' },
        { en: 'The router, with its table', ja: 'ルータが、自分の表を見て' },
      ],
      answer: 3,
      explanation: {
        en: 'The router looks the destination up in its routing table: 192.168.1.11 is in 192.168.1.0/24, so it goes out of the right side. A switch only passes packets along inside one network. The course’s last step marks the row the router used.',
        ja: 'ルータが宛先をルーティングテーブルで調べます。192.168.1.11 は 192.168.1.0/24 に入るので、右側から出します。スイッチは 1 つのネットワークの中で渡すだけです。入門コースの最後のステップで、ルータが使った行に印が付きます。',
      },
      taughtBy: 'course',
    },
  ],
};
