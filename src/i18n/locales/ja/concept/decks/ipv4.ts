import type { Catalog } from '../../../../types';

/** The `ipv4` deck's questions (ja); its name is in the core chunk. */
export const ipv4: Catalog = {
  'learning.concept.ipv4.q1.prompt': 'IPv4 の TTL フィールドは…',
  'learning.concept.ipv4.q1.a': 'ルータを越えるたびパケットを暗号化する',
  'learning.concept.ipv4.q1.b': '各ルータで減算されループを防ぐ',
  'learning.concept.ipv4.q1.c': 'キュー内での優先度を設定する',
  'learning.concept.ipv4.q1.why':
    '各ホップで TTL は減算され、0 で破棄されることで、パケットの巡回時間を制限します。',
  'learning.concept.ipv4.q2.prompt': 'IPv4 アドレスは…',
  'learning.concept.ipv4.q2.a': '32 ビット',
  'learning.concept.ipv4.q2.b': '48 ビット',
  'learning.concept.ipv4.q2.c': '128 ビット',
  'learning.concept.ipv4.q2.why':
    'IPv4 は 32 ビットで 192.168.1.1 のようなドット10進表記です。48 ビットは MAC、128 ビットは IPv6。',
  'learning.concept.ipv4.q3.prompt': 'パケットがリンク MTU を超え DF が未設定なら、ルータは…',
  'learning.concept.ipv4.q3.a': '黙って破棄する',
  'learning.concept.ipv4.q3.b': '暗号化する',
  'learning.concept.ipv4.q3.c': 'フラグメント化する',
  'learning.concept.ipv4.q3.why':
    'IPv4 ルータは過大パケットをフラグメント化します（DF ビットが立っていれば代わりに ICMP を返す）。',
  'learning.concept.ipv4.q4.prompt': 'IPv4 のネットワーク部とホスト部の境界を決めるのは…',
  'learning.concept.ipv4.q4.a': 'サブネットマスク/プレフィックス長',
  'learning.concept.ipv4.q4.b': 'ヘッダの TTL フィールド',
  'learning.concept.ipv4.q4.c': 'トランスポートのポート番号',
  'learning.concept.ipv4.q4.why':
    'マスクは先頭何ビットがネットワークかを示し、残りのビットがホストを識別します。',
  'learning.concept.ipv4.q5.prompt': 'ルーティングテーブルの 0.0.0.0/0 は…',
  'learning.concept.ipv4.q5.a': 'サブネットのブロードキャストアドレス',
  'learning.concept.ipv4.q5.b': 'デフォルトルート — すべてに一致',
  'learning.concept.ipv4.q5.c': '無視される無効なエントリ',
  'learning.concept.ipv4.q5.why':
    'すべて 0 の /0 はあらゆる宛先に一致し、より具体的な経路が無いときに使われます。',
  'learning.concept.ipv4.q1.a.why':
    'TTL は暗号化しません。各ルータが減らすホップ数で、パケットが無限にループするのを防ぎます。',
  'learning.concept.ipv4.q1.c.why':
    '優先度は DSCP/ToS フィールドです。TTL は無限ループを防ぐホップ上限です。',
  'learning.concept.ipv4.q2.b.why':
    '48 ビットは MAC アドレスです。IPv4 アドレスは 32 ビット（4 オクテット）です。',
  'learning.concept.ipv4.q2.c.why': '128 ビットは IPv6 アドレスです。IPv4 は 32 ビットです。',
  'learning.concept.ipv4.q3.a.why':
    'DF が立っている場合だけ破棄されます。DF が立っていなければルータは MTU に合わせてフラグメント化します。',
  'learning.concept.ipv4.q3.b.why':
    'ルータは暗号化しません。DF が立っていない大きすぎるパケットはリンク MTU に合わせてフラグメント化されます。',
  'learning.concept.ipv4.q4.b.why':
    'TTL はアドレッシングと無関係なホップ数です。ネットワーク/ホストの境界はマスク/プレフィックス長が決めます。',
  'learning.concept.ipv4.q4.c.why':
    'ポートは L4 です。ネットワークとホストの境界はサブネットマスク/プレフィックス長によります。',
  'learning.concept.ipv4.q5.a.why':
    'ブロードキャストは 255.255.255.255 です。0.0.0.0/0 はあらゆる宛先に一致するデフォルトルートです。',
  'learning.concept.ipv4.q5.c.why':
    '0.0.0.0/0 は完全に有効です — 任意のアドレスに最も大まかに一致するデフォルトルートです。',
};
