import type { Catalog } from '../../../../types';

/** The `http3` deck's questions (ja); its name is in the core chunk. */
export const http3: Catalog = {
  'learning.concept.http3.q1.prompt': 'HTTP/3 が動くのは…',
  'learning.concept.http3.q1.a': 'QUIC（UDP）',
  'learning.concept.http3.q1.b': '素の TCP の上',
  'learning.concept.http3.q1.c': 'ICMP の上',
  'learning.concept.http3.q1.why':
    'HTTP/3 は HTTP の意味を QUIC に載せます。QUIC は UDP 上でストリーム・信頼性・TLS を提供します。',
  'learning.concept.http3.q2.prompt': 'HTTP/3 が HTTP/2 に勝る点は…',
  'learning.concept.http3.q2.a': 'メタデータを多く運ぶためヘッダが大きい',
  'learning.concept.http3.q2.b': 'ストリーム間で TCP の HOL ブロッキングが無い',
  'learning.concept.http3.q2.c': '暗号化が無いぶん速くなる',
  'learning.concept.http3.q2.why':
    'QUIC のストリームは独立なので、1 つのパケット損失が TCP のように他を止めません。',
  'learning.concept.http3.q3.prompt': 'HTTP/3 のヘッダ圧縮は…',
  'learning.concept.http3.q3.a': 'HPACK',
  'learning.concept.http3.q3.b': 'gzip',
  'learning.concept.http3.q3.c': 'QPACK',
  'learning.concept.http3.q3.why':
    'QPACK は QUIC 向けに適応した HPACK で、ヘッダテーブル更新での HOL ブロッキングを避けます。',
  'learning.concept.http3.q1.b.why':
    '素の TCP は HTTP/1.1 と HTTP/2 です。HTTP/3 は UDP 上に構築された QUIC の上で動きます。',
  'learning.concept.http3.q1.c.why': 'ICMP は診断用です。HTTP/3 は QUIC（UDP）の上で動きます。',
  'learning.concept.http3.q2.a.why':
    'HTTP/3 はヘッダを小さく保ちます（QPACK）。利点はストリーム間の TCP の HOL ブロッキングの解消です。',
  'learning.concept.http3.q2.c.why':
    'HTTP/3 は QUIC/TLS 1.3 で常に暗号化されます。利点はストリーム間の TCP の HOL ブロッキングが無いことです。',
  'learning.concept.http3.q3.a.why':
    'HPACK は HTTP/2 のものです。HTTP/3 は QUIC の順不同配送に耐える QPACK を使います。',
  'learning.concept.http3.q3.b.why':
    'gzip は本文用です。HTTP/3 はヘッダを QPACK（QUIC 向けに適応した HPACK）で圧縮します。',
};
