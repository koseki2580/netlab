import type { Catalog } from '../../../../types';

/** The `ethernet` deck's questions (ja); its name is in the core chunk. */
export const ethernet: Catalog = {
  'learning.concept.ethernet.q1.prompt': 'イーサネットフレームの宛先指定は…',
  'learning.concept.ethernet.q1.a': 'MAC アドレス',
  'learning.concept.ethernet.q1.b': 'IP アドレス',
  'learning.concept.ethernet.q1.c': 'ポート番号',
  'learning.concept.ethernet.q1.why':
    'L2 フレームは LAN セグメント内で 48 ビットの MAC アドレスにより配送されます。',
  'learning.concept.ethernet.q2.prompt': 'スイッチが MAC テーブルを作る方法は…',
  'learning.concept.ethernet.q2.a': '転送する全パケットの IP ヘッダを読む',
  'learning.concept.ethernet.q2.b': '受信フレームの送信元 MAC を学習する',
  'learning.concept.ethernet.q2.c': '隣接と OSPF を動かす',
  'learning.concept.ethernet.q2.why':
    'スイッチは各送信元 MAC がどのポートから来たかを記録し、宛先 MAC で転送します。',
  'learning.concept.ethernet.q3.prompt': '宛先 MAC が未知のフレームは…',
  'learning.concept.ethernet.q3.a': '破棄される',
  'learning.concept.ethernet.q3.b': 'ゲートウェイへルーティングされる',
  'learning.concept.ethernet.q3.c': '他の全ポートへフラッディングされる',
  'learning.concept.ethernet.q3.why':
    '宛先不明ユニキャストはフラッディングされ、宛先が応答して学習されます。',
  'learning.concept.ethernet.q4.prompt':
    'アドレスとペイロードのほかに、イーサネットフレームのトレーラが運ぶのは…',
  'learning.concept.ethernet.q4.a': '壊れたフレームを検出する FCS',
  'learning.concept.ethernet.q4.b': 'フレームの到達範囲を制限する TTL',
  'learning.concept.ethernet.q4.c': 'TCP のチェックサム',
  'learning.concept.ethernet.q4.why':
    'FCS はフレーム全体から計算される CRC で、受信側は伝送エラーを検出して壊れたフレームを破棄できます。',
  'learning.concept.ethernet.q5.prompt': '2 台のスイッチを接続すると拡張されるのは…',
  'learning.concept.ethernet.q5.a': '2 つの別インターネット',
  'learning.concept.ethernet.q5.b': '同一のブロードキャストドメイン',
  'learning.concept.ethernet.q5.c': 'ルーティングテーブル',
  'learning.concept.ethernet.q5.why':
    '素のスイッチングは1 つのブロードキャストドメインを保ちます。分割にはルータ（または VLAN）が必要です。',
  'learning.concept.ethernet.q1.b.why':
    'IP アドレスは L3 です。イーサネットフレームは L2 の MAC で宛先指定します。',
  'learning.concept.ethernet.q1.c.why':
    'ポート番号は L4 です。フレームは次の機器へ届くため L2 の MAC を使います。',
  'learning.concept.ethernet.q2.a.why':
    'スイッチは IP ヘッダ（L3 ルーティング）を読みません。L2 の送信元 MAC から学習します。',
  'learning.concept.ethernet.q2.c.why':
    'OSPF はルータ向けのルーティングプロトコルです。スイッチはフレームの送信元 MAC を学習するだけです。',
  'learning.concept.ethernet.q3.a.why':
    '宛先不明のフレームは破棄ではなくフラッディングされ、ホストに届く可能性を残します。',
  'learning.concept.ethernet.q3.b.why':
    'スイッチはゲートウェイへルーティングしません（L3）。不明ユニキャストは他の全ポートへフラッディングします。',
  'learning.concept.ethernet.q4.b.why':
    'TTL はルータが減らす IP（L3）のフィールドです。フレームにホップ上限はなく、そもそも L2 セグメントの外へは出ません。',
  'learning.concept.ethernet.q4.c.why':
    'TCP チェックサムはペイロード内の L4 フィールドです。フレーム自身のエラー検査はトレーラの FCS です。',
  'learning.concept.ethernet.q5.a.why':
    'スイッチをつないでも別々のインターネットはできません。1 つのブロードキャストドメインに結合します。',
  'learning.concept.ethernet.q5.c.why':
    'ルーティングテーブルはルータの L3 構造です。スイッチ同士の接続は L2 ドメインを広げるだけです。',
};
