import type { Catalog } from '../../../../types';

/** The `cubic` deck's questions (ja); its name is in the core chunk. */
export const cubic: Catalog = {
  'learning.concept.cubic.q1.prompt':
    'Reno の送り手が 10 Gb/s・往復 100 ms の経路を埋めていて（送りっぱなしが 83,333 パケット）、パケットを 1 つ失いました。ウィンドウが戻るまでおよそどれくらい？',
  'learning.concept.cubic.q1.a': '数秒（半分にして、倍々で戻る）',
  'learning.concept.cubic.q1.b': '1 時間以上（1 往復に 1 パケットずつ）',
  'learning.concept.cubic.q1.c': '約 40 秒（CUBIC と同じ）',
  'learning.concept.cubic.q1.why':
    'Reno は 41,667 パケットに半減し、100 ms の 1 往復ごとに 1 パケットずつ増やすので、41,667 往復、約 69 分かかります。',
  'learning.concept.cubic.q1.a.why':
    '1 往復ごとに倍にするのはスロースタートです。高速リカバリの後の Reno は輻輳回避にいて、1 往復に 1 パケットしか増やしません。',
  'learning.concept.cubic.q1.c.why':
    '約 40 秒はこの経路での CUBIC の K です。Reno の増え方は往復の回数で数えるので、ウィンドウが大きいとずっと長くかかります。',
  'learning.concept.cubic.q2.prompt':
    '83,333 パケットのような大きなウィンドウの経路で、往復時間が長くても CUBIC が元のウィンドウに戻るのが遅くならないのはなぜ？',
  'learning.concept.cubic.q2.a': 'ウィンドウが損失からの時間の関数だから',
  'learning.concept.cubic.q2.b': '往復時間が長いと大きなパケットを送るから',
  'learning.concept.cubic.q2.c': '往復時間を測って増やす幅を合わせるから',
  'learning.concept.cubic.q2.why':
    'W(t) = 0.4·(t − K)³ + W_max の t は損失からの秒数で、K = ∛(W_max·0.3/0.4) に往復時間は入っていません。Reno は往復時間が長いほど戻るのに時間がかかります。',
  'learning.concept.cubic.q2.b.why':
    'パケットの大きさは経路の MTU で決まり、輻輳制御では変わりません。CUBIC が変えるのは送りっぱなしにするパケットの数です。',
  'learning.concept.cubic.q2.c.why':
    'CUBIC は 3 次曲線を往復時間で調整しません。曲線は時計の時間と W_max だけで決まります。だから往復時間が効かないのです。',
  'learning.concept.cubic.q3.prompt':
    '10 セグメントのうち最後の 2 つが失われ、SRTT は 50 ms です。RACK-TLP では、失われたデータを最初に送り直すのはいつ？',
  'learning.concept.cubic.q3.a': '約 1 秒後（最小の RTO が切れたとき）',
  'learning.concept.cubic.q3.b': '送り直さない（重複 ACK 3 つを待つ）',
  'learning.concept.cubic.q3.c': '150 ms 後（1 往復と 2 × SRTT のプローブ）',
  'learning.concept.cubic.q3.why':
    '届いたセグメントは 50 ms で ACK されますが、その後は何も来ず、2 × SRTT = 100 ms のプローブタイムアウトが 150 ms で切れます。プローブで最後のセグメントを送り直し、その SACK で RACK がもう 1 つもすぐ送り直します。',
  'learning.concept.cubic.q3.a.why':
    'それは TLP がない場合です（最初の再送は 1,050 ms）。プローブタイムアウトは RFC 6298 の最小 RTO 1 秒よりずっと短くなります。',
  'learning.concept.cubic.q3.b.why':
    '重複 ACK は穴の後に届いたセグメントからしか返りません。最後の部分が失われると 1 つも来ません。それを解決するのが TLP です。',
  'learning.concept.cubic.q4.prompt':
    '最後の部分をプローブではなく RTO で直した場合、送り手はどのウィンドウで続ける？',
  'learning.concept.cubic.q4.a': '1 セグメント（そこからまた増やす）',
  'learning.concept.cubic.q4.b': '損失前と同じウィンドウ',
  'learning.concept.cubic.q4.c': '高速リカバリ後と同じく 70% に減らす',
  'learning.concept.cubic.q4.why':
    '再送タイムアウトの後、RFC 5681 はウィンドウを 1 セグメント（loss window）にします。プローブで見つかった損失は高速リカバリで扱われ、CUBIC なら 10 のうち 7 が残ります。',
  'learning.concept.cubic.q4.b.why':
    'タイムアウトは TCP にとって最も強い輻輳の合図です。その後でウィンドウをそのままにすることはありません。',
  'learning.concept.cubic.q4.c.why':
    'その減らし方は、重複 ACK・SACK・プローブで見つかった損失の場合です。RTO では 1 セグメントからやり直します。',
};
