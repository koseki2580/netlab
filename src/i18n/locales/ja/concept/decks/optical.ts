import type { Catalog } from '../../../../types';

/** The `optical` deck's questions (ja); its name is in the core chunk. */
export const optical: Catalog = {
  'learning.concept.optical.q1.prompt':
    '送信 0 dBm、受信感度 −14 dBm の光モジュールの間に、0.35 dB/km のファイバ 30 km、0.1 dB の融着 5 か所、0.5 dB のコネクタ 2 つがあります。余裕はどれだけ残る？',
  'learning.concept.optical.q1.a': '14 dB（送信パワー − 受信感度）',
  'learning.concept.optical.q1.b': '残らない（2 dB 足りない）',
  'learning.concept.optical.q1.c': '2 dB（上がるが、余裕は薄い）',
  'learning.concept.optical.q1.why':
    '損失を足すと、ファイバ 10.5 dB、融着 0.5 dB、コネクタ 1 dB で合計 12 dB です。届くのは 0 − 12 = −12 dBm で、必要な −14 dBm より 2 dB 上です。上がりますが、設計で取りたい 3 dB には届きません。',
  'learning.concept.optical.q1.a.why':
    '14 dB はパワーバジェット、つまり失ってよい量です。余裕は、そこからファイバ・融着・コネクタの 12 dB を引いた残りです。',
  'learning.concept.optical.q1.b.why':
    '受信した −12 dBm は受信感度 −14 dBm より下ではなく上です。dBm は負の値なので、−12 のほうが強い信号です。',
  'learning.concept.optical.q2.prompt':
    '同じ 30 km のリンクを、送信パワーと受信感度が同じ 1550 nm の光モジュールで組むと、余裕が 2 dB から 5 dB に増えます。なぜ？',
  'learning.concept.optical.q2.a': '1550 nm ではガラスの 1 km あたりの損失が小さいから',
  'learning.concept.optical.q2.b': '波長が長いほど光のパワーが大きいから',
  'learning.concept.optical.q2.c': '1550 nm ではコネクタの損失が小さいから',
  'learning.concept.optical.q2.why':
    'シングルモードファイバの損失は、代表値で 1310 nm が約 0.35 dB/km、1550 nm が約 0.25 dB/km です。30 km では 10.5 dB が 7.5 dB になり、余裕が 3 dB 増えます。',
  'learning.concept.optical.q2.b.why':
    'どちらも送信は同じ 0 dBm です。波長はパワーを足すのではなく、ガラスがどれだけ吸収・散乱するかを変えます。',
  'learning.concept.optical.q2.c.why':
    '2 つのコネクタはどちらでも同じ 1 dB です。3 dB の差はすべてファイバの分です。',
  'learning.concept.optical.q3.prompt':
    '10GBASE-SR の光モジュールを OM3 マルチモードファイバ 500 m でつなぎました。損失は 2.5 dB だけで、バジェットに十分収まります。リンクは使える？',
  'learning.concept.optical.q3.a': '使えない（500 m のマルチモードは損失が大きすぎる）',
  'learning.concept.optical.q3.b': '使えない（パワーは足りるが、300 m の到達距離を超える）',
  'learning.concept.optical.q3.c': '使える（余裕がまだ 6 dB 以上ある）',
  'learning.concept.optical.q3.why':
    'マルチモードファイバでは光が長さの違う多くの経路を通り（モード分散）、パルスがにじみます。10GBASE-SR は OM3 で 300 m までと規定されていて、それを超えると届く光の強さにかかわらず誤りが増えます。',
  'learning.concept.optical.q3.a.why':
    'パワーは足りています。損失 2.5 dB なら余裕は 6 dB 以上あります。だめになるのはパルスの強さではなく形です。',
  'learning.concept.optical.q3.c.why':
    '余裕が示すのは、十分な光が届くことだけです。規定の距離を超えると分散でビットがにじみ、それはパワーバジェットには表れません。',
  'learning.concept.optical.q4.prompt':
    'ITU-T G.694.1 の 100 GHz グリッドで、C バンドを 1530〜1565 nm とすると、DWDM のチャネルはだいたい何チャネル入る？',
  'learning.concept.optical.q4.a': '約 350（0.1 nm ごとに 1 つ）',
  'learning.concept.optical.q4.b': '約 2（20 nm ごとに 1 つ）',
  'learning.concept.optical.q4.c': '約 44（0.8 nm ごとに 1 つ）',
  'learning.concept.optical.q4.why':
    '1565 nm は 191.56 THz、1530 nm は 195.94 THz です。その間の 100 GHz おきのグリッド点 191.6〜195.9 THz は 44 チャネルです。1550 nm 付近で 100 GHz は 0.8 nm にあたります。',
  'learning.concept.optical.q4.a.why':
    '100 GHz は周波数の間隔で、0.1 nm ではありません。1550 nm 付近では約 0.8 nm なので、35 nm の帯域に入るのは約 44 です。',
  'learning.concept.optical.q4.b.why':
    '20 nm は CWDM の間隔です（ITU-T G.694.2）。DWDM は 100 GHz なら 0.8 nm おきにチャネルを詰めます。',
};
