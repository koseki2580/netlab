import type { Catalog } from '../../../../types';

/** The `happyeyeballs` deck's questions (ja); its name is in the core chunk. */
export const happyeyeballs: Catalog = {
  'learning.concept.happyeyeballs.q1.prompt':
    'デュアルスタックのノート PC が AAAA と A の両方の応答を得ましたが、途中で IPv6 のパケットが黙って捨てられています。Happy Eyeballs v2 のブラウザがつながるのは…',
  'learning.concept.happyeyeballs.q1.a': 'IPv6 で、届くまで再送したあと',
  'learning.concept.happyeyeballs.q1.b': 'つながらない。先に IPv6 を無効にする必要がある',
  'learning.concept.happyeyeballs.q1.c': 'IPv4 で、開始から 250 ms 少々あと',
  'learning.concept.happyeyeballs.q1.why':
    'まず IPv6 を試し、250 ms 以内につながらなければ IPv4 も並行して始めます。IPv4 は 1 往復後、約 280 ms でつながります。',
  'learning.concept.happyeyeballs.q2.prompt':
    'IPv6 は使えますが 1 往復に 300 ms かかり、IPv4 は 30 ms です。Happy Eyeballs v2 のクライアントが最終的に使うのは…',
  'learning.concept.happyeyeballs.q2.a': 'IPv4。280 ms で IPv6 より先につながる',
  'learning.concept.happyeyeballs.q2.b': 'IPv6。優先されるので 300 ms でつながる',
  'learning.concept.happyeyeballs.q2.c': 'IPv4。両方同時に始めるので 30 ms',
  'learning.concept.happyeyeballs.q2.why':
    '250 ms の時点で IPv6 がつながっていないので IPv4 を始め、250 + 30 = 280 ms でつながります。IPv6 の 300 ms より早く、先につながった方が使われます。',
  'learning.concept.happyeyeballs.q3.prompt':
    'IPv6 が黙って壊れているとき、アドレスを 1 つずつ（IPv6、次に IPv4）試すクライアントがつながるのは約…',
  'learning.concept.happyeyeballs.q3.a': '280 ms 後。Happy Eyeballs と同じ',
  'learning.concept.happyeyeballs.q3.b': '21 秒後。IPv6 がタイムアウトしてから',
  'learning.concept.happyeyeballs.q3.c': '30 ms 後。IPv4 のほうが速いので',
  'learning.concept.happyeyeballs.q3.why':
    'IPv4 を試す前に IPv6 の試行がタイムアウトするのを待ちます。Windows の既定の接続タイムアウトでは 3 + 6 + 12 = 21 秒で、これが Happy Eyeballs が生まれた理由です。',
  'learning.concept.happyeyeballs.q4.prompt':
    'IPv6 だけのネットワークにいるスマートフォンが、アドレスが 192.0.2.33 しかないサイトを引きます。DNS64 リゾルバが返すのは…',
  'learning.concept.happyeyeballs.q4.a': 'A レコード。スマートフォンは IPv4 でつなぐ',
  'learning.concept.happyeyeballs.q4.b': 'エラー。サイトに AAAA レコードがないため',
  'learning.concept.happyeyeballs.q4.c': 'その IPv4 を埋め込んだ AAAA（64:ff9b::c000:221）',
  'learning.concept.happyeyeballs.q4.why':
    'DNS64 は IPv4 アドレスを 64:ff9b::/96 の下位 32 ビットに入れて AAAA を作ります。出口の NAT64 がそれを取り出し、パケットを IPv4 で送ります。',
  'learning.concept.happyeyeballs.q1.a.why':
    'IPv6 が壊れていることを知らせる応答は返ってこないので、再送しても無駄です。ブラウザは待たずに IPv4 を並行して試します。',
  'learning.concept.happyeyeballs.q1.b.why':
    'それこそ Happy Eyeballs が解決する問題です。利用者は何も変えず、1 秒もかからず IPv4 に切り替わります。',
  'learning.concept.happyeyeballs.q2.b.why':
    '優先度が決めるのはどちらを先に始めるかだけです。IPv4 は 250 ms 後に始まって 280 ms でつながり、IPv6 の 300 ms より早く終わります。',
  'learning.concept.happyeyeballs.q2.c.why':
    '両方を同時には始めません。IPv4 は 250 ms の Connection Attempt Delay を待つので、つながるのは 30 ms ではなく 280 ms です。',
  'learning.concept.happyeyeballs.q3.a.why':
    'IPv6 の結果を待たずに IPv4 を始めるのは Happy Eyeballs だけです。このクライアントは死んだ IPv6 の試行がタイムアウトするまで待ちます。',
  'learning.concept.happyeyeballs.q3.c.why':
    'IPv4 は試せば速いのですが、このクライアントが試すのは IPv6 をあきらめた後、約 21 秒後です。',
  'learning.concept.happyeyeballs.q4.a.why':
    'IPv6 だけのスマートフォンには使える IPv4 がありません。DNS64 は NAT64 経由でサイトに届く IPv6 アドレスを渡します。',
  'learning.concept.happyeyeballs.q4.b.why':
    '無い AAAA を作り出すのがまさに DNS64 の役目です。エラーを返したら IPv4 だけのサイトに届かなくなります。',
};
