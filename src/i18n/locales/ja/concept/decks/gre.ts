import type { Catalog } from '../../../../types';

/** The `gre` deck's questions (ja); its name is in the core chunk. */
export const gre: Catalog = {
  'learning.concept.gre.q1.prompt': 'GRE トンネルの仕組みは…',
  'learning.concept.gre.q1.a': 'パケットを別の IP パケットにカプセル化する',
  'learning.concept.gre.q1.b': 'パケット全体を AES で暗号化する',
  'learning.concept.gre.q1.c': '各ホップで MAC アドレスを切り替える',
  'learning.concept.gre.q1.why':
    'GRE は元パケットを新しい IP+GRE ヘッダでカプセル化し、途中のネットワークをペイロードとして通過させます。',
  'learning.concept.gre.q2.prompt': 'GRE 自体が提供するのは…',
  'learning.concept.gre.q2.a': 'ペイロードの強力な暗号化',
  'learning.concept.gre.q2.b': 'カプセル化のみで暗号化なし',
  'learning.concept.gre.q2.c': 'トンネルのアドレス割り当て',
  'learning.concept.gre.q2.why':
    'GRE はトンネリング/カプセル化プロトコルで、保護するには IPsec と組み合わせます。',
  'learning.concept.gre.q3.prompt': 'トンネルは2 つの遠隔ネットワークを…',
  'learning.concept.gre.q3.a': '1 つのホストのように見せる',
  'learning.concept.gre.q3.b': '互いに到達不能に見せる',
  'learning.concept.gre.q3.c': 'アンダーレイ越しに直結のように見せる',
  'learning.concept.gre.q3.why':
    '多数のホップを挟んでも、両端はポイントツーポイントリンク上の隣接のように振る舞います。',
  'learning.concept.gre.q1.b.why':
    'GRE は暗号化しません（必要なら IPsec と組み合わせます）。パケットを別の IP パケットでカプセル化します。',
  'learning.concept.gre.q1.c.why':
    'MAC アドレスの切り替えは L2 転送です。GRE はパケットを外側 IP パケットにカプセル化してトンネルします。',
  'learning.concept.gre.q2.a.why':
    'GRE 単体に暗号化はありません — だから GRE over IPsec があります。単体ではカプセル化のみです。',
  'learning.concept.gre.q2.c.why':
    'アドレス割り当ては DHCP です。GRE は暗号化なしでトラフィックをカプセル化しトンネルするだけです。',
  'learning.concept.gre.q3.a.why':
    'トンネルはネットワーク全体を結ぶもので 1 ホストにまとめません。アンダーレイ越しに直結して見えます。',
  'learning.concept.gre.q3.b.why':
    'トンネルの目的は到達性です — 2 つのネットワークはアンダーレイ越しに直結して見えます。',
};
