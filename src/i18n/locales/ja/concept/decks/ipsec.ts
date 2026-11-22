import type { Catalog } from '../../../../types';

/** The `ipsec` deck's questions (ja); its name is in the core chunk. */
export const ipsec: Catalog = {
  'learning.concept.ipsec.q1.b.why':
    '名前解決は DNS です。IPsec は IP パケットを認証・暗号化しセキュア VPN を構築します。',
  'learning.concept.ipsec.q1.c.why':
    'スイッチングは L2 のフレーム転送です。IPsec は IP パケットを認証・暗号化でエンドツーエンドに保護します。',
  'learning.concept.ipsec.q2.a.why':
    'AH は認証と完全性検査を行いますが暗号化はしません。ペイロードを暗号化するのは ESP です。',
  'learning.concept.ipsec.q2.c.why':
    'ARP は IP→MAC を解決し IPsec と無関係です。暗号化を担うのは ESP です。',
  'learning.concept.ipsec.q3.a.why':
    'IPsec は「ポート」を選んで暗号化しません。トンネルモードは元のパケット全体を包んで暗号化します。',
  'learning.concept.ipsec.q3.b.why':
    'トンネルモードはルーティングを止めません — 新しい IP ヘッダを付け、暗号化パケットがゲートウェイ間をルーティングされます。',
  'learning.concept.ipsec.q1.prompt': 'IPsec が提供するのは…',
  'learning.concept.ipsec.q1.a': '認証・暗号化された IP パケット',
  'learning.concept.ipsec.q1.b': 'ホストの名前解決',
  'learning.concept.ipsec.q1.c': 'ポート間のフレームスイッチング',
  'learning.concept.ipsec.q1.why':
    'IPsec は IP トラフィック自体を保護します — 機密性・完全性・認証 — 主に VPN で使われます。',
  'learning.concept.ipsec.q2.prompt': 'ペイロードを暗号化する IPsec プロトコルは？',
  'learning.concept.ipsec.q2.a': 'AH',
  'learning.concept.ipsec.q2.b': 'ESP',
  'learning.concept.ipsec.q2.c': 'ARP',
  'learning.concept.ipsec.q2.why':
    'ESP（カプセル化セキュリティペイロード）は暗号化と認証、AH は認証のみです。',
  'learning.concept.ipsec.q3.prompt': 'IPsec のトンネルモードは…',
  'learning.concept.ipsec.q3.a': 'ヘッダのポート番号だけを暗号化する',
  'learning.concept.ipsec.q3.b': '2 つのゲートウェイ間のルーティングを無効化する',
  'learning.concept.ipsec.q3.c': '元パケット全体を新パケットに包んで暗号化する',
  'learning.concept.ipsec.q3.why':
    'トンネルモードはパケット全体を包み（VPN ゲートウェイ間）、トランスポートモードはホスト間でペイロードを保護します。',
};
