import type { Catalog } from '../../../../types';

/** The `http2` deck's questions (ja); its name is in the core chunk. */
export const http2: Catalog = {
  'learning.concept.http2.q1.prompt': 'HTTP/2 が HTTP/1.1 を改善する主な点は…',
  'learning.concept.http2.q1.a': '1 接続で多数のリクエストを多重化',
  'learning.concept.http2.q1.b': 'IPsec でコネクションを暗号化する',
  'learning.concept.http2.q1.c': '下位に TCP でなく UDP を使う',
  'learning.concept.http2.q1.why':
    'HTTP/2 は多数の接続を開く代わりに、単一 TCP 接続上で並行ストリームを送ります。',
  'learning.concept.http2.q2.prompt': 'HTTP/2 のフレーミングは…',
  'learning.concept.http2.q2.a': 'プレーンテキスト行',
  'learning.concept.http2.q2.b': 'バイナリフレーム',
  'learning.concept.http2.q2.c': '固定 1500 バイトセル',
  'learning.concept.http2.q2.why':
    'HTTP/2 はテキストをやめ、ストリームを運ぶバイナリフレーミング層にし、解析を効率化します。',
  'learning.concept.http2.q3.prompt': 'HTTP/2 のヘッダ圧縮は…',
  'learning.concept.http2.q3.a': 'gzip',
  'learning.concept.http2.q3.b': '圧縮なし',
  'learning.concept.http2.q3.c': 'HPACK',
  'learning.concept.http2.q3.why':
    'HPACK は共有の動的テーブルで反復ヘッダを圧縮し、リクエストごとのオーバーヘッドを削減します。',
  'learning.concept.http2.q1.b.why':
    'HTTP/2 は IPsec を加えません。利点は多数のリクエストを 1 つの TCP 接続で多重化することです。',
  'learning.concept.http2.q1.c.why':
    'HTTP/2 は依然 TCP を使います（UDP は HTTP/3 の QUIC）。1 接続でストリームを多重化します。',
  'learning.concept.http2.q2.a.why':
    'プレーンテキスト行は HTTP/1.1 です。HTTP/2 は効率的なバイナリフレーミング層を使います。',
  'learning.concept.http2.q2.c.why':
    '固定 1500 バイトのセルは ATM/Ethernet の MTU を思わせます。HTTP/2 は可変長のバイナリフレームです。',
  'learning.concept.http2.q3.a.why':
    'gzip は本文を圧縮します。HTTP/2 のヘッダは専用の HPACK で圧縮します。',
  'learning.concept.http2.q3.b.why':
    'HTTP/2 はヘッダ（特に繰り返しの多いもの）を HPACK で圧縮します。',
};
