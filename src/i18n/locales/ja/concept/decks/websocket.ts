import type { Catalog } from '../../../../types';

/** The `websocket` deck's questions (ja); its name is in the core chunk. */
export const websocket: Catalog = {
  'learning.concept.websocket.q1.prompt':
    'ブラウザが 5 秒ごとにポーリングしていて、メッセージは予測できないタイミングで届きます。メッセージがポーリングに拾われるまで、サーバーで平均どれくらい待つ？',
  'learning.concept.websocket.q1.a': '約 2.5 秒（ポーリング間隔の半分）',
  'learning.concept.websocket.q1.b': '約 5 秒（ポーリング間隔まるごと）',
  'learning.concept.websocket.q1.c': 'ほぼ 0（ポーリングがすぐ取ってくる）',
  'learning.concept.websocket.q1.why':
    'メッセージは 2 回のポーリングの間のでたらめな時点に届き、次のポーリングを待ちます。待ちは 0 秒近くから 5 秒までで、平均 2.5 秒です（戻りの 25 ms を足すと 2,525 ms）。',
  'learning.concept.websocket.q1.b.why':
    '間隔まるごとは、ポーリングの直後に届いたメッセージの最悪の場合です。平均すると間隔の真ん中に届きます。',
  'learning.concept.websocket.q1.c.why':
    'ポーリングが取ってくるのはその時点で届いているものだけです。直後に届いたメッセージは次のポーリングまで待ちます。',
  'learning.concept.websocket.q2.prompt':
    '10 秒ごとのメッセージを 1 分間受け取ると、5 秒ごとのショートポーリングは 7,800 バイト、WebSocket は約 1,250 バイトです。WebSocket はどこで節約している？',
  'learning.concept.websocket.q2.a': 'HTTP/2 のように HTTP ヘッダーを圧縮する',
  'learning.concept.websocket.q2.b': 'メッセージが TCP を通らず IP で直接届く',
  'learning.concept.websocket.q2.c': '1 回のハンドシェイクの後はフレームで送る',
  'learning.concept.websocket.q2.why':
    'ショートポーリングは 12 回のやりとりのたびに約 600 バイトのヘッダーを払います。WebSocket は Upgrade のハンドシェイクを 1 回払えば、あとは小さなサーバーのフレームごとに 2 バイトのヘッダーだけです。',
  'learning.concept.websocket.q2.a.why':
    'WebSocket はヘッダーを圧縮しません。ハンドシェイクの後は、送るべき HTTP ヘッダーがそもそもありません。',
  'learning.concept.websocket.q2.b.why':
    'WebSocket はハンドシェイクと同じ TCP 接続の上で動きます。節約になるのは、HTTP のリクエストの代わりに小さなフレームを送るからです。',
  'learning.concept.websocket.q3.prompt':
    '100 バイトのメッセージをサーバーからクライアントへ、もう 1 つをクライアントからサーバーへ送ります。フレームのヘッダーはどうちがう？',
  'learning.concept.websocket.q3.a': 'ちがわない（どちらも 2 バイト）',
  'learning.concept.websocket.q3.b': 'クライアント側がマスク鍵の 4 バイト多い',
  'learning.concept.websocket.q3.c': 'クライアント側が長さ欄の 8 バイト多い',
  'learning.concept.websocket.q3.why':
    'RFC 6455 では、クライアントからサーバーへのフレームは必ず 4 バイトの鍵でマスクします。サーバーの 2 バイトに対して 6 バイトです。',
  'learning.concept.websocket.q3.a.why':
    '長さはどちらも 7 ビットに収まりますが、クライアントからのフレームには 4 バイトのマスク鍵も付きます。',
  'learning.concept.websocket.q3.c.why':
    '8 バイトの長さ欄は、どちらの向きでも 65,535 バイトを超えるペイロードのときだけ使います。100 バイトは 7 ビットに収まります。',
  'learning.concept.websocket.q4.prompt':
    '応答が返る前に接続が切れました。クライアントが自動で送り直してよいのはどれ？',
  'learning.concept.websocket.q4.a': 'POST /orders（注文する）',
  'learning.concept.websocket.q4.b': 'PATCH /points（5 ポイント加算）',
  'learning.concept.websocket.q4.c': 'PUT /profile/name（Aiko にする）',
  'learning.concept.websocket.q4.why':
    'PUT は冪等です（RFC 9110 §9.2.2）。2 回適用しても名前は Aiko のままで、最初の 1 回が届いていてもいなくても、サーバーは同じ状態になります。',
  'learning.concept.websocket.q4.a.why':
    'POST は冪等ではありません。最初の 1 回が届いていたなら、送り直すと注文がもう 1 件できます。',
  'learning.concept.websocket.q4.b.why':
    'PATCH は一般に冪等ではありません。この PATCH を 2 回適用すると、5 ポイントではなく 10 ポイント加算されます。',
};
