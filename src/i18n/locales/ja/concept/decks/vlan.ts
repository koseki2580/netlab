import type { Catalog } from '../../../../types';

/** The `vlan` deck's questions (ja); its name is in the core chunk. */
export const vlan: Catalog = {
  'learning.concept.vlan.q1.prompt': 'VLAN が作るのは…',
  'learning.concept.vlan.q1.a': '共有スイッチ上の独立したブロードキャストドメイン',
  'learning.concept.vlan.q1.b': 'スイッチ間の新しい物理ケーブル',
  'learning.concept.vlan.q1.c': 'サブネット用のルーティングテーブル',
  'learning.concept.vlan.q1.why':
    '各 VLAN は独立した L2 ブロードキャストドメインで、別 VLAN のホスト同士はルータが必要です。',
  'learning.concept.vlan.q2.prompt': 'トランクポートが運ぶのは…',
  'learning.concept.vlan.q2.a': '単一の VLAN のみ（タグなし）',
  'learning.concept.vlan.q2.b': '802.1Q タグ付きの複数 VLAN',
  'learning.concept.vlan.q2.c': 'タグなしトラフィックのみ・単一 VLAN',
  'learning.concept.vlan.q2.why':
    'トランクはフレームに VLAN ID を付与し、複数 VLAN がスイッチ間の1 リンクを共有します。',
  'learning.concept.vlan.q3.prompt': '2 つの VLAN 間でトラフィックを通すには…',
  'learning.concept.vlan.q3.a': 'より長いケーブル',
  'learning.concept.vlan.q3.b': '2 台目のルートブリッジ',
  'learning.concept.vlan.q3.c': 'ルータまたは L3 スイッチ',
  'learning.concept.vlan.q3.why':
    '各 VLAN は別々のブロードキャストドメインで、それぞれ独自の IP サブネットを持つため、VLAN 間トラフィックはルーティングが必要です。',
  'learning.concept.vlan.q1.b.why':
    'VLAN は物理ではなく論理です — 新たな配線なしに 1 台のスイッチを別々のブロードキャストドメインに分けます。',
  'learning.concept.vlan.q1.c.why':
    'ルーティングテーブルは L3 ルータの構造です。VLAN は別々の L2 ブロードキャストドメインを作るだけです。',
  'learning.concept.vlan.q2.a.why':
    '1 つの VLAN だけを運ぶのはアクセスポートです。トランクは 802.1Q でタグ付けし複数 VLAN を運びます。',
  'learning.concept.vlan.q2.c.why':
    'トランクは 802.1Q でタグ付けし VLAN を区別します。タグなしのみはアクセスポートの説明です。',
  'learning.concept.vlan.q3.a.why':
    '配線では VLAN をまたげません — 802.1Q が別々のブロードキャストドメインとして分離し、サブネットも異なるため、ルータか L3 スイッチが必要です。',
  'learning.concept.vlan.q3.b.why':
    'ルートブリッジは 1 つの L2 ドメイン内の STP の概念です。VLAN 間の移動には L3 ルーティングが必要です。',
};
