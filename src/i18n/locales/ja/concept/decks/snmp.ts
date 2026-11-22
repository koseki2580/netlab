import type { Catalog } from '../../../../types';

/** The `snmp` deck's questions (ja); its name is in the core chunk. */
export const snmp: Catalog = {
  'learning.concept.snmp.q1.b.why':
    'パケットのルーティングはルータの仕事です。SNMP はネットワーク機器を監視・管理します。',
  'learning.concept.snmp.q1.c.why':
    'リンク暗号化は TLS/IPsec/MACsec です。SNMP は機器の監視・管理用です。',
  'learning.concept.snmp.q2.a.why':
    'ルーティングテーブルはルータにあります。SNMP は管理データを MIB ツリーの OID として公開します。',
  'learning.concept.snmp.q2.c.why':
    'MAC テーブルはスイッチの L2 構造です。SNMP は管理対象を MIB の OID として整理します。',
  'learning.concept.snmp.q3.a.why':
    'GET はマネージャが機器に問い合わせる操作です。機器が自発的に送る通知はトラップです。',
  'learning.concept.snmp.q3.b.why':
    'ACK は受領確認にすぎません。機器がイベント駆動で押し出すメッセージは SNMP トラップです。',
  'learning.concept.snmp.q1.prompt': 'SNMP の用途は…',
  'learning.concept.snmp.q1.a': 'ネットワーク機器の監視と管理',
  'learning.concept.snmp.q1.b': 'サブネット間のパケットのルーティング',
  'learning.concept.snmp.q1.c': '機器間のリンクの暗号化',
  'learning.concept.snmp.q1.why':
    'SNMP は機器の状態（カウンタ・ステータス）を読み書きし、ネットワーク管理に使います。',
  'learning.concept.snmp.q2.prompt': 'SNMP の管理データの構成は…',
  'learning.concept.snmp.q2.a': 'ルーティングテーブル',
  'learning.concept.snmp.q2.b': 'MIB ツリー内の OID',
  'learning.concept.snmp.q2.c': 'MAC テーブル',
  'learning.concept.snmp.q2.why': '各値は MIB 階層内のオブジェクト識別子（OID）を持ちます。',
  'learning.concept.snmp.q3.prompt': '機器がイベント時に自発送信する SNMP 通知は…',
  'learning.concept.snmp.q3.a': 'GET',
  'learning.concept.snmp.q3.b': 'ACK',
  'learning.concept.snmp.q3.c': 'トラップ',
  'learning.concept.snmp.q3.why':
    'トラップ（通知）は機器発で、マネージャ発の GET/SET ポーリングとは別です。',
};
