import type { Catalog } from '../../../../types';

/** The `sdwan` deck's questions (ja); its name is in the core chunk. */
export const sdwan: Catalog = {
  'learning.concept.sdwan.q1.prompt':
    '18:00 にインターネット回線が混雑し、遅延 120 ms・ジッタ 40 ms・損失 3 % になりました。音声通話の許容値は 150 ms・30 ms・1 %、コストはインターネット 1、LTE 2、MPLS 3 です。音声通話はどこへ流れますか？',
  'learning.concept.sdwan.q1.a': '品質が最も良い MPLS 回線',
  'learning.concept.sdwan.q1.b': '要件を満たす中で最も安い LTE',
  'learning.concept.sdwan.q1.c': 'インターネット回線のまま',
  'learning.concept.sdwan.q1.why':
    'LTE（70 ms・15 ms・1 %）は音声の許容値をすべて満たし、コストも 2 で MPLS の 3 より安いため、音声は LTE へ移ります。',
  'learning.concept.sdwan.q1.a.why':
    'MPLS も要件は満たしますが LTE より高価です。ポリシーが選ぶのは「最良の回線」ではなく「要件を満たす最も安い回線」です。',
  'learning.concept.sdwan.q1.c.why':
    'ジッタ 40 ms・損失 3 % では音声の要件を満たさないため、SD-WAN は通話をこの回線から移します。',
  'learning.concept.sdwan.q2.prompt':
    '同じ混雑時、ビデオ会議の許容値は 100 ms・20 ms・損失わずか 0.5 % です。ビデオ会議はどこへ流れますか？',
  'learning.concept.sdwan.q2.a': '音声と同じ LTE',
  'learning.concept.sdwan.q2.b': 'コストが安いインターネット回線',
  'learning.concept.sdwan.q2.c': 'MPLS（LTE は損失が大きすぎる）',
  'learning.concept.sdwan.q2.why':
    '混雑時にビデオの許容値を満たすのは MPLS（30 ms・2 ms・0 %）だけなので、最も高価でもビデオは MPLS へ移ります。',
  'learning.concept.sdwan.q2.a.why':
    'LTE の損失 1 % はビデオの上限 0.5 % を超えます。同じ混雑でも、通信の種類によって移る先が異なります。',
  'learning.concept.sdwan.q2.b.why':
    'コストで選ぶのは要件を満たす回線の中だけです。混雑したインターネット回線はビデオの 3 つの許容値をすべて超えています。',
  'learning.concept.sdwan.q3.prompt':
    '混雑していない時間帯、インターネット回線は良好です（25 ms・4 ms・0.1 %）。音声通話が最良の MPLS を使わないのはなぜですか？',
  'learning.concept.sdwan.q3.a': 'インターネット回線で要件を満たせ、しかも安いから',
  'learning.concept.sdwan.q3.b': 'MPLS は障害時の待機用に空けておくから',
  'learning.concept.sdwan.q3.c': '回線ごとに流す通信の種類がポリシーで固定だから',
  'learning.concept.sdwan.q3.why':
    'ポリシーが問うのは「この回線で十分か」だけで、十分な回線の中から最も安いものを選びます。ここではコスト 1 のインターネット回線です。',
  'learning.concept.sdwan.q3.b.why':
    'ここで MPLS は予約されていません。混雑時にはビデオが移ってきます。安い回線で足りる間は選ばれないだけです。',
  'learning.concept.sdwan.q3.c.why':
    '固定の割り当てはありません。期間ごとに、各通信が要件を満たす最も安い回線を使うので、音声とビデオが同じ回線を共有することもあります。',
  'learning.concept.sdwan.q4.prompt':
    '混雑時、夜間バックアップ（許容値 1000 ms・500 ms・5 %）はどこへ流れますか？',
  'learning.concept.sdwan.q4.a': 'データを失わないよう MPLS へ',
  'learning.concept.sdwan.q4.b': 'インターネット回線のまま',
  'learning.concept.sdwan.q4.c': '音声通話と一緒に LTE へ',
  'learning.concept.sdwan.q4.why':
    '混雑していても、インターネット回線（120 ms・40 ms・3 %）はバックアップの許容値に収まり、しかも最も安いので移りません。ポリシーは通信ごとに判断します。',
  'learning.concept.sdwan.q4.a.why':
    '損失は TCP の再送で補われます。これほど許容値が緩ければ、混雑したインターネット回線でも十分です。',
  'learning.concept.sdwan.q4.c.why':
    '音声が移ったのは許容値が厳しいからです。バックアップの許容値は緩く、最も安い回線のままで要件を満たします。',
};
