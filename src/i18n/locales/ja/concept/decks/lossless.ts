import type { Catalog } from '../../../../types';

/** The `lossless` deck's questions (ja); its name is in the core chunk. */
export const lossless: Catalog = {
  'learning.concept.lossless.q1.prompt':
    '8 台のサーバがそれぞれ 64 フレームを同時に、160 フレーム分のバッファを持つスイッチのポートの先にある 1 台へ送ります。スイッチは普通の Ethernet です。何が起きる？',
  'learning.concept.lossless.q1.a': '何も失われない（すべて待ち行列に入る）',
  'learning.concept.lossless.q1.b': '最初の数フレームだけが失われる',
  'learning.concept.lossless.q1.c': '約半分がテールドロップ（512 中 257）',
  'learning.concept.lossless.q1.why':
    'フレームはポートが送り出せる速さの約 8 倍で届くので、数十フレーム時間でバッファが埋まります。その後は、ポートが 1 フレーム送り出して空いた 1 つ分しか入れず、残りは送り手が送り終えるまで捨てられます。512 フレーム中 257 フレームです。',
  'learning.concept.lossless.q1.a.why':
    '512 フレームは 160 に入りきりません。ポートは 1 フレーム時間に 1 フレームしか出せないのに、8 フレームずつ届きます。',
  'learning.concept.lossless.q1.b.why':
    '最初のフレームこそバッファに入る分です。ドロップはバッファが埋まってから始まり、バーストが続く間ずっと続きます。',
  'learning.concept.lossless.q2.prompt':
    'PFC を有効にするとドロップはなくなりました。ところが、空いたポート宛てなのにインキャストの送り手の 1 台とリンクを共有する通信 V が遅くなります。なぜ？',
  'learning.concept.lossless.q2.a': 'PAUSE は 1 つの通信ではなく、リンク上の優先度全体を止めるから',
  'learning.concept.lossless.q2.b': '空いたポートのバッファもあふれるから',
  'learning.concept.lossless.q2.c': 'インキャストの場所を空けるため V のフレームを捨てるから',
  'learning.concept.lossless.q2.why':
    'PFC はリンクを優先度ごとに止めます。V は止められた送り手とリンクも優先度も同じなので、自分の宛先ポートは空いていても一緒に止まります。これがヘッドオブラインブロッキングで、レッスンでは V は 350 回の送信機会のうち 174 回しか送れませんでした。',
  'learning.concept.lossless.q2.b.why':
    'V の宛先ポートは空いたままです。V はスイッチに着く前、止められたリンクの上で待たされています。',
  'learning.concept.lossless.q2.c.why':
    'PFC では何も捨てられません。V は捨てられるのではなく、そのリンクの同じ優先度の通信と一緒に止められます。',
  'learning.concept.lossless.q3.prompt':
    '送り手までのケーブルを 96 m から 192 m にし、PFC のヘッドルームはポートごとに 10 フレームのままにしました。何が起きる？',
  'learning.concept.lossless.q3.a': '何も変わらない（ヘッドルームはリンク速度だけで決まる）',
  'learning.concept.lossless.q3.b': 'PFC があってもフレームが捨てられる',
  'learning.concept.lossless.q3.c': 'PFC が止める回数が減る',
  'learning.concept.lossless.q3.why':
    'ヘッドルームは、PAUSE が送り手へ向かい、最後のフレームが戻ってくるまでの間にケーブル上にあるフレームを受け止めます。目安は 2 × 速度 × ケーブルの遅延 + 2 × MTU で、192 m なら 18 フレームです。10 フレームしかないと、レッスンでは 65 フレームが捨てられます。',
  'learning.concept.lossless.q3.a.why':
    '式にはケーブルの遅延が入っています。ケーブルが長いほど、PAUSE を送ったあとにも届くフレームが増えます。',
  'learning.concept.lossless.q3.c.why':
    'ケーブルの長さでバッファが埋まる速さは変わりません。変わるのは PAUSE を送ったあとに届く量です。',
  'learning.concept.lossless.q4.prompt':
    'PFC に加えて ECN のマーク（送り手は DCQCN 風にレートを下げる）を使います。何が変わる？',
  'learning.concept.lossless.q4.a': 'PFC が止める前に送り手が減速する',
  'learning.concept.lossless.q4.b': '捨てられたフレームが早く再送される',
  'learning.concept.lossless.q4.c': 'PAUSE フレームが早く送り手に届く',
  'learning.concept.lossless.q4.why':
    'スイッチは待ち行列が短いうちにフレームに印を付け、送り手がレートを下げるので、バッファはめったに PAUSE の水準まで届きません。レッスンでは PFC が働いたのは 6 回ではなく 1 回で、V もほぼすべての送信機会を使えました。',
  'learning.concept.lossless.q4.b.why':
    'PFC があればそもそも捨てられません。ECN が変えるのは送信レートで、再送ではありません。',
  'learning.concept.lossless.q4.c.why':
    'ECN は PAUSE を速くするのではなく、送り手を早めに減速させて PAUSE をほとんど要らなくします。',
};
