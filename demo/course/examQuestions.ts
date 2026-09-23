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

export const EXAM_QUESTIONS: readonly ExamQuestion[] = [
  {
    id: 'ip-address',
    prompt: {
      en: 'What is an IP address for?',
      ja: 'IP アドレスは何のためにありますか？',
    },
    options: [
      { en: 'It is the password to join a network', ja: 'ネットワークに入るためのパスワード' },
      {
        en: 'It says which machine a packet is for, so the network can deliver it',
        ja: 'パケットがどの機器あてかを示し、ネットワークが届けられるようにする住所',
      },
      { en: 'It sets how fast the cable can go', ja: 'ケーブルの速さを決める設定' },
      { en: 'It is the name printed on the machine', ja: '機器の本体に書かれた製品名' },
    ],
    answer: 1,
    explanation: {
      en: 'An IP address is where a packet is going. Every step of the course sends a packet to one: the network reads it to decide where to deliver.',
      ja: 'IP アドレスはパケットの行き先です。入門コースでは毎回アドレスあてにパケットを送り、ネットワークはそれを見て届け先を決めていました。',
    },
    taughtBy: 'course',
  },
  {
    id: 'same-network',
    prompt: {
      en: 'Are 192.168.1.10/24 and 192.168.1.200/24 on the same network?',
      ja: '192.168.1.10/24 と 192.168.1.200/24 は同じネットワークにいますか？',
    },
    options: [
      {
        en: 'Yes — with /24 the first three numbers (192.168.1) are the network, and they match',
        ja: 'はい。/24 では最初の 3 つの数（192.168.1）がネットワークを表し、それが同じだから',
      },
      {
        en: 'No — the last numbers are different',
        ja: 'いいえ。最後の数が違うから',
      },
      { en: 'No — /24 means only 24 machines fit', ja: 'いいえ。/24 は 24 台までという意味だから' },
      {
        en: 'It cannot be told from the addresses',
        ja: 'アドレスだけでは判断できない',
      },
    ],
    answer: 0,
    explanation: {
      en: 'The /24 says the first 24 bits — the first three numbers — name the network. Both start 192.168.1, so they share it; the last number tells machines apart.',
      ja: '/24 は「先頭の 24 ビット、つまり最初の 3 つの数がネットワーク」という意味です。どちらも 192.168.1 なので同じネットワークで、最後の数が機器の区別です。',
    },
    taughtBy: 'subnetting',
  },
  {
    id: 'switch',
    prompt: {
      en: 'What does a switch do with a frame?',
      ja: 'スイッチはフレームをどう扱いますか？',
    },
    options: [
      {
        en: 'Copies it to every port, always',
        ja: 'いつもすべてのポートにコピーして送る',
      },
      {
        en: 'Sends it to another network through the internet',
        ja: 'インターネットを通って別のネットワークへ送る',
      },
      {
        en: 'Sends it out of the port that leads to the destination machine, within the same network',
        ja: '同じネットワークの中で、宛先の機器につながるポートへ送り出す',
      },
      { en: 'Changes its IP address', ja: 'IP アドレスを書き換える' },
    ],
    answer: 2,
    explanation: {
      en: 'A switch joins machines on one network and sends each frame toward the one machine it is for — the course showed only the destination receiving it.',
      ja: 'スイッチは同じネットワークの機器をつなぎ、フレームを宛先の 1 台へ向けて送ります。入門コースでは、受け取ったのは宛先の 1 台だけでした。',
    },
    taughtBy: 'course',
  },
  {
    id: 'router',
    prompt: {
      en: 'Two networks are not connected. What joins them so machines can talk across?',
      ja: '2 つのネットワークがつながっていません。機器どうしが行き来できるようにするには、何でつなぎますか？',
    },
    options: [
      { en: 'A longer cable', ja: 'もっと長いケーブル' },
      { en: 'A second switch', ja: '2 台目のスイッチ' },
      {
        en: 'A router, with an address on each network',
        ja: '両方のネットワークにアドレスを持つルータ',
      },
      {
        en: 'Nothing — different networks can never talk',
        ja: '何も使えない。別のネットワークどうしは話せない',
      },
    ],
    answer: 2,
    explanation: {
      en: 'A switch stays inside one network. A router has a foot — an address — in each, and passes packets between them; the course failed without one and succeeded with one.',
      ja: 'スイッチは 1 つのネットワークの中だけです。ルータはそれぞれのネットワークにアドレスを持ち、その間でパケットを中継します。入門コースでは、ルータがないと届かず、あると届きました。',
    },
    taughtBy: 'course',
  },
  {
    id: 'arp',
    prompt: {
      en: 'What does ARP do?',
      ja: 'ARP は何をしますか？',
    },
    options: [
      { en: 'Encrypts the packet', ja: 'パケットを暗号化する' },
      {
        en: 'Finds the MAC address that belongs to an IP address on the same network',
        ja: '同じネットワークにいる相手の、IP アドレスに対応する MAC アドレスを調べる',
      },
      { en: 'Gives the machine an IP address', ja: '機器に IP アドレスを配る' },
      {
        en: 'Turns a name like example.com into an address',
        ja: 'example.com のような名前をアドレスに変える',
      },
    ],
    answer: 1,
    explanation: {
      en: 'Before the first packet can leave, the sender asks "who has this IP?" and learns the MAC address to put on the frame — the ARP request and reply in the lesson.',
      ja: '最初のパケットを送り出す前に、送り手は「この IP アドレスの機器は誰？」と尋ね、フレームに書く MAC アドレスを知ります。レッスンの ARP の要求と応答がそれです。',
    },
    taughtBy: 'arp',
  },
  {
    id: 'route-table',
    prompt: {
      en: 'What does a router look at to decide where to send a packet next?',
      ja: 'ルータは、パケットを次にどこへ送るかを何を見て決めますか？',
    },
    options: [
      {
        en: 'Its route table, matching the destination address',
        ja: '経路表。宛先アドレスに合う行を探す',
      },
      { en: 'The size of the packet', ja: 'パケットの大きさ' },
      { en: 'Whichever cable was used last', ja: '最後に使ったケーブル' },
      {
        en: 'It sends it everywhere and lets the right one keep it',
        ja: 'すべての方向に送り、正しい相手に受け取らせる',
      },
    ],
    answer: 0,
    explanation: {
      en: 'A router compares the destination with the rows of its route table and forwards toward the most specific match — the route table and next hop in the lesson.',
      ja: 'ルータは宛先アドレスを経路表の各行と比べ、いちばん詳しく一致した行の次ホップへ転送します。レッスンの経路表と次ホップがそれです。',
    },
    taughtBy: 'routing',
  },
  {
    id: 'tcp',
    prompt: {
      en: 'What does TCP do before it sends any data?',
      ja: 'TCP は、データを送る前に何をしますか？',
    },
    options: [
      { en: 'Nothing; it just sends', ja: '何もしない。そのまま送る' },
      { en: 'Asks DNS for permission', ja: 'DNS に許可をもらう' },
      {
        en: 'Sets up a connection with a three-way handshake (SYN, SYN-ACK, ACK)',
        ja: '3 ウェイハンドシェイク（SYN、SYN-ACK、ACK）で接続を作る',
      },
      {
        en: 'Splits the data into exactly three packets',
        ja: 'データを必ず 3 つのパケットに分ける',
      },
    ],
    answer: 2,
    explanation: {
      en: 'TCP agrees on a connection first — SYN, SYN-ACK, ACK — and only then sends; the lesson shows both ends reach ESTABLISHED.',
      ja: 'TCP は先に接続を取り決めます（SYN、SYN-ACK、ACK）。そのあとでデータを送ります。レッスンでは両端が ESTABLISHED になります。',
    },
    taughtBy: 'tcp',
  },
  {
    id: 'udp',
    prompt: {
      en: 'What is true of UDP?',
      ja: 'UDP について正しいのはどれですか？',
    },
    options: [
      {
        en: 'It sends straight away, without setting up a connection first',
        ja: '接続を作らずに、すぐに送る',
      },
      { en: 'It always resends lost data', ja: '失われたデータを必ず送り直す' },
      { en: 'It needs a handshake like TCP', ja: 'TCP と同じようにハンドシェイクが必要' },
      { en: 'It only works inside one switch', ja: '1 台のスイッチの中でしか使えない' },
    ],
    answer: 0,
    explanation: {
      en: 'UDP skips the handshake: one datagram goes out at once. That makes it quick, and means nothing checks that it arrived.',
      ja: 'UDP はハンドシェイクをしません。データグラムを 1 つすぐに送ります。そのぶん速い一方、届いたかどうかは確かめません。',
    },
    taughtBy: 'udp',
  },
  {
    id: 'dns',
    prompt: {
      en: 'What does DNS do?',
      ja: 'DNS は何をしますか？',
    },
    options: [
      { en: 'Gives out IP addresses automatically', ja: 'IP アドレスを自動で配る' },
      { en: 'Finds a MAC address', ja: 'MAC アドレスを調べる' },
      {
        en: 'Turns a name such as www.example.com into an IP address',
        ja: 'www.example.com のような名前を IP アドレスに変える',
      },
      { en: 'Joins two networks', ja: '2 つのネットワークをつなぐ' },
    ],
    answer: 2,
    explanation: {
      en: 'People use names; packets need addresses. DNS answers "what is the address of this name?" — handing out addresses is DHCP, in the same lesson.',
      ja: '人は名前を使い、パケットはアドレスを使います。DNS は「この名前のアドレスは？」に答えます。アドレスを配るのは同じレッスンの DHCP です。',
    },
    taughtBy: 'dns',
  },
  {
    id: 'nat',
    prompt: {
      en: 'What does NAT do on a home or office router?',
      ja: '家庭や会社のルータで、NAT は何をしますか？',
    },
    options: [
      {
        en: 'Rewrites private addresses to the router’s public address so many machines can share it',
        ja: 'プライベートなアドレスをルータのグローバルアドレスに書き換え、たくさんの機器で共有できるようにする',
      },
      { en: 'Blocks every packet from outside', ja: '外からのパケットをすべて止める' },
      { en: 'Makes the connection faster', ja: '通信を速くする' },
      { en: 'Finds the shortest route', ja: 'いちばん短い経路を探す' },
    ],
    answer: 0,
    explanation: {
      en: 'Machines inside use private addresses the internet cannot route to. NAT swaps them for the router’s public address on the way out, and back on the way in — the translation table in the lesson.',
      ja: '内側の機器は、インターネットでは届かないプライベートアドレスを使っています。NAT は外へ出るときにルータのグローバルアドレスへ書き換え、戻りで元に戻します。レッスンの変換表がそれです。',
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
