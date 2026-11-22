import type { Catalog } from '../../../../types';

/** The `mpls` deck's questions (ja); its name is in the core chunk. */
export const mpls: Catalog = {
  'learning.concept.mpls.q1.prompt': 'MPLS の転送方法は…',
  'learning.concept.mpls.q1.a': 'IP ルックアップの代わりに短いラベルを交換する',
  'learning.concept.mpls.q1.b': '全インタフェースへブロードキャストする',
  'learning.concept.mpls.q1.c': '毎回 ARP で次ホップを解決する',
  'learning.concept.mpls.q1.why':
    'エッジルータがラベルを付与し、コアは定めた経路に沿ってラベルを交換、ホップごとの IP ルックアップを避けます。',
  'learning.concept.mpls.q2.prompt': 'ラベル付きパケットがたどる経路を…',
  'learning.concept.mpls.q2.a': 'ブロードキャストドメイン',
  'learning.concept.mpls.q2.b': 'ラベルスイッチドパス（LSP）',
  'learning.concept.mpls.q2.c': '自律システム',
  'learning.concept.mpls.q2.why':
    'ラベルは MPLS コアを通る LSP を定義し、ホップごとの宛先検索とは独立に設定されます。',
  'learning.concept.mpls.q3.prompt': 'MPLS の位置づけは…',
  'learning.concept.mpls.q3.a': 'HTTP の上、アプリケーション内',
  'learning.concept.mpls.q3.b': 'イーサネットの下、物理リンク上',
  'learning.concept.mpls.q3.c': 'L2 と L3 の間（「レイヤー2.5」）',
  'learning.concept.mpls.q3.why':
    'MPLS はリンクヘッダとネットワークヘッダの間にシムラベルを足すため「レイヤー2.5」と呼ばれます。',
  'learning.concept.mpls.q1.b.why':
    'MPLS はブロードキャストしません。ホップごとの IP ルックアップの代わりに、定めた経路で短いラベルを交換します。',
  'learning.concept.mpls.q1.c.why':
    'ARP は IP→MAC を解決します。MPLS はラベルを交換して転送し、IP ルックアップを省きます。',
  'learning.concept.mpls.q2.a.why':
    'ブロードキャストドメインは L2 の概念です。MPLS 網を通る経路がラベルスイッチドパス（LSP）です。',
  'learning.concept.mpls.q2.c.why':
    'AS は BGP のルーティングドメインです。MPLS 内のラベル付き経路はラベルスイッチドパス（LSP）です。',
  'learning.concept.mpls.q3.a.why':
    'HTTP は L7 のアプリです。MPLS は低層に位置し、L2 と L3 の間（しばしばレイヤー2.5）です。',
  'learning.concept.mpls.q3.b.why':
    'MPLS はイーサネットのような L2 リンクの上に乗り、その下ではありません — L2 と L3 の間にあります。',
};
