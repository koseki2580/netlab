import type { Catalog } from '../../../../types';

/** The `bfd` deck's questions (ja); its name is in the core chunk. */
export const bfd: Catalog = {
  'learning.concept.bfd.q1.prompt':
    'R1 と R2 はスイッチをはさんだ OSPF ネイバーで、タイマーは初期設定です。R2 が hello を送った直後に止まり、R1 自身のポートは上がったままです。R1 の通信が失われるのは約…',
  'learning.concept.bfd.q1.a': 'ほぼゼロ。R1 はポートのダウンにすぐ気づく',
  'learning.concept.bfd.q1.b': '40 秒。dead タイマーが切れるまで',
  'learning.concept.bfd.q1.c': '10 秒。hello が 1 回届かなかった時点',
  'learning.concept.bfd.q1.why':
    'R1 が R2 の停止に気づけるのは hello が聞こえなくなったときだけです。最後の hello から dead 間隔の 40 秒に、経路の再計算の時間を足しただけ失われます。',
  'learning.concept.bfd.q2.prompt':
    '2 台の間で BFD を間隔 50 ms、検出乗数 3 で動かします。BFD パケットの直後に起きた障害が検出されるのは…',
  'learning.concept.bfd.q2.a': '50 ms 後。1 間隔ぶん届かなかった時点',
  'learning.concept.bfd.q2.b': '3 秒後。BFD の最短タイマー',
  'learning.concept.bfd.q2.c': '150 ms 後。間隔 × 乗数',
  'learning.concept.bfd.q2.why':
    'BFD は「乗数」回分の間隔だけ何も届かないとネイバーをダウンと判断します。50 ms × 3 = 150 ms で、OSPF の 40 秒とは桁が違います。',
  'learning.concept.bfd.q3.prompt':
    'OSPF の初期設定（hello 10 秒、dead 40 秒）で、R2 が最後の hello から 9 秒後に止まりました。R1 がダウンと判断するのは…',
  'learning.concept.bfd.q3.a': '31 秒後。dead タイマーは最後の hello から数える',
  'learning.concept.bfd.q3.b': '40 秒後。dead タイマーは障害の時点から始まる',
  'learning.concept.bfd.q3.c': '1 秒後。次の hello が来なかった時点',
  'learning.concept.bfd.q3.why':
    'dead タイマーは hello を受けるたびにやり直すので、すでに 40 秒のうち 9 秒が過ぎています。障害が周期のどこで起きるかで、検出には 30〜40 秒かかります。',
  'learning.concept.bfd.q1.a.why':
    'すぐに見えるのは R1 自身のリンクの障害だけです。ここではスイッチが R1 のポートを上げたままにするので、R1 は無音から気づくしかありません。',
  'learning.concept.bfd.q1.c.why':
    'hello が 1 回欠けただけでは足りません。OSPF は hello 4 回分にあたる dead 間隔をまるごと待ってからネイバーをダウンにします。',
  'learning.concept.bfd.q2.a.why':
    '1 個欠けただけなら単なるパケットロスかもしれません。BFD は「乗数」個、ここでは 3 個欠けるまで待ってから障害と判断します。',
  'learning.concept.bfd.q2.b.why':
    'BFD に 3 秒という下限はありません。タイマーはセッションごとに設定し、50 ms × 3 なら 150 ms です。',
  'learning.concept.bfd.q3.b.why':
    '障害の瞬間には何も起きません。タイマーは 9 秒前、最後に hello を受けた時点から動いています。',
  'learning.concept.bfd.q3.c.why':
    'hello が欠けただけではネイバー関係は終わりません。終わらせるのは、最後の hello から数えた dead タイマーだけです。',
};
