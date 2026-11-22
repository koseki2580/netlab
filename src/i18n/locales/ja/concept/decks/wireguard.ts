import type { Catalog } from '../../../../types';

/** The `wireguard` deck's questions (ja); its name is in the core chunk. */
export const wireguard: Catalog = {
  'learning.concept.wireguard.q1.a.why':
    'WireGuard は TCP+TLS のオーバーヘッドを避けます。単一ポートの UDP 上で動き、軽量で NAT 越えしやすいです。',
  'learning.concept.wireguard.q1.c.why':
    'ICMP は診断用です。WireGuard は単一ポートの UDP 上で動きます。',
  'learning.concept.wireguard.q2.a.why':
    'WireGuard はパスワードを使いません。各ピアは公開鍵で識別され、許可 IP のセットに結び付きます。',
  'learning.concept.wireguard.q2.b.why':
    'MAC はルータを越えないローカルな L2 アドレスです。WireGuard は各ピアの公開鍵を許可 IP に固定します。',
  'learning.concept.wireguard.q3.b.why':
    'WireGuard は常に暗号化されます。単純なのは小さなコードと固定の現代暗号によるもので、暗号化を省くからではありません。',
  'learning.concept.wireguard.q3.c.why':
    'WireGuard はクロスプラットフォームです。速さは小さなカーネル実装と暗号スイートのネゴシエーションの不在によります。',
  'learning.concept.wireguard.q1.prompt': 'WireGuard が動作するトランスポートは…',
  'learning.concept.wireguard.q1.a': 'TCP（完全な TLS ハンドシェイク付き）',
  'learning.concept.wireguard.q1.b': '単一の軽量なポートの UDP',
  'learning.concept.wireguard.q1.c': 'ICMP（ping と同じ）',
  'learning.concept.wireguard.q1.why':
    'WireGuard は UDP プロトコルで、1 ポートで済むため高速かつ NAT・ファイアウォール越えが容易です。',
  'learning.concept.wireguard.q2.prompt': 'WireGuard がピアを識別する方法は…',
  'learning.concept.wireguard.q2.a': 'ユーザ名とパスワードの組',
  'learning.concept.wireguard.q2.b': 'リンク上の MAC アドレス',
  'learning.concept.wireguard.q2.c': '公開鍵（許可 IP に紐づく）',
  'learning.concept.wireguard.q2.why':
    '各ピアは静的な鍵ペアを持ち、公開鍵と AllowedIPs が「どの送信元を誰が送れるか」を定めます（クリプトキー・ルーティング）。',
  'learning.concept.wireguard.q3.prompt': 'WireGuard が IPsec より単純で高速とされる理由は…',
  'learning.concept.wireguard.q3.a': 'コードベースが小さく暗号方式が固定だから',
  'learning.concept.wireguard.q3.b': '速度のため暗号化を一切行わない',
  'learning.concept.wireguard.q3.c': '1 つの OS でしか動かない',
  'learning.concept.wireguard.q3.why':
    '暗号スイートのネゴシエーションがなく（最新の 1 セット）、小さく監査しやすいコードとカーネル内データパスで低オーバーヘッドです。',
};
