import type { Catalog } from '../../../../types';

/** The `pppoe` deck's questions (ja); its name is in the core chunk. */
export const pppoe: Catalog = {
  'learning.concept.pppoe.q1.b.why':
    'ネットワーク間のルーティングは L3 のルータです。PPP は 1 本のポイントツーポイント・リンク上のリンク層カプセル化と認証です。',
  'learning.concept.pppoe.q1.c.why':
    'PPP はインターネット規模の IP を割り当てません。単一のポイントツーポイント・リンクをカプセル化し認証します。',
  'learning.concept.pppoe.q2.a.why':
    'PPPoE は暗号化しません。PPP セッションを Ethernet 内で運び、多数の加入者が 1 つのアクセス網を共有します。',
  'learning.concept.pppoe.q2.c.why':
    'PPPoE は IP アドレッシングを置き換えません。共有の DSL/Ethernet アクセスのため PPP を Ethernet フレームに収めます。',
  'learning.concept.pppoe.q3.a.why':
    'Discovery は暗号化しません。アクセス集約装置（AC）を発見・選択し、セッション ID を確立します。',
  'learning.concept.pppoe.q3.b.why':
    'IP の割り当ては後の PPP セッション（IPCP）で行われます。Discovery はアクセス集約装置（AC）を見つけセッション ID を得るだけです。',
  'learning.concept.pppoe.q1.prompt': 'PPP（Point-to-Point Protocol）が提供するのは…',
  'learning.concept.pppoe.q1.a': 'L2 カプセル化と認証（PAP/CHAP）',
  'learning.concept.pppoe.q1.b': '多数のネットワーク間のルーティング',
  'learning.concept.pppoe.q1.c': 'インターネット全体へのグローバル IP 割り当て',
  'learning.concept.pppoe.q1.why':
    'PPP は 1 本のリンク上で通信をフレーム化し、相手の認証やアドレスのネゴシエーション（IPCP）を行えます。',
  'learning.concept.pppoe.q2.prompt': 'PPPoE が PPP に加える能力は…',
  'learning.concept.pppoe.q2.a': '加入者と ISP の間の全パケットを暗号化する',
  'learning.concept.pppoe.q2.b': 'PPP セッションを Ethernet フレーム内で運ぶ',
  'learning.concept.pppoe.q2.c': 'IP アドレッシングを独自方式に置き換える',
  'learning.concept.pppoe.q2.why':
    'PPPoE（PPP over Ethernet）は共有 Ethernet アクセス網上で加入者ごとの PPP セッションを実行します（DSL で一般的）。',
  'learning.concept.pppoe.q3.prompt': 'PPPoE の Discovery 段階（PADI/PADO/PADR/PADS）は…',
  'learning.concept.pppoe.q3.a': 'リンク用のセッション鍵を暗号化する',
  'learning.concept.pppoe.q3.b': '顧客の IP アドレスを割り当てる',
  'learning.concept.pppoe.q3.c': 'アクセス集約装置を選びセッション ID を確立する',
  'learning.concept.pppoe.q3.why':
    'Discovery（PADI→PADO→PADR→PADS）が AC を選びセッション ID を割り当て、その上で PPP セッション段階が動きます。',
};
