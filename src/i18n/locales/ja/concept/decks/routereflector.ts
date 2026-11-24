import type { Catalog } from '../../../../types';

/** The `routereflector` deck's questions (ja); its name is in the core chunk. */
export const routereflector: Catalog = {
  'learning.concept.routereflector.q1.prompt':
    'iBGP をフルメッシュで組んでいる AS が、ルータ 10 台から 20 台に増えました。必要な iBGP セッションはいくつになる？',
  'learning.concept.routereflector.q1.a': '40（前の 2 倍）',
  'learning.concept.routereflector.q1.b': '190（前の約 4 倍）',
  'learning.concept.routereflector.q1.c': '380（向きごとに 1 本）',
  'learning.concept.routereflector.q1.why':
    'どの 2 台の組にも専用のセッションが要るので、20 × 19 ÷ 2 = 190 です。10 台なら 10 × 9 ÷ 2 = 45 でした。数はルータ台数の 2 乗で増えます。',
  'learning.concept.routereflector.q1.a.why':
    '台数を 2 倍にすると組の数は 2 倍より多く増えます。新しいルータは、すでにいるすべてのルータとセッションを張るからです。',
  'learning.concept.routereflector.q1.c.why':
    '1 本の TCP セッションで両方向の UPDATE を運ぶので、1 組に要るのは 1 本です。',
  'learning.concept.routereflector.q2.prompt':
    '3 台のルータに iBGP セッションは A–B と B–C だけがあり、B は普通の iBGP ルータです。A が eBGP の相手からプレフィックスを学びました。C はそれを知ることができる？',
  'learning.concept.routereflector.q2.a': 'できる（B がほかの経路と同じく渡す）',
  'learning.concept.routereflector.q2.b': 'できる（AS_PATH に B の AS が加わる）',
  'learning.concept.routereflector.q2.c': 'できない（iBGP で学んだ経路は iBGP の相手に渡さない）',
  'learning.concept.routereflector.q2.why':
    'iBGP の相手から学んだ経路は、別の iBGP の相手には広告しません（RFC 4271 §9.2）。AS の中では AS_PATH が伸びないので、この決まりがループを防いでいます。iBGP にフルメッシュかリフレクタが要るのはこのためです。',
  'learning.concept.routereflector.q2.a.why':
    'それは B が eBGP から学んだ経路の扱いです。iBGP で聞いた経路は B で止まります。',
  'learning.concept.routereflector.q2.b.why':
    '同じ AS の中のルータは AS_PATH に自分の AS を加えません。加えるのは eBGP のときだけです。そもそも B はこの経路を渡しません。',
  'learning.concept.routereflector.q3.prompt':
    'B を、A と C をクライアントに持つルートリフレクタにしました。B は A の経路を C へリフレクトします。C に見える NEXT_HOP はどれ？',
  'learning.concept.routereflector.q3.a': 'A の eBGP の相手のアドレスのまま',
  'learning.concept.routereflector.q3.b': 'リフレクタである B 自身のアドレス',
  'learning.concept.routereflector.q3.c': 'ORIGINATOR_ID に入った A のルータ ID',
  'learning.concept.routereflector.q3.why':
    'リフレクタは NEXT_HOP を変えずに経路を渡すので、C には A がこの経路を学んだ 198.51.100.1 が見え、C は IGP でそこへ届く必要があります。リフレクタ自身は転送の経路に入りません。',
  'learning.concept.routereflector.q3.b.why':
    'リフレクタは経路を中継するだけで NEXT_HOP には触れません。だから通信がリフレクタを通る必要はありません。',
  'learning.concept.routereflector.q3.c.why':
    'ORIGINATOR_ID はループに気づくための別の属性で、NEXT_HOP の代わりにはなりません。',
  'learning.concept.routereflector.q4.prompt':
    'クラスタ ID の異なる 2 台のリフレクタが、どちらもクライアント A を受け持っています。RR2 が、RR1 から受け取った A の経路を A へリフレクトし返しました。A はどうする？',
  'learning.concept.routereflector.q4.a': '予備の経路として持っておく',
  'learning.concept.routereflector.q4.b': '捨てる（ORIGINATOR_ID が自分のルータ ID）',
  'learning.concept.routereflector.q4.c': '捨てる（CLUSTER_LIST に A のクラスタ ID がある）',
  'learning.concept.routereflector.q4.why':
    'RR1 は最初にリフレクトしたとき、ORIGINATOR_ID に A のルータ ID を入れました。ルータは ORIGINATOR_ID が自分のルータ ID の経路を捨てるので、戻ってきたコピーは破棄されます。',
  'learning.concept.routereflector.q4.a.why':
    'このコピーをたどると A 自身に戻るだけです。持っておけばループになり、それを止めるのが ORIGINATOR_ID です。',
  'learning.concept.routereflector.q4.c.why':
    'CLUSTER_LIST を自分のクラスタ ID と照らすのはリフレクタです。A はクライアントでクラスタ ID を持たず、リストにあるのは RR2 と RR1 の ID です。',
};
