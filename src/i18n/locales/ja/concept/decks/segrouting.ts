import type { Catalog } from '../../../../types';

/** The `segrouting` deck's questions (ja); its name is in the core chunk. */
export const segrouting: Catalog = {
  'learning.concept.segrouting.q1.prompt':
    'SR-MPLS で R1 が R4 のノード SID 16004 だけを 1 枚プッシュし、R1 の R4 への経路は R2 経由です。R2 と R4 はこのラベルをどう扱う？',
  'learning.concept.segrouting.q1.a': 'R2 が LDP のように自分で決めたラベルにスワップする',
  'learning.concept.segrouting.q1.b': 'R2 がポップし、IP アドレスでルーティングして先へ送る',
  'learning.concept.segrouting.q1.c': 'R2 はそのまま R4 へ送り、R4 がポップする',
  'learning.concept.segrouting.q1.why':
    'ノード SID はどのルータでも同じ意味、「R4 へ連れていけ」です。R2 は 16004 を同じラベルのまま R4 へ転送し、R4 が自分の SID をポップします。',
  'learning.concept.segrouting.q2.prompt':
    '通信を R3 経由にするため、R1 は 16003 | 16004（上が R3 の SID）のスタックをプッシュします。パケットが着いたとき R3 は？',
  'learning.concept.segrouting.q2.a': '自分の 16003 をポップし、16004 に従って R4 へ送る',
  'learning.concept.segrouting.q2.b': 'ポップは R4 だけなので、2 枚のまま R4 へ送る',
  'learning.concept.segrouting.q2.c': 'R1 からのこの経路の状態がないので捨てる',
  'learning.concept.segrouting.q2.why':
    '各ルータが見るのは一番上の SID だけです。16003 は R3 自身のものなのでポップし、次のセグメント 16004 が R4 へ導き、R4 がそれをポップします。',
  'learning.concept.segrouting.q3.prompt':
    'R1 が最短経路から R3 経由の経路に切り替えます。R2、R3、R4 のテーブルで変える必要があるのは？',
  'learning.concept.segrouting.q3.a': 'R3 に、RSVP-TE のようにシグナリングした経路の項目が要る',
  'learning.concept.segrouting.q3.b': '何もない。変わるのは R1 がプッシュするスタックだけ',
  'learning.concept.segrouting.q3.c': '新しい経路上の全ルータがポリシーを覚える必要がある',
  'learning.concept.segrouting.q3.why':
    '経路は SID としてパケットに書かれているので、コアは経路ごとの状態を持ちません。トラフィックエンジニアリングでもコアでのシグナリングは不要です。',
  'learning.concept.segrouting.q1.a.why':
    'LDP では各ルータがホップごとに自分のラベルを選びます。ノード SID はどこでも通じる 1 つの値なので、R2 は変えません。',
  'learning.concept.segrouting.q1.b.why':
    'SID をポップするのは、その SID を持つルータだけです。16004 は R4 のものなので、R2 はラベルを付けたまま R4 へ転送します。',
  'learning.concept.segrouting.q2.b.why':
    '各 SID は、それが指すルータがポップします。R3 が 16003 をポップし、R4 には自分の 16004 だけが残ります。',
  'learning.concept.segrouting.q2.c.why':
    '経路ごとの状態を持つルータはありません。R3 は自分と R4 の SID を知っていて、スタックが求めるのはそれだけです。',
  'learning.concept.segrouting.q3.a.why':
    'それは RSVP-TE のやり方で、トンネル上の各ルータが状態を持ちます。セグメントルーティングは代わりに経路をパケットに載せます。',
  'learning.concept.segrouting.q3.c.why':
    'ポリシーを持つのは入口の R1 だけです。経路上のルータは、すでに知っている SID に従うだけです。',
};
