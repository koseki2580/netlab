import type { Catalog } from '../../../../types';

/** The `ipv6` deck's questions (ja); its name is in the core chunk. */
export const ipv6: Catalog = {
  'learning.concept.ipv6.q1.prompt': 'IPv6 アドレスは…',
  'learning.concept.ipv6.q1.a': '128 ビット',
  'learning.concept.ipv6.q1.b': '32 ビット',
  'learning.concept.ipv6.q1.c': '64 ビット',
  'learning.concept.ipv6.q1.why':
    'IPv6 はアドレスを 128 ビットに拡張し、8 つの16進グループで表記します。',
  'learning.concept.ipv6.q2.prompt': 'IPv6 が ARP の代わりに使うのは…',
  'learning.concept.ipv6.q2.a': 'DHCP',
  'learning.concept.ipv6.q2.b': 'NDP',
  'learning.concept.ipv6.q2.c': 'STP',
  'learning.concept.ipv6.q2.why':
    'NDP は ICMPv6 の近隣要請/近隣広告でリンク層アドレスを解決します。',
  'learning.concept.ipv6.q3.prompt': 'IPv6 に存在しないのは…',
  'learning.concept.ipv6.q3.a': 'ネットワーク間のルーティング',
  'learning.concept.ipv6.q3.b': 'ホストのアドレス',
  'learning.concept.ipv6.q3.c': 'ブロードキャストアドレス',
  'learning.concept.ipv6.q3.why':
    'IPv6 はブロードキャストを廃止し、全ノード宛にはマルチキャストグループを使います。',
  'learning.concept.ipv6.q1.b.why': '32 ビットは IPv4 です。IPv6 アドレスは 128 ビットです。',
  'learning.concept.ipv6.q1.c.why':
    '64 ビットはアドレスの半分（インタフェース識別子の部分）にすぎません。完全な IPv6 アドレスは 128 ビットです。',
  'learning.concept.ipv6.q2.a.why':
    'DHCP はアドレスを配ります。IPv6 は ARP に代わり NDP（近隣探索）で近隣を解決します。',
  'learning.concept.ipv6.q2.c.why':
    'STP は L2 ループを防ぎます。ARP の IPv6 後継は近隣探索（NDP）です。',
  'learning.concept.ipv6.q3.a.why':
    'IPv6 はもちろんルーティングします。なくしたのはブロードキャストで、代わりにマルチキャストを使います。',
  'learning.concept.ipv6.q3.b.why':
    'IPv6 はまさにアドレス（128 ビット）の話です。なくしたのはブロードキャストで、マルチキャストに置き換えました。',
};
