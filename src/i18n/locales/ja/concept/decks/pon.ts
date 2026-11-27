import type { Catalog } from '../../../../types';

/** The `pon` deck's questions (ja); its name is in the core chunk. */
export const pon: Catalog = {
  'learning.concept.pon.q1.prompt':
    'XGS-PON のポート（下りの回線速度 9.95 Gb/s）が 1:32 のスプリッタにつながっています。その先の 32 軒はどれも「10 Gb/s」のプランで、一斉に全力でダウンロードします。1 軒が下りで得られるのは最大どれくらい？',
  'learning.concept.pon.q1.a': '約 9.95 Gb/s（各家に専用のファイバがある）',
  'learning.concept.pon.q1.b': '約 1 Gb/s（スプリッタが各ポートを制限する）',
  'learning.concept.pon.q1.c': '約 311 Mb/s（1 つの流れを 32 軒で分ける）',
  'learning.concept.pon.q1.why':
    'スプリッタは OLT の 9.95 Gb/s の下り 1 本をすべての家へ届けるので、同時に使う 32 軒で分け合います。9953.28 ÷ 32 = 311.04 Mb/s です（フレーム化や FEC の分でさらに少し減ります）。',
  'learning.concept.pon.q1.a.why':
    '家ごとに分かれているのはスプリッタから先だけです。OLT までのファイバと回線速度は、スプリッタの先の全員で共有します。',
  'learning.concept.pon.q1.b.why':
    'スプリッタはただのガラスで、速度の上限を持ちません。上限は共有の回線速度を同時に使う家の数で割ったものです。',
  'learning.concept.pon.q2.prompt':
    '下りでは、スプリッタが OLT の光を、つまりすべてのフレームを、すべての ONU に届けます。隣の家の通信を読めないのはなぜ？',
  'learning.concept.pon.q2.a': '下りが ONU ごとの鍵で暗号化されているから',
  'learning.concept.pon.q2.b': 'スプリッタが各家に自分あてのフレームだけ送るから',
  'learning.concept.pon.q2.c': '家ごとに別の波長で受信しているから',
  'learning.concept.pon.q2.why':
    'どの ONU もすべてを受け取り、自分の ID あてのフレームだけを残します。改造した ONU なら残りも取っておけるので、GPON や XGS-PON は下りのユニキャスト通信を ONU ごとの鍵で暗号化（AES-128）します。',
  'learning.concept.pon.q2.b.why':
    'パッシブなスプリッタはフレームを見られません。光を、そのすべてを、各出力に分けるだけです。',
  'learning.concept.pon.q2.c.why':
    'GPON や XGS-PON の下りは全員に 1 つの波長です。家ごとに波長を分けるのは WDM-PON という別の方式です。',
  'learning.concept.pon.q3.prompt':
    '1:64 の分岐（21 dB）、ファイバ 20 km（7 dB）、コネクタ 4 個（2 dB）で合計 30 dB です。XGS-PON のクラス N1 は OLT と ONU の間で 14〜29 dB を許します。これはどういうこと？',
  'learning.concept.pon.q3.a': '問題ない（スプリッタの損失は数えない）',
  'learning.concept.pon.q3.b': '1 dB 超過（N2 など上限 31 dB のクラスを使う）',
  'learning.concept.pon.q3.c': '収まる（クラスが制限するのはファイバ長だけ）',
  'learning.concept.pon.q3.why':
    'クラスは OLT から ONU までの損失全体の範囲です。30 dB は N1 の 29 dB を 1 dB 超えるので、設備を変える（分岐を減らす、距離を縮める）か、クラス N2（16〜31 dB）の強い光モジュールを使います。',
  'learning.concept.pon.q3.a.why':
    'スプリッタはたいてい設備の中で最大の損失で、ファイバやコネクタと同じくバジェットに含まれます。',
  'learning.concept.pon.q3.c.why':
    'クラスは距離ではなく dB の損失の範囲です。スプリッタ、ファイバ、コネクタのすべてが数えられます。',
  'learning.concept.pon.q4.prompt':
    '上りでは、すべての ONU が同じ波長で 1 本のファイバに送り、ONU どうしはお互いの送信を聞けません。同時に送ってしまわないのはなぜ？',
  'learning.concept.pon.q4.a': '各 ONU が空いているのを確かめてから送るから',
  'learning.concept.pon.q4.b': '各 ONU が別の波長で送るから',
  'learning.concept.pon.q4.c': 'OLT が各 ONU に送ってよい時間を割り当てるから',
  'learning.concept.pon.q4.why':
    '上りは TDMA です。OLT が 125 µs ごとのフレームの中で各 ONU のバーストの始まりと終わりを指示し、DBA が ONU から報告された待ち行列をもとに割り当ての大きさを決めます。',
  'learning.concept.pon.q4.a.why':
    'ONU の光は OLT へ上るだけなので、ほかの ONU が送っているかどうかは聞こえません。確かめてから送ることはできません。',
  'learning.concept.pon.q4.b.why':
    'GPON や XGS-PON では、どの ONU も同じ上りの波長を使います。波長を分けるのは WDM-PON です。',
};
