import type { Catalog } from '../../../../types';

/** The `lacp` deck's questions (ja); its name is in the core chunk. */
export const lacp: Catalog = {
  'learning.concept.lacp.q1.b.why':
    'ループ防止は STP です。LACP は複数の物理リンクを 1 つの論理リンクに束ねます。',
  'learning.concept.lacp.q1.c.why':
    'VLAN の割り当てはスイッチ設定（802.1Q）です。LACP は複数リンクを 1 つに集約します。',
  'learning.concept.lacp.q2.a.why':
    '集約は L2 の帯域/冗長機能で、新しいサブネット（L3 アドレッシング）ではありません。',
  'learning.concept.lacp.q2.c.why':
    'LACP は暗号化しません。リンクの束ね合わせは合計帯域とリンク冗長を高めます。',
  'learning.concept.lacp.q3.a.why':
    '逆です — 束ねなければ並列リンクはまさに STP がブロックするループになります。LACP の交渉がそれらを 1 つの論理リンクにします。',
  'learning.concept.lacp.q3.b.why':
    'ポートチャネルはルータではなく依然 L2 です。STP は正しい束を 1 つの論理リンクとして扱います。',
  'learning.concept.lacp.q1.prompt': 'LACP の用途は…',
  'learning.concept.lacp.q1.a': '複数リンクを1 つの論理リンクに束ねる',
  'learning.concept.lacp.q1.b': 'スイッチ間のループを防ぐ',
  'learning.concept.lacp.q1.c': 'スイッチポートに VLAN を割り当てる',
  'learning.concept.lacp.q1.why':
    'LACP はリンクアグリゲーショングループを交渉し、帯域と冗長性のためにリンクを束ねます。',
  'learning.concept.lacp.q2.prompt': '束ねたポートチャネルが得るのは…',
  'learning.concept.lacp.q2.a': 'リンク用の新しい IP サブネット',
  'learning.concept.lacp.q2.b': '帯域増加とリンク冗長性',
  'learning.concept.lacp.q2.c': '束ねたリンク全体の暗号化',
  'learning.concept.lacp.q2.why':
    'トラフィックはメンバリンクにハッシュ分散され、1 本が落ちても他が継続します。',
  'learning.concept.lacp.q3.prompt': 'STP は正しい LACP 束を…',
  'learning.concept.lacp.q3.a': 'ブロックすべき複数のループとして扱う',
  'learning.concept.lacp.q3.b': 'ルータ 1 台として扱う',
  'learning.concept.lacp.q3.c': '単一の論理リンクとして扱う',
  'learning.concept.lacp.q3.why':
    '束は STP には1 リンクに見えるため、冗長メンバをブロックしません。',
};
