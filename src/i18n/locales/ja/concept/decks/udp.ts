import type { Catalog } from '../../../../types';

/** The `udp` deck's questions (ja); its name is in the core chunk. */
export const udp: Catalog = {
  'learning.concept.udp.q1.prompt': 'TCP と比べて UDP は…',
  'learning.concept.udp.q1.a': '失われたデータの再送を加える',
  'learning.concept.udp.q1.b': 'データの順序を保証する',
  'learning.concept.udp.q1.c': 'ハンドシェイクも配送保証もない',
  'learning.concept.udp.q1.why':
    'UDP はコネクションレスの投げっぱなし — 低オーバーヘッドで信頼性なしです。',
  'learning.concept.udp.q2.prompt': 'UDP が向くのは…',
  'learning.concept.udp.q2.a': '大きなファイルのダウンロード',
  'learning.concept.udp.q2.b': 'リアルタイム音声/映像や DNS',
  'learning.concept.udp.q2.c': '銀行取引',
  'learning.concept.udp.q2.why':
    '遅延に敏感な、または単純な要求/応答は、TCP の信頼性コストより UDP の低オーバーヘッドを好みます。',
  'learning.concept.udp.q3.prompt': 'UDP ヘッダに含まれるのは…',
  'learning.concept.udp.q3.a': '送信元/宛先ポート・長さ・チェックサム',
  'learning.concept.udp.q3.b': 'シーケンス番号と確認応答番号',
  'learning.concept.udp.q3.c': '輻輳ウィンドウ',
  'learning.concept.udp.q3.why':
    'UDP は最小限 — ポート・長さ・任意のチェックサムのみで、接続状態を持ちません。',
  'learning.concept.udp.q4.prompt': 'UDP データグラムが失われると、プロトコルは…',
  'learning.concept.udp.q4.a': '何もしない — 必要ならアプリが対処する',
  'learning.concept.udp.q4.b': 'タイムアウト後に自動で再送する',
  'learning.concept.udp.q4.c': '接続をリセットしてやり直す',
  'learning.concept.udp.q4.why':
    'UDP は信頼性を提供しません。必要なアプリ（または損失を許容するアプリ）が上位で実装します。',
  'learning.concept.udp.q5.prompt': 'DNS が UDP をよく使うのは…',
  'learning.concept.udp.q5.a': 'UDP が与える暗号化が要るから',
  'learning.concept.udp.q5.b': '小さな問い合わせと応答は簡単に再試行できるから',
  'learning.concept.udp.q5.c': 'UDP が与える厳密な順序が要るから',
  'learning.concept.udp.q5.why':
    '単一の小さなやり取りに TCP の確立コストは見合わず、損失時はクライアントが再試行するだけです。',
  'learning.concept.udp.q1.a.why':
    '再送は TCP の機能です。UDP は送りっぱなしで、再送が必要ならアプリの仕事です。',
  'learning.concept.udp.q1.b.why':
    '順序保証は TCP のものです。UDP のデータグラムは順不同で届くことも、届かないこともあります。',
  'learning.concept.udp.q2.a.why':
    '大きなダウンロードは全バイトが欠けず順序通りである必要があり、それは TCP の信頼性で UDP ではありません。',
  'learning.concept.udp.q2.c.why':
    '銀行取引は確実な配送を要します。ベストエフォートの UDP ではなく TCP が必要です。',
  'learning.concept.udp.q3.b.why':
    'シーケンス番号や確認応答番号は TCP の信頼性のものです。UDP のヘッダはポート・長さ・チェックサムだけです。',
  'learning.concept.udp.q3.c.why':
    '輻輳ウィンドウは TCP の仕組みです。UDP はコネクションレスで絞るものがありません。',
  'learning.concept.udp.q4.b.why':
    '再送は TCP です。UDP は再送せず、回復が必要ならアプリの仕事です。',
  'learning.concept.udp.q4.c.why':
    'UDP にはリセットする接続がありません。失われたデータグラムはアプリが再送しない限り消えるだけです。',
  'learning.concept.udp.q5.a.why':
    'UDP 自体は暗号化しません。DNS が使うのは小さな問い合わせ/応答が速く再試行も容易だからです。',
  'learning.concept.udp.q5.c.why':
    'UDP は順序を保証しません（それは TCP）。そもそも小さな DNS のやり取りに順序は不要で、だから軽量な UDP が適します。',
};
