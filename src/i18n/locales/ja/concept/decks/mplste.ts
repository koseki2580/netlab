import type { Catalog } from '../../../../types';

/** The `mplste` deck's questions (ja); its name is in the core chunk. */
export const mplste: Catalog = {
  'learning.concept.mplste.q1.prompt':
    'TE なしで、A から Z へ 6・5・4 Gbit/s のフローを送ります。メトリックが最小の経路は A–B–Z で、リンクは 10 Gbit/s です。どうなる？',
  'learning.concept.mplste.q1.a': '15 Gbit/s すべてが A–B–Z に乗り、5 は捨てられ他は空く',
  'learning.concept.mplste.q1.b': 'あふれた分を IGP が A–C–Z へ回す',
  'learning.concept.mplste.q1.c': '負荷が収まるまで IGP が A–B のメトリックを上げる',
  'learning.concept.mplste.q1.why':
    'どのフローもメトリック最小の 1 本の経路をたどるので、A–B には 10 Gbit/s のところへ 15 Gbit/s が来ます。5 Gbit/s が捨てられ、A–C–Z と A–E–Z は空いたままです。',
  'learning.concept.mplste.q1.b.why':
    'IGP はメトリックで経路を選び、負荷は見ません。A–C–Z はメトリックが大きいので何も運びません。',
  'learning.concept.mplste.q1.c.why':
    'メトリックは設定する値で、負荷に応じて変わりません。IGP はすべてをメトリック最小の経路に送り続けます。',
  'learning.concept.mplste.q2.prompt':
    'CSPF で LSP 1（6 Gbit/s）が A→B→Z に置かれました。次に LSP 2 が 5 Gbit/s を求めます。どこに置かれる？',
  'learning.concept.mplste.q2.a': 'いちばん短いので、やはり A→B→Z',
  'learning.concept.mplste.q2.b': '最短に近い遠回りの A→B→D→Z',
  'learning.concept.mplste.q2.c': 'A→C→Z（A–B の残りは 4 Gbit/s）',
  'learning.concept.mplste.q2.why':
    'CSPF はまず、予約されていない帯域が要求より小さいリンク（ここでは残り 4 Gbit/s の A–B と B–Z）を取り除き、残った中の最短経路 A→C→Z（メトリック 30）を選びます。',
  'learning.concept.mplste.q2.a.why':
    'CSPF は、未予約の帯域が要求より小さいリンクを取り除きます。A–B と B–Z の残りは 4 Gbit/s で、5 に足りません。',
  'learning.concept.mplste.q2.b.why':
    'その経路も A–B を通ります。A–B の未予約帯域は 4 Gbit/s しかないので、CSPF は取り除いています。',
  'learning.concept.mplste.q3.prompt':
    'LSP 1 と 3 が通るリンク B–Z が故障しました。高速リルート（ファシリティバックアップ）では、最初に通信を移すのは誰？',
  'learning.concept.mplste.q3.a': 'ヘッドエンドの A がすぐ CSPF をやり直す',
  'learning.concept.mplste.q3.b': 'B が事前に張ったバイパス B→D→Z へ移す',
  'learning.concept.mplste.q3.c': 'IGP が再収束して全ルータが切り替える',
  'learning.concept.mplste.q3.why':
    'ローカル修復点の B は、B–Z を避けて Z へ向かうバイパスをあらかじめ張っています。B は両方の LSP にバイパスのラベルを積み、数十 ms で迂回させます。ヘッドエンドが張り直すよりずっと前です。',
  'learning.concept.mplste.q3.a.why':
    'ヘッドエンドも LSP を置き直しますが、故障を知ってからなので 1 秒ほどかそれ以上かかります。FRR はその前に動きます。',
  'learning.concept.mplste.q3.c.why':
    'IGP の再収束はもっと遅く、予約も考えません。FRR は故障したリンクのすぐ手前のルータで修復します。',
  'learning.concept.mplste.q4.prompt':
    'そのあと A が B–Z なしで CSPF をやり直します。LSP 2 は A–C–Z の 5 Gbit/s をそのまま持っています。LSP 1（6 Gbit/s）はどこへ行く？',
  'learning.concept.mplste.q4.a': '残った中でいちばん短い A→C→Z',
  'learning.concept.mplste.q4.b': 'バイパスの B→D→Z にそのまま残る',
  'learning.concept.mplste.q4.c': 'A→E→Z（A–C の残りは 5 Gbit/s）',
  'learning.concept.mplste.q4.why':
    'B–Z がなく、A–C の未予約帯域が 5 Gbit/s しかないので、6 Gbit/s が空いている最短経路は A→E→Z（メトリック 40）です。そのあとバイパスはまた静かになります。',
  'learning.concept.mplste.q4.a.why':
    'LSP 2 が A–C の 10 Gbit/s のうち 5 を持っています。5 は 6 より小さいので、CSPF は LSP 1 のために A–C を取り除きます。',
  'learning.concept.mplste.q4.b.why':
    'バイパスはつなぎにすぎず、帯域を予約していません。ヘッドエンドは、本当に余裕のある経路へ LSP を移します。',
};
