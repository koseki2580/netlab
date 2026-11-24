import type { Catalog } from '../../../../types';

/** The `timesync` deck's questions (ja); its name is in the core chunk. */
export const timesync: Catalog = {
  'learning.concept.timesync.q1.prompt':
    'NTP のやりとりで t1 = 0、t2 = 110、t3 = 112、t4 = 22 が得られました（ms。t1 と t4 はクライアントの時計、t2 と t3 はサーバの時計）。クライアントが求めるオフセットと遅延は？',
  'learning.concept.timesync.q1.a': 'オフセット +110 ms、遅延 22 ms',
  'learning.concept.timesync.q1.b': 'オフセット +100 ms、遅延 20 ms',
  'learning.concept.timesync.q1.c': 'オフセット +100 ms、遅延 22 ms',
  'learning.concept.timesync.q1.why':
    'オフセット = ((t2 − t1) + (t3 − t4)) / 2 = (110 + 90) / 2 = 100 ms で、2 つの差を平均すると行きと帰りが打ち消し合います。遅延 = (t4 − t1) − (t3 − t2) = 22 − 2 = 20 ms です。',
  'learning.concept.timesync.q1.a.why':
    't2 − t1 は「オフセット + 行きの時間」です。t4 − t1 には、サーバが要求を抱えていた 2 ms もまだ入っています。',
  'learning.concept.timesync.q1.c.why':
    'オフセットは合っていますが、遅延からは t2 と t3 の間、要求がサーバの中にあった 2 ms を除く必要があります。',
  'learning.concept.timesync.q2.prompt':
    '要求がサーバに届くのに 30 ms、返事が戻るのに 10 ms かかります。NTP が求めるオフセットはどれだけずれる？',
  'learning.concept.timesync.q2.a': 'ずれない（測った遅延で打ち消される）',
  'learning.concept.timesync.q2.b': '20 ms（行きと帰りの差そのもの）',
  'learning.concept.timesync.q2.c': '10 ms（行きと帰りの差の半分）',
  'learning.concept.timesync.q2.why':
    'NTP は往復の半分ずつを行きと帰りと仮定します。行き 30 ms、帰り 10 ms なら、推定は (30 − 10) / 2 = 10 ms ずれます。',
  'learning.concept.timesync.q2.a.why':
    '遅延 40 ms は正しく測れますが、その内訳はタイムスタンプからわからないので、偏りの分はオフセットに残ります。',
  'learning.concept.timesync.q2.b.why':
    'オフセットは 2 方向を平均するので、入り込むのは差の半分だけです。',
  'learning.concept.timesync.q3.prompt':
    'あるやりとりで遅延 40 ms が測れました。行きと帰りの内訳はまったくわかりません。オフセットは最大でどれだけずれ得る？',
  'learning.concept.timesync.q3.a': '最大 20 ms（遅延の半分）',
  'learning.concept.timesync.q3.b': '最大 40 ms（遅延そのもの）',
  'learning.concept.timesync.q3.c': '上限はまったくない',
  'learning.concept.timesync.q3.why':
    '最悪なのは 40 ms がすべて片方向のときで、誤差は (40 − 0) / 2 = 20 ms です。だから NTP クライアントは遅延の小さいやりとりを信頼します。',
  'learning.concept.timesync.q3.b.why':
    '遅延がすべて片方向でも、オフセットに入るのは差の半分なので 20 ms です。',
  'learning.concept.timesync.q3.c.why':
    '2 方向の合計は測った遅延に等しいので、偏りの大きさには上限があります。遅延の半分です。',
  'learning.concept.timesync.q4.prompt':
    'ハードウェアタイムスタンプの PTP が 1 台のスイッチを通ります。Sync はキューで 400 µs、Delay_Req は 20 µs 待ち、ファイバは行きと帰りで同じです。スイッチはトランスペアレントクロックです。キューのせいで残る誤差は？',
  'learning.concept.timesync.q4.a': '約 190 µs（待ち時間の差の半分）',
  'learning.concept.timesync.q4.b': 'なし（スイッチが待ち時間を伝える）',
  'learning.concept.timesync.q4.c': '約 10 µs（Delay_Req の待ちの半分）',
  'learning.concept.timesync.q4.why':
    'トランスペアレントクロックは各メッセージの滞留時間を correctionField に足し、スレーブがそれを差し引くので、どちらの待ち時間も消えます。残るのはファイバの長さのちがいなど、スイッチの外の偏りだけです。',
  'learning.concept.timesync.q4.a.why':
    'それは普通のスイッチの場合で、(400 − 20) / 2 µs です。トランスペアレントクロックはこれを取り除きます。',
  'learning.concept.timesync.q4.c.why':
    'Delay_Req の待ち時間も Sync と同じように補正されるので、どちらも残りません。',
};
