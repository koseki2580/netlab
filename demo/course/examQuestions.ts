/**
 * The final test of the beginner path: ten questions, one concept each, and
 * the lessons that teach them in the order a beginner should take them.
 *
 * Every question names the lesson that teaches its answer, so a learner who
 * misses one is sent back to the place that explains it rather than told a
 * letter. Each question also offers "I have not learned this", which is how a
 * learner — or anyone checking whether the lessons teach — answers honestly
 * instead of guessing.
 */

export type ExamLocale = 'en' | 'ja';

export interface Localised {
  readonly en: string;
  readonly ja: string;
}

/** One stop on the path the test covers, in the order to take it. */
export interface PathStop {
  readonly id: string;
  readonly path: string;
  readonly title: Localised;
  /**
   * The topic, in one line — never the answer. Learners in trials passed
   * questions from these lines alone, which measured the index, not the lessons.
   */
  readonly teaches: Localised;
}

export interface ExamQuestion {
  readonly id: string;
  readonly prompt: Localised;
  /** Four answers; the fifth, "not learned", is added by the page. */
  readonly options: readonly [Localised, Localised, Localised, Localised];
  /** Index into `options` of the right answer. */
  readonly answer: 0 | 1 | 2 | 3;
  /** Why the right answer is right, shown after marking. */
  readonly explanation: Localised;
  /** The `PathStop` id whose lesson teaches this. */
  readonly taughtBy: string;
}

export const EXAM_PATH: readonly PathStop[] = [
  {
    id: 'course',
    path: '/course',
    title: { en: 'Getting started (6 steps)', ja: '入門コース（6 ステップ）' },
    teaches: {
      en: 'The pieces of a network and how they connect',
      ja: 'ネットワークの部品と、そのつながり方',
    },
  },
  {
    id: 'subnetting',
    path: '/learning/subnetting',
    title: { en: 'Subnetting drill', ja: 'サブネットの練習' },
    teaches: {
      en: 'Reading an address and its /number',
      ja: 'アドレスと「/数字」の読み方',
    },
  },
  {
    id: 'arp',
    path: '/networking/arp',
    title: { en: 'ARP basics', ja: 'ARP の基本' },
    teaches: {
      en: 'What happens before the first packet leaves',
      ja: '最初のパケットが出ていく前に起きること',
    },
  },
  {
    id: 'routing',
    path: '/routing/client-server',
    title: { en: 'Client and server', ja: 'クライアントとサーバ' },
    teaches: {
      en: 'Crossing from one network to another',
      ja: 'ネットワークからネットワークへ渡るとき',
    },
  },
  {
    id: 'tcp',
    path: '/simulation/tcp-handshake',
    title: { en: 'TCP handshake', ja: 'TCP のハンドシェイク' },
    teaches: {
      en: 'How TCP starts a conversation',
      ja: 'TCP の会話の始め方',
    },
  },
  {
    id: 'udp',
    path: '/networking/udp',
    title: { en: 'UDP datagram', ja: 'UDP のデータグラム' },
    teaches: {
      en: 'How UDP differs from TCP',
      ja: 'UDP と TCP の違い',
    },
  },
  {
    id: 'dns',
    path: '/services/dhcp-dns',
    title: { en: 'DHCP and DNS', ja: 'DHCP と DNS' },
    teaches: {
      en: 'Two services every device relies on',
      ja: 'どの機器も頼っている 2 つのサービス',
    },
  },
  {
    id: 'nat',
    path: '/simulation/nat',
    title: { en: 'NAT / PAT', ja: 'NAT / PAT' },
    teaches: {
      en: 'What the edge router does to addresses',
      ja: '出口のルータがアドレスにすること',
    },
  },
];

/**
 * Each question puts its idea into a small situation, so it is answered by
 * using the idea rather than by recognising a sentence from a lesson. The four
 * options are of similar length, the right one is never the longest, and every
 * wrong one is a mistake beginners were seen to make (DNS taken for DHCP, a
 * switch taken for a router, "UDP has a handshake too"). The page shows the
 * options in a new order on every attempt.
 */
