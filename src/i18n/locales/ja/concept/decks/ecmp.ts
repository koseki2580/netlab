import type { Catalog } from '../../../../types';

/** The `ecmp` deck's questions (ja); its name is in the core chunk. */
export const ecmp: Catalog = {
  'learning.concept.ecmp.q1.prompt': 'ECMP を使うのは…',
  'learning.concept.ecmp.q1.a': '宛先への複数経路が同コストのとき',
  'learning.concept.ecmp.q1.b': '宛先への経路が 1 つだけのとき',
  'learning.concept.ecmp.q1.c': '宛先へのリンクが落ちているとき',
  'learning.concept.ecmp.q1.why':
    'ルーティングが同コストの複数ネクストホップを見つけると、ECMP はトラフィックをそれらに分散します。',
  'learning.concept.ecmp.q2.prompt': 'ECMP が同一フローを1 経路に保つ方法は…',
  'learning.concept.ecmp.q2.a': 'パケットごとにランダムに選択する',
  'learning.concept.ecmp.q2.b': '5タプルのハッシュでネクストホップを選ぶ',
  'learning.concept.ecmp.q2.c': '常に最小の IP アドレスを使う',
  'learning.concept.ecmp.q2.why':
    'フロー単位ハッシュは並べ替えを避けるため接続を1 経路に保ち、異なるフローは経路間で分散します。',
  'learning.concept.ecmp.q3.prompt': 'ECMP の利点は…',
  'learning.concept.ecmp.q3.a': '転送トラフィックの暗号化',
  'learning.concept.ecmp.q3.b': 'テーブル内の経路が減る',
  'learning.concept.ecmp.q3.c': '負荷分散と総帯域の増加',
  'learning.concept.ecmp.q3.why':
    'ECMP は並列リンクを同時利用し、スループットを高め冗長性も提供します。',
  'learning.concept.ecmp.q1.b.why':
    '経路が 1 本では分散するものがありません。ECMP は同じ最小コストの経路が複数あるときに使います。',
  'learning.concept.ecmp.q1.c.why':
    'リンク障害はフェイルオーバーの話です。ECMP は生きている等コスト経路に負荷を分散します。',
  'learning.concept.ecmp.q2.a.why':
    'パケットごとのランダムはフローを並べ替えてしまいます。ECMP は 5タプルをハッシュし各フローを 1 経路に固定します。',
  'learning.concept.ecmp.q2.c.why':
    '最小 IP を選ぶだけではありません。ECMP はフローの 5タプルをハッシュし一貫したネクストホップを選びます。',
  'learning.concept.ecmp.q3.a.why':
    'ECMP は暗号化しません。等コスト経路に負荷を分け、合計帯域を増やします。',
  'learning.concept.ecmp.q3.b.why':
    'ECMP は経路を減らすのではなく多く使います。利点は負荷分散と総帯域の増加です。',
};
