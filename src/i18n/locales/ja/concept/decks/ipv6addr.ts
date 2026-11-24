import type { Catalog } from '../../../../types';

/** The `ipv6addr` deck's questions (ja); its name is in the core chunk. */
export const ipv6addr: Catalog = {
  'learning.concept.ipv6addr.q1.prompt':
    'RFC 5952 では 2001:0db8:0000:0001:0000:0000:0000:0001 をどう書く？',
  'learning.concept.ipv6addr.q1.a': '2001:db8::1:0:0:0:1',
  'learning.concept.ipv6addr.q1.b': '2001:db8:0:1::1',
  'learning.concept.ipv6addr.q1.c': '2001:db8::1::1',
  'learning.concept.ipv6addr.q1.why':
    '「::」は 0 のグループが最も長く続くところに使います。:1 の後ろの 3 つの並びは、その前の 1 つだけの 0 より長く、1 つだけの 0 のグループは「::」ではなく 0 と書きます。',
  'learning.concept.ipv6addr.q1.a.why':
    '前の 0 は 1 グループだけで、RFC 5952 は 1 グループを縮めません。縮めるのは 3 つ続く長いほうです。',
  'learning.concept.ipv6addr.q1.c.why':
    '「::」は 1 回しか使えません。2 回あると、それぞれがいくつの 0 のグループを表すのか決まらないからです。',
  'learning.concept.ipv6addr.q2.prompt':
    'あるホストのインターフェースに fe80::1、fd12:3456:789a:1::1、ff02::1 があります。ルータが同じサイトの別のサブネットへは転送できるが、インターネットへは出さないのはどれ？',
  'learning.concept.ipv6addr.q2.a': 'リンクローカルの fe80::1',
  'learning.concept.ipv6addr.q2.b': 'マルチキャストグループの ff02::1',
  'learning.concept.ipv6addr.q2.c': 'ユニークローカルの fd12:3456:789a:1::1',
  'learning.concept.ipv6addr.q2.why':
    'fd00::/8 はユニークローカルの範囲 fc00::/7（RFC 4193）のうち実際に使われている半分です。サイトの中ではルーティングされ、サイトの境界で止められます。',
  'learning.concept.ipv6addr.q2.a.why':
    'fe80::/10 はリンクローカルで、そのリンクの中だけで有効です。ルータは別のリンクへ転送しません。',
  'learning.concept.ipv6addr.q2.b.why':
    'ff02::1 はリンク範囲（ff02 の 2）の全ノードグループで、これもリンクの外へは出ません。',
  'learning.concept.ipv6addr.q3.prompt':
    'ISP が家庭のルータに /56 を委任しました。ルータはそこから /64 の LAN をいくつ作れる？',
  'learning.concept.ipv6addr.q3.a': '256',
  'learning.concept.ipv6addr.q3.b': '8',
  'learning.concept.ipv6addr.q3.c': '65,536',
  'learning.concept.ipv6addr.q3.why':
    'サブネット ID は 64 − 56 = 8 ビットで、2⁸ = 256 です。この 8 ビットは 4 つ目のグループの下 2 桁にあたります。',
  'learning.concept.ipv6addr.q3.b.why':
    '8 は /56 と /64 の間のビット数です。1 ビットごとに数が 2 倍になるので、LAN は 8 個ではなく 2⁸ 個です。',
  'learning.concept.ipv6addr.q3.c.why':
    '65,536 個の /64 が入るのは、サブネット ID が 16 ビットある /48 です。/56 には 8 ビットしかありません。',
  'learning.concept.ipv6addr.q4.prompt':
    'ルータは 2001:db8:1234:5600::/56 を受け取り、LAN をサブネット ID 0 から番号付けするので、LAN 1 は …:5600::/64 です。LAN 11 のプレフィックスは？',
  'learning.concept.ipv6addr.q4.a': '2001:db8:1234:5610::/64',
  'learning.concept.ipv6addr.q4.b': '2001:db8:1234:560b::/64',
  'learning.concept.ipv6addr.q4.c': '2001:db8:1234:560a::/64',
  'learning.concept.ipv6addr.q4.why':
    'LAN 11 はサブネット ID 10 で、10 は 16 進で 0a なので、4 つ目のグループは 560a になります。',
  'learning.concept.ipv6addr.q4.a.why':
    '10 進の 10 をそのまま 1 0 と書いています。アドレスは 16 進なので 0x10 は 16 で、LAN 17 になってしまいます。',
  'learning.concept.ipv6addr.q4.b.why':
    '0b は LAN 番号の 11 です。LAN 1 がサブネット ID 0 なので、LAN 11 はサブネット ID 10 を使います。',
};
