import type { Catalog } from '../../../../types';

/** The `dnssec` deck's questions (ja); its name is in the core chunk. */
export const dnssec: Catalog = {
  'learning.concept.dnssec.q1.b.why':
    'DNSSEC は速度ではなく検証の手間を足します。レコードの真正性を検証できるよう署名を付けます。',
  'learning.concept.dnssec.q1.c.why':
    'IP 割り当ては DHCP です。DNSSEC は DNS レコードに署名し、リゾルバが改ざんを検出できるようにします。',
  'learning.concept.dnssec.q2.a.why':
    'DNSSEC は暗号化ではなく認証します。問い合わせの秘匿は DoH/DoT が解く別問題です。',
  'learning.concept.dnssec.q2.c.why':
    'どのゾーンも暗号化しません。DNSSEC は完全性のため署名し、機密性は DoH/DoT が加えます。',
  'learning.concept.dnssec.q3.a.why':
    '無条件の信頼は目的を損ないます。DNSSEC は DS レコードでルートから下へ信頼の連鎖を築きます。',
  'learning.concept.dnssec.q3.b.why':
    'IP 許可リストは DNSSEC の仕組みではありません。信頼はルートから流れ、各ゾーンの鍵は親が署名します。',
  'learning.concept.dnssec.q1.prompt': 'DNSSEC が DNS に加えるのは？',
  'learning.concept.dnssec.q1.a': 'リゾルバがレコードの真正性を検証できる暗号署名',
  'learning.concept.dnssec.q1.b': 'より積極的なキャッシュによる高速な名前解決',
  'learning.concept.dnssec.q1.c': '新しいホストへの自動 IP 割り当て',
  'learning.concept.dnssec.q1.why':
    'DNSSEC はゾーン鍵（DNSKEY）でレコードに署名（RRSIG）し、改ざんや偽造応答（キャッシュ汚染）を検出できるようにします。',
  'learning.concept.dnssec.q2.prompt': 'DNSSEC は DNS 問い合わせを暗号化する？',
  'learning.concept.dnssec.q2.a': 'はい、利用者からサーバまで完全に暗号化する',
  'learning.concept.dnssec.q2.b': 'いいえ — 応答を認証するだけで、機密性は別問題',
  'learning.concept.dnssec.q2.c': 'ルートゾーンへの問い合わせだけ',
  'learning.concept.dnssec.q2.why':
    'DNSSEC は応答の真正性を証明しますが平文で送られます。問い合わせの暗号化は DNS over HTTPS/TLS が担います。',
  'learning.concept.dnssec.q3.prompt': 'DNSSEC で信頼はどう確立される？',
  'learning.concept.dnssec.q3.a': 'すべてのリゾルバがすべてのゾーンを既定で信頼する',
  'learning.concept.dnssec.q3.b': '各リゾルバが持つ IP 許可リストで',
  'learning.concept.dnssec.q3.c': 'ルートから下への信頼の連鎖（DS レコード）',
  'learning.concept.dnssec.q3.why':
    '親ゾーンが子の鍵をハッシュした DS レコードを公開するため、検証は root→TLD→ドメインと辿り、信頼されたルート鍵に錨を下ろします。',
};
