import type { Catalog } from '../../../../types';

/** The `bgp` deck's questions (ja); its name is in the core chunk. */
export const bgp: Catalog = {
  'learning.concept.bgp.q1.prompt': 'BGP は…',
  'learning.concept.bgp.q1.a': '自律システム間をルーティングする',
  'learning.concept.bgp.q1.b': 'ホストに IP アドレスを割り当てる',
  'learning.concept.bgp.q1.c': '名前をアドレスに解決する',
  'learning.concept.bgp.q1.why':
    'BGP は AS 間で到達性を交換し、独立したネットワーク群が世界規模のインターネットを形成する仕組みです。',
  'learning.concept.bgp.q2.prompt': 'BGP が経路を選ぶ主基準は…',
  'learning.concept.bgp.q2.a': 'ホップ数が最小の経路',
  'learning.concept.bgp.q2.b': 'ポリシーと AS パス（パスベクタ）',
  'learning.concept.bgp.q2.c': 'リンクコストの合計が最小の経路',
  'learning.concept.bgp.q2.why':
    'BGP はパスベクタ型で、運用者は AS パス長やローカルプリファレンス等の属性にポリシーを適用します。',
  'learning.concept.bgp.q3.prompt': 'BGP の「AS」とは…',
  'learning.concept.bgp.q3.a': '自分のルーティングテーブルを持つ 1 台のルータ',
  'learning.concept.bgp.q3.b': '1 つのルーティングドメイン内のサブネット',
  'learning.concept.bgp.q3.c': '自律システム — 単一管理下のネットワーク',
  'learning.concept.bgp.q3.why': '各 AS は番号を持ち、自分が到達できるプレフィックスを広告します。',
  'learning.concept.bgp.q1.b.why':
    'アドレス割り当ては DHCP です。BGP はインターネット全体で自律システム間の到達性をルーティングします。',
  'learning.concept.bgp.q1.c.why':
    '名前解決は DNS です。BGP はインターネットをつなぐ AS 間ルーティングプロトコルです。',
  'learning.concept.bgp.q2.a.why':
    'BGP はホップ数ベースではありません（それは RIP）。ポリシーと AS パス属性で経路を選びます。',
  'learning.concept.bgp.q2.c.why':
    'リンクコストは OSPF の AS 内指標です。BGP は AS 間をポリシーと AS パスで決めます。',
  'learning.concept.bgp.q3.a.why':
    'AS は単一のルータではなく、1 つの管理下にあるネットワーク全体です。',
  'learning.concept.bgp.q3.b.why':
    'サブネットは L3 のアドレスブロックです。AS は独自の番号を持つ多数のネットワークの管理ドメインです。',
};
