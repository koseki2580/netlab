import type { Catalog } from '../../../../types';

/** The `l4s` deck's questions (ja); its name is in the core chunk. */
export const l4s: Catalog = {
  'learning.concept.l4s.q1.prompt':
    'クラシック TCP の送信側が、深いバッファ（1 往復分のパケット）を持つボトルネックを共有します。結果はどうなりますか？',
  'learning.concept.l4s.q1.a': '低遅延になる。半減するたびにキューが空になるため',
  'learning.concept.l4s.q1.b': '回線はほぼ埋まるが、遅延はバッファ上限まで伸びる',
  'learning.concept.l4s.q1.c': '回線が遊ぶ。深いバッファが全パケットを遅らせるため',
  'learning.concept.l4s.q1.why':
    'クラシック TCP はドロップが起きるまでウィンドウを増やし続け、ドロップはバッファが満杯になって初めて起きます。そのため深いバッファでは回線は埋まりますが、キューと遅延はバッファ全体まで伸びます（バッファブロート）。',
  'learning.concept.l4s.q1.a.why':
    '半減するのはバッファがあふれた後です。ドロップの直前にはキューがすでにバッファを埋めており、遅延は最大になっています。',
  'learning.concept.l4s.q1.c.why':
    'バッファはパケットを溜めるだけで、回線を遅くはしません。深いバッファなら回線はほぼ常に使われています。',
  'learning.concept.l4s.q2.prompt':
    '同じクラシック TCP の送信側で、バッファを浅くすると何が変わりますか？',
  'learning.concept.l4s.q2.a': '両方よくなる。低遅延で回線も埋まる',
  'learning.concept.l4s.q2.b': '何も変わらない。送信側がどのバッファにも適応する',
  'learning.concept.l4s.q2.c': '遅延は低いままだが、回線が一部遊ぶ',
  'learning.concept.l4s.q2.why':
    'バッファが小さいとキューも遅延も短く保たれますが、半減するたびに送信量が回線容量を下回り、増え戻るまで回線が遊びます。この例では回線の約 85 % しか使われません。',
  'learning.concept.l4s.q2.a.why':
    '浅いバッファは早くあふれ、半減でウィンドウが回線容量を下回るので、しばらく回線が遊びます。',
  'learning.concept.l4s.q2.b.why':
    'クラシック TCP はドロップにしか反応しないため、バッファの大きさがトレードオフの落としどころを決めます。利用率は約 97 % から 85 % に落ちます。',
  'learning.concept.l4s.q3.prompt': 'L4S の送信側は、送信を減らすべきことをどうやって知りますか？',
  'learning.concept.l4s.q3.a': 'キューが小さなしきい値を超えた時点で CE マークが付く',
  'learning.concept.l4s.q3.b': 'バッファがあふれたときにパケットが 1 つドロップされる',
  'learning.concept.l4s.q3.c': 'ルータがボトルネックの正確な空き容量を教えてくれる',
  'learning.concept.l4s.q3.why':
    'L4S のパケットは ECT(1) を持ち、ルータはキューが浅いしきい値（この例では 5 パケット = 1 ms）を超えた時点で CE マークを付けます。送信側はドロップよりずっと前に知らされます。',
  'learning.concept.l4s.q3.b.why':
    'それはクラシック TCP の知り方で、バッファが満杯になってからの遅い合図です。このレッスンの L4S 送信側は 1 パケットも失いません。',
  'learning.concept.l4s.q3.c.why':
    'ルータは容量を通知しません。L4S は送信済みパケットに付く CE マークで合図し、それが ACK で送信側へ返されます。',
  'learning.concept.l4s.q4.prompt':
    'L4S の送信側が、自分のパケットの一部にマークが付いたことを知りました。どう反応しますか？',
  'learning.concept.l4s.q4.a': 'ドロップ時のクラシック TCP と同じくウィンドウを半減する',
  'learning.concept.l4s.q4.b': 'ルータのキューが空になるまで送信を止める',
  'learning.concept.l4s.q4.c': 'マークされた数に比例して送信を減らす',
  'learning.concept.l4s.q4.why':
    'DCTCP や Prague と同じく、マークされた割合に応じた分だけウィンドウを減らします。マークが少なければ減らす量も少しです。小さく早い減速を重ねることで、キューを短く保ちつつ回線を埋め続けます。',
  'learning.concept.l4s.q4.a.why':
    '合図のたびに半減すると回線が遊んでしまいます。L4S はマークに応じたごく一部だけを減らすので、回線は埋まったままです。',
  'learning.concept.l4s.q4.b.why':
    '止めれば回線が遊びます。送信側は少しだけ減らして送り続け、この例では回線を 100 % 使っています。',
};
