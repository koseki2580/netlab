import type { Catalog } from '../../../../types';

/** The `stp` deck's questions (ja); its name is in the core chunk. */
export const stp: Catalog = {
  'learning.concept.stp.q1.prompt': 'スパニングツリーが防ぐ問題は？',
  'learning.concept.stp.q1.a': 'IP アドレス枯渇',
  'learning.concept.stp.q1.b': 'L2 の転送ループ',
  'learning.concept.stp.q1.c': 'ルーティングループ',
  'learning.concept.stp.q1.why':
    '冗長なスイッチ間リンクはブロードキャストを永久に巡回させます。STP はポートをブロックしてループのない木を作ります。',
  'learning.concept.stp.q2.prompt': '木の基準点に選ばれるスイッチは…',
  'learning.concept.stp.q2.a': 'ルートブリッジ',
  'learning.concept.stp.q2.b': '代表ルータ',
  'learning.concept.stp.q2.c': 'デフォルトゲートウェイ',
  'learning.concept.stp.q2.why':
    '優先度/MAC が最小のブリッジがルートになり、すべての経路コストはそこへ向けて測られます。',
  'learning.concept.stp.q3.prompt': 'ブロックされた STP ポートは…',
  'learning.concept.stp.q3.a': 'スイッチから物理的に切断されている',
  'learning.concept.stp.q3.b': 'データを転送するが BPDU を無視する',
  'learning.concept.stp.q3.c': 'BPDU は処理するがデータは転送しない',
  'learning.concept.stp.q3.why':
    'ブロックポートも BPDU を聞き続けるため、トポロジ変化時に STP が再有効化できます。',
  'learning.concept.stp.q1.a.why':
    'IP 枯渇は NAT/IPv6 で解決します。STP はスイッチ網の L2 転送ループを防ぎます。',
  'learning.concept.stp.q1.c.why':
    'ルーティングループは L3 の問題（TTL・ルーティングプロトコル）です。STP はスイッチ間の L2 転送ループを止めます。',
  'learning.concept.stp.q2.b.why':
    '代表ルータ（DR）は OSPF（L3）の役割です。STP の基準点は選出されたルートブリッジです。',
  'learning.concept.stp.q2.c.why':
    'デフォルトゲートウェイはサブネットの出口ルータ（L3）です。STP の起点はルートブリッジです。',
  'learning.concept.stp.q3.a.why':
    'ブロックされたポートも物理的には生きています。BPDU を聞きつつデータ転送だけを止めます。',
  'learning.concept.stp.q3.b.why':
    '逆です — ブロックポートはデータフレームを落としつつ、トポロジ監視のため BPDU は処理します。',
};
