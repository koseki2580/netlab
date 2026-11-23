import type { Catalog } from '../../../../types';

/** The `pim` deck's questions (ja); its name is in the core chunk. */
export const pim: Catalog = {
  'learning.concept.pim.q1.prompt':
    '送信元は R1 の先にあり、RP は R3 です。R5・R6・R7 がすべて送信元ツリーに切り替えました。まだ R3 を通っているのは、どの受信者の通信？',
  'learning.concept.pim.q1.a': '3 つとも（(S,G) の通信は必ず RP を通る）',
  'learning.concept.pim.q1.b': 'どれも通らない（送信元ツリーは RP を通らない）',
  'learning.concept.pim.q1.c': 'R6 だけ（R1 からの最短経路が R3 を通る）',
  'learning.concept.pim.q1.why':
    '各ラストホップルータは、自分の最短経路に沿って送信元へ Join します。R5 と R7 は R4 経由、R6 は R2 と R3 経由です。RP のルータをたまたま通るのは R6 の経路だけです。',
  'learning.concept.pim.q1.a.why':
    '切り替え後、各受信者には送信元からの最短経路で通信が届きます。その経路に RP があるのはたまたまです。',
  'learning.concept.pim.q1.b.why':
    '送信元ツリーは RP を気にしませんが、RP のルータを通ることはあります。R1 から R6 への最短経路は R1–R2–R3–R6 です。',
  'learning.concept.pim.q2.prompt':
    'R5 は送信元ツリーに参加していて、送信元への最短経路は R4 経由です。グループの通信のコピーが R3 から R5 に届きました。R5 はどうする？',
  'learning.concept.pim.q2.a': 'PIM の隣接ルータから来たので転送する',
  'learning.concept.pim.q2.b': 'RPF チェックに通らないので捨てる',
  'learning.concept.pim.q2.c': 'R4 からのコピーが先に来ていなければ転送する',
  'learning.concept.pim.q2.why':
    'R5 は R4 経由で R1 へ向かうので、グループの通信は R4 からだけ受け入れます。各ルータがちょうど 1 つの隣からだけ受け取ることで、R3–R5–R4–R7 の輪をコピーが回り続けるのを防いでいます。',
  'learning.concept.pim.q2.a.why':
    '隣接しているだけでは足りません。R5 が受け入れるのは、自分から送信元へ戻る経路上の 1 つの隣からだけです。',
  'learning.concept.pim.q2.c.why':
    'RPF は早い者勝ちではありません。受け入れるインタフェースは送信元へのユニキャスト経路で決まるので、R3 からのコピーは何が先に来ても捨てられます。',
  'learning.concept.pim.q3.prompt':
    'RP を R6 に移しました。R1 がまだ最初のパケットを Register メッセージに入れて RP へ送っている間、それらは R5 にどう届く？',
  'learning.concept.pim.q3.a': 'これまでどおり最短経路の R1→R4→R5',
  'learning.concept.pim.q3.b': 'R6 まで上ってから R3 経由で下りる',
  'learning.concept.pim.q3.c': 'R6 は行き止まりなので R1→R2→R3→R5',
  'learning.concept.pim.q3.why':
    'Register は RP 宛てのユニキャストで R1–R2–R3–R6 と進み、R6 がカプセルを外して共有ツリーを R6–R3–R5 と下ろすので 13 ms かかり、送信元ツリーの 5 ms より遅くなります。受信者の経路から外れた RP は、切り替えまで遅延を増やします。',
  'learning.concept.pim.q3.a.why':
    'それは送信元ツリーです。切り替え前は、通信は RP から共有ツリーを下ってしか受信者に届きません。',
  'learning.concept.pim.q3.c.why':
    'Register は RP そのもの宛てなので、R3 は中継するだけです。R6 がカプセルを外して共有ツリーへ戻すまで R5 には届きません。',
  'learning.concept.pim.q4.prompt':
    '受信者が SSM で 232.1.1.1 に参加し、IGMPv3 で送信元 10.1.1.10 を指定しました。ASM（任意送信元マルチキャスト）と比べて何が変わる？',
  'learning.concept.pim.q4.a': '最初から送信元ツリーができ、RP はまったく使わない',
  'learning.concept.pim.q4.b': 'RP は使うが、最初のパケットのときだけ',
  'learning.concept.pim.q4.c': '全ルータへ流し、不要なルータが Prune する',
  'learning.concept.pim.q4.why':
    '受信者が送信元を指定するので、そのルータはまっすぐ送信元へ Join します。(S,G) のツリーが最初からでき、RP も共有ツリーもありません。',
  'learning.concept.pim.q4.b.why':
    'それは ASM の切り替え前の動きです。SSM では受信者がすでに送信元を指定しているので、送信元を見つけるための RP は要りません。',
  'learning.concept.pim.q4.c.why':
    'フラッドしてから Prune するのは PIM-DM（デンスモード）です。SSM は指定した送信元に向けて Join を送るので、通信が流れるのはツリーのリンクだけです。',
};
