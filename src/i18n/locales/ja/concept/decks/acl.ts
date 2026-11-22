import type { Catalog } from '../../../../types';

/** The `acl` deck's questions (ja); its name is in the core chunk. */
export const acl: Catalog = {
  'learning.concept.acl.q1.prompt': 'ACL がトラフィックを選別する基準は…',
  'learning.concept.acl.q1.a': 'パケットのフィールドを permit/deny ルールと照合',
  'learning.concept.acl.q1.b': 'ペイロードを暗号化して相手だけが読めるようにする',
  'learning.concept.acl.q1.c': '帯域を節約するためペイロードを圧縮する',
  'learning.concept.acl.q1.why':
    'ACL は送信元/宛先 IP やポート等のフィールドを順序付きルールと照合し、許可か拒否を決めます。',
  'learning.concept.acl.q2.prompt': 'ステートフルファイアウォールがステートレス ACL と違うのは…',
  'learning.concept.acl.q2.a': 'どんな場合も遅い',
  'learning.concept.acl.q2.b': '接続を追跡し応答を自動許可する',
  'learning.concept.acl.q2.c': 'ポート番号を完全に無視する',
  'learning.concept.acl.q2.why':
    'ステートフルは確立済みフローを記憶し、明示的な逆ルール無しで戻りトラフィックを許可します。',
  'learning.concept.acl.q3.prompt': 'ファイアウォールの安全な既定は…',
  'learning.concept.acl.q3.a': '先頭ですべて許可',
  'learning.concept.acl.q3.b': 'インタフェースにルールなし',
  'learning.concept.acl.q3.c': '既定拒否 — 明示許可以外をブロック',
  'learning.concept.acl.q3.why':
    '既定拒否は明示的に許可したトラフィックのみ通し、攻撃面を縮小します。',
  'learning.concept.acl.q1.b.why':
    'ACL は暗号化しません。パケットのフィールドを順序付きの許可/拒否ルールと照合します。',
  'learning.concept.acl.q1.c.why':
    '圧縮は帯域節約でフィルタリングと無関係です。ACL はパケットフィールドの照合で許可/拒否します。',
  'learning.concept.acl.q2.a.why':
    'ステートフルは「常に遅い」わけではありません。本質は接続を追跡し、戻りトラフィックを自動許可する点です。',
  'learning.concept.acl.q2.c.why':
    'どちらもポートを見ます。ステートフルファイアウォールはさらに接続状態を追跡し応答を自動的に許可します。',
  'learning.concept.acl.q3.a.why':
    '「permit any any」は全許可で安全の逆です。安全な既定は、明示的に許可しない限り拒否です。',
  'learning.concept.acl.q3.b.why':
    'ルールなしは暗黙の許可や未定義動作になりがちです。安全な設計は明示的な既定拒否です。',
};
