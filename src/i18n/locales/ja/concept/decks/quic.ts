import type { Catalog } from '../../../../types';

/** The `quic` deck's questions (ja); its name is in the core chunk. */
export const quic: Catalog = {
  'learning.concept.quic.q1.prompt': 'QUIC が上に乗るのは…',
  'learning.concept.quic.q1.a': 'UDP',
  'learning.concept.quic.q1.b': 'TCP',
  'learning.concept.quic.q1.c': 'ICMP',
  'learning.concept.quic.q1.why':
    'QUIC は信頼性・順序・暗号を自前で実装し UDP の上に乗り、TCP の HOL ブロッキングとハンドシェイク遅延を避けます。',
  'learning.concept.quic.q2.prompt': 'QUIC の TCP+TLS に対する利点は…',
  'learning.concept.quic.q2.a': '暗号化を行わない分だけ軽い',
  'learning.concept.quic.q2.b': '接続確立が速い（1-RTT や 0-RTT）',
  'learning.concept.quic.q2.c': 'スループットが低いぶん安定する',
  'learning.concept.quic.q2.why':
    'QUIC はトランスポートと TLS のハンドシェイクを統合し、データ送出前の往復を削減します。',
  'learning.concept.quic.q3.prompt': 'QUIC が複数ストリームを持つ理由は…',
  'learning.concept.quic.q3.a': '接続ごとに1 要求しか入らない',
  'learning.concept.quic.q3.b': 'パケットが決して失われない',
  'learning.concept.quic.q3.c': '1 つのパケット損失が他ストリームを止めない',
  'learning.concept.quic.q3.why':
    '独立したストリームは、1 つの損失が全体を遅らせる TCP の HOL ブロッキングを回避します。',
  'learning.concept.quic.q1.b.why':
    'QUIC は HOL ブロッキングを避けるため意図的に TCP を使わず、UDP の上で動きます。',
  'learning.concept.quic.q1.c.why':
    'ICMP はデータ転送ではなく診断用です。QUIC は UDP の上に構築されます。',
  'learning.concept.quic.q2.a.why':
    'QUIC は常に暗号化されます（TLS 1.3 を内蔵）。利点は暗号化の省略ではなく接続確立の速さです。',
  'learning.concept.quic.q2.c.why':
    'QUIC はスループットを同等以上に狙います。目玉は接続確立の速さ（1-RTT/0-RTT）です。',
  'learning.concept.quic.q3.a.why':
    '逆です — 独立したストリームにより多数の要求が 1 接続を同時に共有できます。',
  'learning.concept.quic.q3.b.why':
    'QUIC はパケット損失を防げません。損失の影響を抑え、そのストリームだけが止まるようにします。',
};