export const EXAM_QUESTIONS: readonly ExamQuestion[] = [
  {
    id: 'packet-destination',
    prompt: {
      en: 'PC-A (10.0.0.11), PC-B (10.0.0.12) and PC-C (10.0.0.13) share one switch. PC-A sends a packet with 10.0.0.13 written on it as the destination. Which machine is it for?',
      ja: 'PC-A（10.0.0.11）、PC-B（10.0.0.12）、PC-C（10.0.0.13）が 1 台のスイッチにつながっています。PC-A が、宛先に 10.0.0.13 と書いたパケットを送りました。これはどの機器あてですか？',
    },
    options: [
      {
        en: 'All three, since each starts with 10.0.0',
        ja: 'どれも 10.0.0 で始まるので 3 台とも',
      },
      { en: 'Only PC-C, the one with that address', ja: 'そのアドレスを持つ PC-C だけ' },
      {
        en: 'Nobody, since no name is written on it',
        ja: '名前が書いていないので、だれでもない',
      },
      {
        en: 'The switch, since it sits in the middle',
        ja: '途中にあるスイッチが受け取って終わり',
      },
    ],
    answer: 1,
    explanation: {
      en: 'It is for PC-C only. An IP address is one machine’s address, and a packet goes to the address written on it, the way a letter does. 10.0.0 is the part the three share (their network); the last number, 13, picks out PC-C. See step 1 of Getting started.',
      ja: 'PC-C だけに届きます。IP アドレスは機器ごとの住所で、パケットは手紙のように、書かれた住所あてに届きます。10.0.0 は 3 台に共通の部分（ネットワーク）で、最後の 13 が PC-C を指します。入門コースのステップ 1 で見られます。',
    },
    taughtBy: 'course',
  },
  {
    id: 'same-network',
    prompt: {
      en: 'A PC has the address 192.168.1.10/24. Which of these addresses is on the same network as the PC?',
      ja: 'ある PC のアドレスは 192.168.1.10/24 です。この PC と同じネットワークにいるのは、次のどのアドレスですか？',
    },
    options: [
      { en: '192.168.2.10', ja: '192.168.2.10' },
      { en: '192.168.10.10', ja: '192.168.10.10' },
      { en: '192.168.1.200', ja: '192.168.1.200' },
      { en: '192.169.1.200', ja: '192.169.1.200' },
    ],
    answer: 2,
    explanation: {
      en: 'Only 192.168.1.200 is on the same network. /24 means the first three numbers name the network and the last number names the machine. The PC’s network is 192.168.1, and every other choice differs somewhere in its first three numbers. See the Subnetting drill.',
      ja: '同じネットワークにいるのは 192.168.1.200 だけです。/24 は「最初の 3 つの数がネットワーク、最後の数が機器」という意味です。この PC のネットワークは 192.168.1 で、ほかの選択肢は最初の 3 つの数のどこかが違います。レッスン「サブネットの練習」で確かめられます。',
    },
    taughtBy: 'subnetting',
  },
  {
    id: 'switch-delivery',
    prompt: {
      en: 'PC-A, PC-B and PC-C are plugged into one switch. The switch has already learned which socket (port) each PC is on. PC-A sends to PC-B. Where does the switch send it?',
      ja: 'PC-A、PC-B、PC-C が 1 台のスイッチにつながっています。スイッチは、どの差し込み口（ポート）の先にどの PC がいるかをもう覚えています。PC-A が PC-B あてに送ると、スイッチはどこへ流しますか？',
    },
    options: [
      { en: 'Only down the cable that leads to PC-B', ja: 'PC-B につながるケーブルにだけ流す' },
      {
        en: 'Down the cables to both PC-B and PC-C',
        ja: 'PC-B と PC-C の両方のケーブルに流す',
      },
      { en: 'Back to PC-A, to confirm it was sent', ja: '確認のため、PC-A に送り返す' },
      {
        en: 'Nowhere, as only a router can pass it on',
        ja: 'ルータがないので、どこにも流さない',
      },
    ],
    answer: 0,
    explanation: {
      en: 'It goes to PC-B only. A switch remembers which machine is on which socket, so it sends down one cable instead of all of them. No router is needed: the three are on one network. See step 3 of Getting started.',
      ja: 'PC-B にだけ届きます。スイッチは、どの差し込み口の先にどの機器がいるかを覚えているので、全部に配らず 1 本のケーブルにだけ流します。3 台は同じネットワークなので、ルータは要りません。入門コースのステップ 3 で見られます。',
    },
    taughtBy: 'course',
  },
  {
    id: 'join-networks',
    prompt: {
      en: 'An office has two groups of PCs. One group uses 10.0.0.x/24 on its own switch; the other uses 192.168.1.x/24 on another switch. The two groups cannot reach each other. What makes it work?',
      ja: '会社に PC のグループが 2 つあります。一方は 10.0.0.x/24 で 1 台目のスイッチに、もう一方は 192.168.1.x/24 で 2 台目のスイッチにつながっています。グループどうしは通信できません。どうすれば届くようになりますか？',
    },
    options: [
      { en: 'Join the two switches with one cable', ja: '2 台のスイッチをケーブルで直接つなぐ' },
      { en: 'Move every PC onto one larger switch', ja: '全部の PC を大きなスイッチ 1 台につなぐ' },
      { en: 'Put a third switch between the two', ja: '2 台の間に 3 台目のスイッチを置く' },
      { en: 'Put a router between the switches', ja: '2 台のスイッチの間にルータを置く' },
    ],
    answer: 3,
    explanation: {
      en: 'A router is needed. 10.0.0 and 192.168.1 are different networks, and a switch only carries things inside one network, however many switches or cables are added. A router has an address on each network and passes packets across. See steps 4 and 5 of Getting started.',
      ja: 'ルータが必要です。10.0.0 と 192.168.1 は別のネットワークで、スイッチは 1 つのネットワークの中でしか運べません。スイッチやケーブルを増やしても同じです。ルータは両方のネットワークにアドレスを持ち、その間でパケットを渡します。入門コースのステップ 4 と 5 で見られます。',
    },
    taughtBy: 'course',
  },
  {
    id: 'first-packet',
    prompt: {
      en: 'PC-A is about to send its first packet to 10.0.0.12, a machine on its own network. It already knows that IP address. What does it still need, and how does it get it?',
      ja: 'PC-A が、同じネットワークにいる 10.0.0.12 へ最初のパケットを送ろうとしています。相手の IP アドレスは分かっています。まだ足りないものは何で、どうやって手に入れますか？',
    },
    options: [
      {
        en: 'The MAC address of 10.0.0.12; it asks with ARP',
        ja: '相手の MAC アドレス。ARP で尋ねる',
      },
      {
        en: 'The name of the 10.0.0.12 machine; it asks with DNS',
        ja: '相手の機器に付いた名前。DNS で尋ねる',
      },
      {
        en: 'An IP address of its own; it asks with DHCP',
        ja: '自分が使う IP アドレス。DHCP で借りる',
      },
      {
        en: 'A global address to share; it asks with NAT',
        ja: '外で使うグローバルアドレス。NAT でもらう',
      },
    ],
    answer: 0,
    explanation: {
      en: 'It needs the other machine’s MAC address. An IP address says where the packet is finally going; a MAC address says which machine takes it on this stretch of cable. ARP asks everyone on the network who has that IP address, and the owner answers with its MAC address. See ARP basics.',
      ja: '足りないのは相手の MAC アドレスです。IP アドレスは最終的な行き先、MAC アドレスは「このケーブルの区間で受け取る機器」の番号です。ARP は同じネットワークの全員に「この IP アドレスの持ち主は？」と尋ね、持ち主が MAC アドレスを答えます。レッスン「ARP の基本」で見られます。',
    },
    taughtBy: 'arp',
  },
  {
    id: 'route-table',
    prompt: {
      en: 'A router’s table has two rows. Row 1: addresses in 10.0.0.0/24 go out of the left side. Row 2: addresses in 192.168.1.0/24 go out of the right side. A packet for 192.168.1.50 arrives. What does the router do?',
      ja: 'ルータの経路表に 2 行あります。1 行目：10.0.0.0/24 あては左側へ。2 行目：192.168.1.0/24 あては右側へ。そこへ 192.168.1.50 あてのパケットが届きました。ルータはどうしますか？',
    },
    options: [
      { en: 'Sends it out of the left side only', ja: '左側だけに送り出す' },
      { en: 'Sends it out of the right side only', ja: '右側だけに送り出す' },
      { en: 'Sends it out of both sides, to be safe', ja: '念のため両側に送り出す' },
      { en: 'Drops it, as no row says 192.168.1.50', ja: '表に .50 がないので捨てる' },
    ],
    answer: 1,
    explanation: {
      en: 'It goes out of the right side. A row covers a range of addresses, not one address: 192.168.1.0/24 means every address that starts with 192.168.1, so 192.168.1.50 fits row 2. See Client and server, and step 6 of Getting started.',
      ja: '右側へ送ります。各行は 1 つのアドレスではなく、アドレスの範囲を表します。192.168.1.0/24 は「192.168.1 で始まるアドレス全部」なので、192.168.1.50 は 2 行目に当てはまります。レッスン「クライアントとサーバ」と、入門コースのステップ 6 で見られます。',
    },
    taughtBy: 'routing',
  },
  {
    id: 'tcp-next',
    prompt: {
      en: 'A browser is opening a TCP connection to a web server. The browser has sent SYN, and the server has answered SYN-ACK. What comes next?',
      ja: 'ブラウザが Web サーバに TCP で接続しようとしています。ブラウザが SYN を送り、サーバが SYN-ACK を返しました。次に起きるのはどれですか？',
    },
    options: [
      { en: 'The server sends the page at once', ja: 'サーバがすぐにページを送る' },
      { en: 'The browser sends its SYN again', ja: 'ブラウザが SYN をもう一度送る' },
      { en: 'The browser sends an ACK back', ja: 'ブラウザが ACK を返す' },
      { en: 'The server sends a FIN to finish', ja: 'サーバが FIN を送って終える' },
    ],
    answer: 2,
    explanation: {
      en: 'The browser sends an ACK. Before any data, TCP makes a connection with three messages: SYN, SYN-ACK, ACK. It is like a phone call: "hello?", "yes, I hear you", "right, let us talk". Data can be sent only after the third. See TCP handshake.',
      ja: 'ブラウザが ACK を返します。TCP はデータを送る前に、SYN、SYN-ACK、ACK の 3 回のやり取りで接続を作ります。電話の「もしもし」「はい、聞こえます」「では話します」と同じです。3 回目が済んでから、データを送れます。レッスン「TCP のハンドシェイク」で見られます。',
    },
    taughtBy: 'tcp',
  },
  {
    id: 'udp-lost',
    prompt: {
      en: 'An app sends one message to a server with UDP. The message is lost on the way. What does UDP do about it?',
      ja: 'アプリが UDP でサーバにメッセージを 1 つ送りました。途中でそれが失われました。UDP はどうしますか？',
    },
    options: [
      {
        en: 'It notices the loss and sends it once more',
        ja: '失われたと気づいて、同じものを送り直す',
      },
      {
        en: 'It redoes its handshake, then sends again',
        ja: 'ハンドシェイクからやり直して、送り直す',
      },
      {
        en: 'It waits until the server asks for it again',
        ja: 'サーバから「もう一度」と頼まれるのを待つ',
      },
      { en: 'Nothing: it never checks that it arrived', ja: '何もしない。届いたかを確かめない' },
    ],
    answer: 3,
    explanation: {
      en: 'UDP does nothing. It sends at once with no handshake and never checks that the message arrived, so it cannot know that one was lost. That is what it gives up for speed; TCP is the one that notices and sends again. See UDP datagram.',
      ja: 'UDP は何もしません。ハンドシェイクなしですぐ送り、届いたかどうかを確かめないので、失われたことに気づけません。速さと引き換えに手放したものです。気づいて送り直すのは TCP です。レッスン「UDP のデータグラム」で見られます。',
    },
    taughtBy: 'udp',
  },
  {
    id: 'name-fails',
    prompt: {
      en: 'On a laptop, a web page opens when you type the server’s IP address, but not when you type its name, www.example.com. Which service is most likely not working?',
      ja: 'ノート PC で、サーバの IP アドレスを打つとページが開きますが、www.example.com という名前を打つと開きません。うまく動いていない可能性が高いのはどれですか？',
    },
    options: [
      { en: 'DHCP', ja: 'DHCP' },
      { en: 'DNS', ja: 'DNS' },
      { en: 'ARP', ja: 'ARP' },
      { en: 'NAT', ja: 'NAT' },
    ],
    answer: 1,
    explanation: {
      en: 'DNS is the one not working. People type names, but a packet needs an IP address, and DNS is what turns the name into the address. Typing the address still works, so only that step is failing. DHCP is the service that lends a machine its address. See DHCP and DNS.',
      ja: '動いていないのは DNS です。人は名前を使いますが、パケットには IP アドレスが必要で、名前をアドレスに変えるのが DNS です。アドレスを直接打てば開くので、止まっているのはその変換だけです。機器にアドレスを貸すのは DHCP です。レッスン「DHCP と DNS」で見られます。',
    },
    taughtBy: 'dns',
  },
  {
    id: 'nat-sender',
    prompt: {
      en: 'At home, a phone (192.168.1.10) and a laptop (192.168.1.11) open the same website through one router. The router’s global address is 203.0.113.1. Which sender address does the website see?',
      ja: '家で、スマホ（192.168.1.10）とノート PC（192.168.1.11）が、1 台のルータを通って同じ Web サイトを開きます。ルータのグローバルアドレスは 203.0.113.1 です。Web サイトから見える送り主のアドレスはどれですか？',
    },
    options: [
      {
        en: '192.168.1.10 and 192.168.1.11, unchanged',
        ja: '192.168.1.10 と 192.168.1.11 のまま',
      },
      {
        en: 'A different global address for each one',
        ja: '機器ごとに別々のグローバルアドレス',
      },
      { en: '203.0.113.1 for both of the devices', ja: '2 台とも同じ 203.0.113.1' },
      {
        en: '192.168.1.1, the router’s inside address',
        ja: 'ルータの内側のアドレス 192.168.1.1',
      },
    ],
    answer: 2,
    explanation: {
      en: 'The website sees 203.0.113.1 for both. Private addresses such as 192.168.1.10 cannot be reached from the internet, so the router rewrites the sender to its own global address on the way out and puts the private one back on the reply. It tells the two devices apart by port number, like room numbers at one street address. See NAT / PAT.',
      ja: 'Web サイトから見えるのは、2 台とも 203.0.113.1 です。192.168.1.10 のようなプライベートアドレスはインターネットでは届けられないので、ルータは外へ出るときに送り主を自分のグローバルアドレスに書き換え、返事が来たら元に戻します。2 台の区別はポート番号（同じ住所の中の部屋番号のようなもの）でつけます。レッスン「NAT / PAT」で見られます。',
    },
    taughtBy: 'nat',
  },
];

