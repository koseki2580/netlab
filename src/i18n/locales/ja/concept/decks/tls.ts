import type { Catalog } from '../../../../types';

/** The `tls` deck's questions (ja); its name is in the core chunk. */
export const tls: Catalog = {
  'learning.concept.tls.q1.prompt': 'TLS が提供するのは…',
  'learning.concept.tls.q1.a': '異なるネットワーク間のルーティング',
  'learning.concept.tls.q1.b': '暗号化・完全性・サーバ認証',
  'learning.concept.tls.q1.c': 'クライアントへの IP アドレス割り当て',
  'learning.concept.tls.q1.why':
    'TLS はトランスポート接続を保護します — データを暗号化し、改ざんを検知し、証明書でサーバを認証します。',
  'learning.concept.tls.q2.prompt': 'ハンドシェイク中、サーバが身元を証明するのは…',
  'learning.concept.tls.q2.a': '提示する MAC アドレス',
  'learning.concept.tls.q2.b': 'セッションの VLAN タグ',
  'learning.concept.tls.q2.c': 'X.509 証明書',
  'learning.concept.tls.q2.why':
    'クライアントが信頼する CA が署名した証明書が、サーバ名とその公開鍵を結びつけます。',
  'learning.concept.tls.q3.prompt': 'TLS が動作するのは…',
  'learning.concept.tls.q3.a': '信頼できるトランスポート（TCP）の上',
  'learning.concept.tls.q3.b': 'IP よりも下の層で動作',
  'learning.concept.tls.q3.c': 'イーサネットの代わりとして',
  'learning.concept.tls.q3.why':
    'TLS は順序通りで信頼できるバイトストリームを前提とするため TCP の上に乗ります（QUIC は独自に提供）。',
  'learning.concept.tls.q1.a.why':
    'ルーティングは IP（L3）の仕事です。TLS は TCP の上に暗号化・完全性・サーバ認証を加えます。',
  'learning.concept.tls.q1.c.why':
    'アドレス割り当ては DHCP です。TLS は暗号化・完全性・認証でセッションを保護します。',
  'learning.concept.tls.q2.a.why':
    'MAC は偽装も容易な L2 のハードウェアアドレスにすぎません。TLS の身元は X.509 証明書で証明します。',
  'learning.concept.tls.q2.b.why':
    'VLAN タグは L2 トラフィックを分けるもので身元とは無関係です。TLS は X.509 証明書を使います。',
  'learning.concept.tls.q3.b.why':
    'TLS は IP の下ではなくトランスポートの上にあり、下に TCP のような信頼できるバイトストリームを必要とします。',
  'learning.concept.tls.q3.c.why':
    'TLS はイーサネット（L2）を置き換えません。TCP のような信頼できるトランスポートの上に重なります。',
};
