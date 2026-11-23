import type { Catalog } from '../../../../types';

/** The `spineleaf` deck's questions (ja); its name is in the core chunk. */
export const spineleaf: Catalog = {
  'learning.concept.spineleaf.q1.prompt':
    'ファブリックをリーフ 8 台・スパイン 4 台から、リーフ 32 台・スパイン 6 台に広げました。別々のリーフにつながるホストの間で、パケットが通るのは…',
  'learning.concept.spineleaf.q1.a': '増えたリーフの段の分だけ多くのスイッチ',
  'learning.concept.spineleaf.q1.b': '以前と同じ、リーフ・スパイン・リーフの 3 台',
  'learning.concept.spineleaf.q1.c': '途中のスパインごとに 1 台ずつ、計 6 台',
  'learning.concept.spineleaf.q1.why':
    'すべてのリーフがすべてのスパインとつながっているので、どの 2 台のリーフもスパイン 1 台を隔てるだけです。リーフやスパインが何台でも、リーフ・スパイン・リーフの 3 台です。',
  'learning.concept.spineleaf.q2.prompt':
    'リーフ 8 台・スパイン 4 台のファブリックで、スパインが 1 台故障しました。リーフ間の通信が失うのは？',
  'learning.concept.spineleaf.q2.a': 'スパニングツリーが予備リンクを開くまでの疎通',
  'learning.concept.spineleaf.q2.b': '何も失わない。残りのスパインが全容量で運ぶ',
  'learning.concept.spineleaf.q2.c': '容量の 4 分の 1。経路は 3 本残る',
  'learning.concept.spineleaf.q2.why':
    '各リーフはスパインごとに 1 本の経路を持っていました。1 台が抜けると 4 本中 3 本、アップリンクは 400 Gbit/s 中 300 Gbit/s になりますが、他のリーフまでは変わらず 3 台です。',
  'learning.concept.spineleaf.q3.prompt':
    '各リーフには 25 Gbit/s のホストポートが 48 個あり、4 台のスパインそれぞれへ 100 Gbit/s のアップリンクが 1 本あります。オーバーサブスクリプションは…',
  'learning.concept.spineleaf.q3.a': '3:1（下り 1200 Gbit/s 対 上り 400）',
  'learning.concept.spineleaf.q3.b': '1:1（どのポートにも上りの経路がある）',
  'learning.concept.spineleaf.q3.c': '12:1（48 ポートで 4 本のアップリンク）',
  'learning.concept.spineleaf.q3.why':
    'オーバーサブスクリプションはポート数ではなく帯域で比べます。ホスト側 48 × 25 = 1200 Gbit/s に対し、アップリンク 4 × 100 = 400 Gbit/s なので 3:1 です。',
  'learning.concept.spineleaf.q4.prompt':
    'リーフは 4 台のスパインそれぞれへアップリンクを持っています。他のリーフ宛ての通信を運ぶのは何本？',
  'learning.concept.spineleaf.q4.a': '1 本。残り 3 本はスパニングツリーが止める',
  'learning.concept.spineleaf.q4.b': '4 本すべて。ルーテッドリンクを ECMP で分け合う',
  'learning.concept.spineleaf.q4.c': '2 本。稼働リンクとその待機リンクの組',
  'learning.concept.spineleaf.q4.why':
    'アップリンクはどれもルーテッドリンクなので、リーフはスパインごとに 1 本、計 4 本の等コスト経路を持ち、ECMP がフローをそのすべてに分散します。',
  'learning.concept.spineleaf.q1.a.why':
    'スパインリーフは 2 段だけの構成です。リーフは横に並べて増やし、段を重ねないので、経路は長くなりません。',
  'learning.concept.spineleaf.q1.c.why':
    'パケットが通るスパインは、フローのハッシュで選ばれた 1 台だけです。スパインを増やすと経路の本数が増え、ホップ数は増えません。',
  'learning.concept.spineleaf.q2.a.why':
    'ルーテッドなファブリックでは止められているリンクはありません。故障したスパインの経路が取り下げられると、通信は残りのスパインを使うだけです。',
  'learning.concept.spineleaf.q2.b.why':
    'スパインはそれぞれ、各リーフに 100 Gbit/s のアップリンクを 1 本提供していました。それが無くなるので、上りに使える帯域が減ります。',
  'learning.concept.spineleaf.q3.b.why':
    '経路があることと帯域があることは別です。1200 Gbit/s 分のホストポートが 400 Gbit/s のアップリンクを分け合います。',
  'learning.concept.spineleaf.q3.c.why':
    'ポート数だけでは速度を無視しています。アップリンクはホストポートの 4 倍速いので、比は 3:1 です。',
  'learning.concept.spineleaf.q4.a.why':
    'スパニングツリーが冗長リンクを止めるのはスイッチング（L2）の構成です。スパインリーフはすべてのリンクをルーティングするので、止められるリンクはありません。',
  'learning.concept.spineleaf.q4.c.why':
    '待機リンクはありません。4 本の経路はすべて等コストで、どれも通信を運びます。',
};