/** A test is passed at eight of ten. */
export const EXAM_PASS_MARK = 8;

/** The answer recorded for a question: an option index, or "not learned". */
export type ExamAnswer = 0 | 1 | 2 | 3 | 'not-learned';

export interface ExamResult {
  readonly score: number;
  readonly passed: boolean;
  readonly perQuestion: readonly { readonly id: string; readonly correct: boolean }[];
}

/**
 * One level of the final test: its own path, in order, and its own ten
 * questions. Level 1 is the beginner path; later levels build on it and end
 * at questions an experienced engineer has to think hard about — every one of
 * them still answerable from a lesson in this product.
 */
export interface ExamLevel {
  readonly level: number;
  readonly title: Localised;
  /** One line on who the level is for, shown before the path. */
  readonly summary: Localised;
  readonly path: readonly PathStop[];
  readonly questions: readonly ExamQuestion[];
}

export const EXAM_LEVEL_1: ExamLevel = {
  level: 1,
  title: { en: 'Level 1 · Beginner', ja: 'レベル 1・入門' },
  summary: {
    en: 'The parts of a network, addresses, and the services every device relies on.',
    ja: 'ネットワークの部品、アドレス、どの機器も頼っているサービス。',
  },
  path: EXAM_PATH,
  questions: EXAM_QUESTIONS,
};

/** Mark a set of answers for one level; unanswered or "not learned" scores nothing. */
export function scoreLevel(
  level: ExamLevel,
  answers: Readonly<Record<string, ExamAnswer | undefined>>,
): ExamResult {
  const perQuestion = level.questions.map((question) => ({
    id: question.id,
    correct: answers[question.id] === question.answer,
  }));
  const score = perQuestion.filter((entry) => entry.correct).length;
  return { score, passed: score >= EXAM_PASS_MARK, perQuestion };
}

/** Mark the level-1 test. */
export function scoreExam(answers: Readonly<Record<string, ExamAnswer | undefined>>): ExamResult {
  return scoreLevel(EXAM_LEVEL_1, answers);
}

export function levelStop(level: ExamLevel, id: string): PathStop | undefined {
  return level.path.find((stop) => stop.id === id);
}

export function examStop(id: string): PathStop | undefined {
  return levelStop(EXAM_LEVEL_1, id);
}
