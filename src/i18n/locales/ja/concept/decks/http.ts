import type { Catalog } from '../../../../types';

/** The `http` deck's questions (ja); its name is in the core chunk. */
export const http: Catalog = {
  'learning.concept.http.q1.prompt': 'HTTP のモデルは？',
  'learning.concept.http.q1.a': '要求/応答',
  'learning.concept.http.q1.b': '発行/購読',
  'learning.concept.http.q1.c': 'ブロードキャスト',
  'learning.concept.http.q1.why':
    'クライアントが要求（メソッド + URL）を送り、サーバがステータスと本文を含む応答を返します。',
  'learning.concept.http.q2.prompt': '安全な読み取り専用 HTTP メソッドは？',
  'learning.concept.http.q2.a': 'POST',
  'learning.concept.http.q2.b': 'GET',
  'learning.concept.http.q2.c': 'DELETE',
  'learning.concept.http.q2.why':
    'GET は副作用なくリソースを取得します。POST/PUT/DELETE は状態を変更します。',
  'learning.concept.http.q3.prompt': 'HTTP 404 の意味は…',
  'learning.concept.http.q3.a': 'リクエストが成功した',
  'learning.concept.http.q3.b': 'サーバ側でエラーが起きた',
  'learning.concept.http.q3.c': 'リソースが見つからない',
  'learning.concept.http.q3.why':
    '4xx はクライアントエラーで、404 は要求リソースが存在しないこと（2xx 成功、5xx サーバエラー）。',
  'learning.concept.http.q1.b.why':
    'パブリッシュ/サブスクライブはメッセージング様式（MQTT など）です。HTTP はクライアント要求→サーバ応答のやり取りです。',
  'learning.concept.http.q1.c.why':
    'HTTP はブロードキャストではありません。クライアントが要求を送り、サーバがそのクライアントへ応答します。',
  'learning.concept.http.q2.a.why':
    'POST はデータを送信/作成しサーバ状態を変えます。安全で読み取り専用なのは GET です。',
  'learning.concept.http.q2.c.why':
    'DELETE はリソースを削除し読み取り専用ではありません。読み取りだけの安全なメソッドは GET です。',
  'learning.concept.http.q3.a.why':
    '成功は 2xx（例: 200）です。404 はリソースが見つからないことを示すクライアントエラーです。',
  'learning.concept.http.q3.b.why':
    'サーバエラーは 5xx（例: 500）です。404 はサーバエラーではなく 4xx のクライアントエラーです。',
};
