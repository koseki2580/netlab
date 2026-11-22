import type { Catalog } from '../../../../types';

/** The `sip` deck's questions (ja); its name is in the core chunk. */
export const sip: Catalog = {
  'learning.concept.sip.q1.a.why':
    '音声は SIP ではなく RTP で流れます。SIP は通話を確立・変更・終了する制御（シグナリング）です。',
  'learning.concept.sip.q1.c.why':
    'アドレス割り当ては DHCP です。SIP は通話の確立/切断を制御し、メディアは RTP に任せます。',
  'learning.concept.sip.q2.a.why':
    'SIP はメディアのサンプルを運びません。音声は RTP で別に流れ、SIP/SDP は交渉するだけです。',
  'learning.concept.sip.q2.b.why':
    '音声も映像も SIP には乗りません。どちらも RTP で流れ、SIP は SDP で交渉します。',
  'learning.concept.sip.q3.b.why':
    'SIP はバイナリのルーティングプロトコルではなく HTTP のようなテキストベースです。INVITE はメソッドとヘッダを持つリクエストです。',
  'learning.concept.sip.q3.c.why':
    'Ethernet フレームは L2 のバイナリフレーミングです。SIP はメソッドとステータスコードを持つ HTTP 風のテキストプロトコルです。',
  'learning.concept.sip.q1.prompt': 'SIP が担うのは？',
  'learning.concept.sip.q1.a': '実際の音声・映像メディアの運搬',
  'learning.concept.sip.q1.b': 'リアルタイム通話の確立・変更・切断',
  'learning.concept.sip.q1.c': '電話機への IP アドレスの割り当て',
  'learning.concept.sip.q1.why':
    'SIP はシグナリングプロトコルで、ユーザを探しセッションを交渉します。メディアは別ストリームで流れます。',
  'learning.concept.sip.q2.prompt': '音声・映像そのものは SIP の中を流れる？',
  'learning.concept.sip.q2.a': 'はい、SIP が音声サンプルを運ぶ',
  'learning.concept.sip.q2.b': '映像だけ運ぶ（音声は運ばない）',
  'learning.concept.sip.q2.c': 'いいえ — メディアは別途 RTP で流れる',
  'learning.concept.sip.q2.why':
    'SIP は SDP を運んでコーデックやポートを合意し、その後メディア（RTP）はエンドポイント間を直接、シグナリングとは別に流れます。',
  'learning.concept.sip.q3.prompt': 'INVITE のような SIP リクエストが最も似ているのは…',
  'learning.concept.sip.q3.a': 'HTTP — ステータスコードを持つテキストの要求/応答',
  'learning.concept.sip.q3.b': 'バイナリのルーティングプロトコルの更新',
  'learning.concept.sip.q3.c': 'ヘッダと FCS を持つ Ethernet フレーム',
  'learning.concept.sip.q3.why':
    'SIP は HTTP/SMTP を手本にしており、読みやすいメソッド（INVITE、BYE）や応答（200 OK、404）で Web 開発者に馴染みやすい設計です。',
};
