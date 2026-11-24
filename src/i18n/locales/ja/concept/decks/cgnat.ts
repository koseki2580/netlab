import type { Catalog } from '../../../../types';

/** The `cgnat` deck's questions (ja); its name is in the core chunk. */
export const cgnat: Catalog = {
  'learning.concept.cgnat.q1.prompt':
    'CGN が 1 つのグローバル IPv4 アドレスのポートを 1,024 個ずつのブロックにし、加入者に 1 ブロックずつ渡します。1024 未満のポートは使いません。このアドレスを共有できる加入者は何人？',
  'learning.concept.cgnat.q1.a': '64 人（65,536 ポート ÷ 1,024）',
  'learning.concept.cgnat.q1.b': '63 人（ポート 1024〜65535 ÷ 1,024）',
  'learning.concept.cgnat.q1.c': '1,024 人（ブロック内の 1 ポートに 1 人）',
  'learning.concept.cgnat.q1.why':
    'ポート 1024〜65535 は 64,512 個で、64,512 ÷ 1,024 = ちょうど 63 ブロック。だから 63 人です。',
  'learning.concept.cgnat.q1.a.why':
    '65,536 には使わないポート 0〜1023 も入っています。それを除くと 63 ブロックしか入りません。',
  'learning.concept.cgnat.q1.c.why':
    '加入者は 1 ポートではなく 1,024 ポートのブロックを丸ごと持つので、1 アドレスに入るのは 1,024 人ではなく 63 人です。',
  'learning.concept.cgnat.q2.prompt':
    '1,024 ポートのブロックを 1 つ持つ加入者が、同時に 1,200 本の接続を開きます。どうなる？',
  'learning.concept.cgnat.q2.a': '1,025 本目以降が失敗し、残りは動く',
  'learning.concept.cgnat.q2.b': '全部動く。宛先ごとにポートを使い回す',
  'learning.concept.cgnat.q2.c': 'CGN がほかの加入者のポートを借りる',
  'learning.concept.cgnat.q2.why':
    '通信ごとに外側のポートが 1 つ要るので、1,024 ポートで運べるのは 1,024 本です。残りの 176 本は拒否されますが、最初の 1,024 本とほかの加入者には影響しません。',
  'learning.concept.cgnat.q2.b.why':
    'CGN はエンドポイント非依存マッピングを使います（RFC 6888 が求めています）。外側のポートは宛先にかかわらず内側のアドレスとポートの 1 組だけのもので、別の接続の送信元ポートに使い回されることはありません。',
  'learning.concept.cgnat.q2.c.why':
    '加入者のポートはそれぞれ自分のブロックにあります。追加のブロックは空いているものからだけ、しかも運用者が 2 つ以上を許している場合にだけ渡せます。',
  'learning.concept.cgnat.q3.prompt':
    '多くの CGN が、通信ごとに 1 ポートではなくブロック単位でポートを渡すのはなぜ？',
  'learning.concept.cgnat.q3.a': 'ブロックにすると変換が速くなるから',
  'learning.concept.cgnat.q3.b': '標準が 1 ポートに 2 通信を禁じているから',
  'learning.concept.cgnat.q3.c': '記録が通信ごとでなくブロックごとで済むから',
  'learning.concept.cgnat.q3.why':
    'ISP は、ある時刻にグローバルアドレスのあるポートを使っていたのが誰かを答えられなければなりません。通信ごとではなく渡したブロックごとに記録すれば、にぎやかな世帯でも 1,024 件が 1 件で済みます。',
  'learning.concept.cgnat.q3.a.why':
    '変換の速さは理由ではありません。ブロックは、ポートから加入者をたどるために CGN が記録すべき量の問題です。',
  'learning.concept.cgnat.q3.b.why':
    '通信ごとに割り当てる場合も、どの通信も自分のポートを持ちます。ブロックで変わるのは記録で、ブロックごとに 1 件になります。',
  'learning.concept.cgnat.q4.prompt':
    'MAP-E（RFC 7597）で PSID が 6 ビット、オフセットビットが既定の 6 のとき、加入者 1 人あたりのポートは何個？',
  'learning.concept.cgnat.q4.a': '1,024 個（65,536 ÷ 64 人）',
  'learning.concept.cgnat.q4.b': '64 個（PSID の値ごとに 1 ポート）',
  'learning.concept.cgnat.q4.c': '1,008 個（16 ポートの範囲が 63 個）',
  'learning.concept.cgnat.q4.why':
    '6 ビットのオフセットで値 0 の範囲（ポート 0〜1023）が除かれるので 63 個が残り、PSID の後ろに残る 4 ビットで 1 範囲 16 ポートになります。63 × 16 = 1,008 ポートを 64 人が持ちます。',
  'learning.concept.cgnat.q4.a.why':
    '65,536 ÷ 64 にはポート 0〜1023 も入っています。オフセットビットがそれをどのセットからも除くので、1,008 個になります。',
  'learning.concept.cgnat.q4.b.why':
    'PSID は加入者がどのポートを持つかを決めます。6 ビットで 64 人になり、それぞれが 16 ポートの範囲を 63 個持ちます。',
};
