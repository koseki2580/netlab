import type { Catalog } from '../../../../types';

/** The `l2tp` deck's questions (ja); its name is in the core chunk. */
export const l2tp: Catalog = {
  'learning.concept.l2tp.q1.a.why':
    'L2TP 単体に暗号化はありません — だから IPsec と組み合わせます。単体ではトンネルするだけです。',
  'learning.concept.l2tp.q1.c.why':
    'サブネット間のルーティングはルータ（L3）の仕事です。L2TP は独自の暗号化を持たないトンネリングプロトコルです。',
  'learning.concept.l2tp.q2.b.why':
    'L2TP は HTTP 専用ではありません。LAC と LNS の間で L2 の PPP フレームを IP 網越しにトンネルします。',
  'learning.concept.l2tp.q2.c.why':
    'BGP はルーティングテーブルを交換します。L2TP は L2 の PPP フレームを IP 上で運び、テーブルは運びません。',
  'learning.concept.l2tp.q3.a.why':
    'IPsec は速度ではなくセキュリティのオーバーヘッドを足します。L2TP に欠ける暗号化を補うため組み合わせます。',
  'learning.concept.l2tp.q3.b.why':
    '組み合わせは NAT ではなく秘匿性のためです — L2TP がトンネルを、IPsec が暗号化/認証を提供します。',
  'learning.concept.l2tp.q1.prompt': 'L2TP 単体が提供するのは…',
  'learning.concept.l2tp.q1.a': '全通信に対する強力な暗号化',
  'learning.concept.l2tp.q1.b': '暗号化なし — トンネリングのみ',
  'learning.concept.l2tp.q1.c': 'サブネット間のルーティング',
  'learning.concept.l2tp.q1.why':
    'L2TP は通信をカプセル化しますが秘匿性は提供しないため、通常 IPsec と組み合わせます（L2TP/IPsec）。',
  'learning.concept.l2tp.q2.prompt': 'L2TP がトンネルするのは…',
  'learning.concept.l2tp.q2.a': 'IP 網越しの L2（PPP）フレーム',
  'learning.concept.l2tp.q2.b': 'HTTP のリクエストと応答だけ',
  'learning.concept.l2tp.q2.c': 'ピア間の BGP ルーティングテーブル',
  'learning.concept.l2tp.q2.why':
    'L2TP はアクセス集約装置（LAC）とネットワークサーバ（LNS）の間で PPP セッションを IP 上で運びます。',
  'learning.concept.l2tp.q3.prompt': 'L2TP が IPsec とよく併用されるのは…',
  'learning.concept.l2tp.q3.a': 'IPsec がトンネルを速くするから',
  'learning.concept.l2tp.q3.b': 'L2TP が NAT を一切越えられないから',
  'learning.concept.l2tp.q3.c': 'L2TP がトンネルを担い、IPsec が暗号化を加えるから',
  'learning.concept.l2tp.q3.why':
    'L2TP/IPsec は定番の組み合わせで、L2TP がトンネル、IPsec（ESP）が秘匿性と完全性を担います。',
};
