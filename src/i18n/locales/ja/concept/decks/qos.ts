import type { Catalog } from '../../../../types';

/** The `qos` deck's questions (ja); its name is in the core chunk. */
export const qos: Catalog = {
  'learning.concept.qos.q1.prompt': 'DSCP が優先度を記すのは…',
  'learning.concept.qos.q1.a': 'IP ヘッダ',
  'learning.concept.qos.q1.b': 'イーサネットのプリアンブル',
  'learning.concept.qos.q1.c': 'TCP ペイロード',
  'learning.concept.qos.q1.why':
    'DSCP は IPv4/IPv6 の ToS/Traffic Class フィールドの 6 ビットを使い、各パケットをホップごとの扱いに分類します。',
  'learning.concept.qos.q2.prompt': 'QoS が最も役立つのは…',
  'learning.concept.qos.q2.a': 'リンクが常に空いていて使われていない',
  'learning.concept.qos.q2.b': 'リンクが輻輳し一部が遅延に敏感',
  'learning.concept.qos.q2.c': 'リンク上にホストが 1 台だけ',
  'learning.concept.qos.q2.why':
    '輻輳時、QoS によりルータはバルク（大容量）転送より音声/映像を優先でき、すべてを同等に扱わずに済みます。',
  'learning.concept.qos.q3.prompt': 'ルータが DSCP に従う方法は…',
  'learning.concept.qos.q3.a': 'キューイング前にパケットを暗号化する',
  'learning.concept.qos.q3.b': 'マークされたパケットをすべて破棄する',
  'learning.concept.qos.q3.c': '優先キューイングなどホップごとの動作を適用する',
  'learning.concept.qos.q3.why':
    '各ホップは DSCP 値をキュー/スケジューリングのホップごとの動作（PHB）に対応づけます。エンドツーエンドには一貫したマーキングが必要です。',
  'learning.concept.qos.q1.b.why':
    'プリアンブルは受信側のクロック同期用です。DSCP の優先度は IP ヘッダの DS フィールドにあります。',
  'learning.concept.qos.q1.c.why':
    'TCP ペイロードはアプリデータです。DSCP は各ルータが読む IP ヘッダで優先度を示します。',
  'learning.concept.qos.q2.a.why':
    'アイドルなリンクでは優先順位を付けるものがありません。QoS は輻輳し遅延に敏感な通信があるときに効きます。',
  'learning.concept.qos.q2.c.why':
    'ホストが 1 台では競合を管理する必要がありません。QoS は輻輳したリンクで通信が競合するときに価値があります。',
  'learning.concept.qos.q3.a.why':
    'DSCP はセキュリティではなくスケジューリングの話です。ルータは優先キューイングなどのホップごとの動作を適用します。',
  'learning.concept.qos.q3.b.why':
    'マークされたパケットは破棄ではなく優先されます。ルータは優先キューイングなどのホップごとの動作を適用します。',
};
