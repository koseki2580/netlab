import type { Catalog } from '../../../../types';

/** The `redistribution` deck's questions (ja); its name is in the core chunk. */
export const redistribution: Catalog = {
  'learning.concept.redistribution.q1.prompt':
    'よく使われる Cisco の既定の AD で、あるルータが 10.5.0.0/16 を OSPF（コスト 20）と RIP（2 ホップ）から学びました。インストールされるのはどちらですか？',
  'learning.concept.redistribution.q1.a': 'RIP の経路。メトリック 2 のほうが 20 より小さいから',
  'learning.concept.redistribution.q1.b': 'OSPF の経路。AD 110 が RIP の 120 に勝つ',
  'learning.concept.redistribution.q1.c': '両方。等コスト経路として負荷分散する',
  'learning.concept.redistribution.q1.why':
    'プロトコルをまたぐときは、メトリックではなくアドミニストレーティブディスタンス（AD）を比べます。OSPF（110）が RIP（120）より信頼されます。メトリックを比べるのは同じプロトコルの経路どうしだけです。',
  'learning.concept.redistribution.q1.a.why':
    'RIP のホップ数と OSPF のコストは単位が違うので、「2 は 20 より小さい」には意味がありません。決めるのは小さいほうの AD です。',
  'learning.concept.redistribution.q1.c.why':
    '負荷分散できるのは同じプロトコルの等しい経路だけです。プロトコルが違う経路は同点にならず、AD の小さいほうがそのまま勝ちます。',
  'learning.concept.redistribution.q2.prompt':
    'RIP の RA が境界ルータ R1・R2 につながり、両者は対策なしで双方向に再配布します。R1 が先に動きます。その後 R2 は RA の 10.5.0.0/16 へどう届けますか？',
  'learning.concept.redistribution.q2.a': '自分の RIP リンクで RA へ直接、1 ホップで',
  'learning.concept.redistribution.q2.b': 'TTL が切れるまで、R2 と O2 の間でパケットがループする',
  'learning.concept.redistribution.q2.c': 'O2・O1・R1 経由で RA へ。4 ホップかかる',
  'learning.concept.redistribution.q2.why':
    'R1 が RIP の経路を OSPF に入れます。それが AD 110 の OSPF 外部経路として R2 に届き、R2 自身の RIP 経路（120）に勝つので、R2 は遠回りで送ります。',
  'learning.concept.redistribution.q2.a.why':
    'R2 は RA の経路を RIP でも聞いていますが、その AD は 120 です。R1 が OSPF に入れたほうは 110 で届くので、経路が長くてもそちらが勝ちます。',
  'learning.concept.redistribution.q2.b.why':
    'この構成では経路が長くなるだけです。R1 が自分の RIP 経路を持ち続けるので、R2 → O2 → O1 → R1 → RA で RA に届きます。ループは、より大きな構成や経路の取り消し中に起こり得ます。',
  'learning.concept.redistribution.q3.prompt':
    'タグによる対策は、どうやって R2 を自分の RIP 経路にとどめますか？',
  'learning.concept.redistribution.q3.a': 'R1 が RIP 由来の経路にタグを付け、R2 はそれを拒否する',
  'learning.concept.redistribution.q3.b':
    'タグが OSPF のコストを上げ、RIP のメトリックが勝つようにする',
  'learning.concept.redistribution.q3.c':
    'タグが RA に、R1 へプレフィックスを広告するのをやめさせる',
  'learning.concept.redistribution.q3.why':
    'ルートタグは経路の出どころを示す印です。R2 は R1 のタグ（100）が付いた OSPF 経路をフィルタで除くので、RA 経由の RIP 経路をインストールし、プレフィックスを RIP へ戻すこともしません。',
  'learning.concept.redistribution.q3.b.why':
    'タグはただのラベルで、メトリックは変えません。それに OSPF のコストを上げても RIP には負けません。プロトコル間を決めるのはメトリックではなく AD です。',
  'learning.concept.redistribution.q3.c.why':
    'RA はタグを見ません。タグは OSPF ドメイン内の外部経路に付けられ、それを使って判断するのは境界ルータ R2 です。',
  'learning.concept.redistribution.q4.prompt':
    'もう 1 つの対策として、R1 と R2 は OSPF 外部経路の AD を 110 ではなく 125 にします。R2 はどうなりますか？',
  'learning.concept.redistribution.q4.a': 'OSPF ドメイン全体からそのプレフィックスが消える',
  'learning.concept.redistribution.q4.b': '自分の RIP 経路（120 < 125）で RA へ 1 ホップ',
  'learning.concept.redistribution.q4.c':
    'E2 メトリックの 20 が RIP に勝つので、OSPF の経路のまま使う',
  'learning.concept.redistribution.q4.why':
    '境界ルータで OSPF 外部経路の AD を RIP の 120 より大きくすると、自分の RIP 経路が勝つので、R2 は RA へ直接送ります。OSPF の内部経路は 110 のままです。',
  'learning.concept.redistribution.q4.a.why':
    'AD は各ルータの中だけの値で、R2 がどの経路をインストールするかを変えるだけです。OSPF が流す内容は変わらず、ほかの OSPF ルータは引き続きプレフィックスを学びます。',
  'learning.concept.redistribution.q4.c.why':
    'メトリックはプロトコルをまたいで比べません。125 と RIP の 120 では RIP の AD が小さいので、RIP の経路が勝ちます。',
};
