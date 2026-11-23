import type { Catalog } from '../../../../types';

/** The `pqkex` deck's questions (ja); its name is in the core chunk. */
export const pqkex: Catalog = {
  'learning.concept.pqkex.q1.prompt':
    '今日の TLS セッションが記録されました。現在のコンピュータ、将来の量子コンピュータ、後から見つかる ML-KEM の欠陥の 3 つすべてに対して鍵を守れる鍵交換はどれですか？',
  'learning.concept.pqkex.q1.a': '実績の長い楕円曲線 X25519 単体',
  'learning.concept.pqkex.q1.b': '耐量子の ML-KEM-768 単体',
  'learning.concept.pqkex.q1.c': 'ハイブリッドの X25519MLKEM768',
  'learning.concept.pqkex.q1.why':
    'ハイブリッドは両方の共有秘密からセッション鍵を導出するため、両方が破られたときにしか破られません。3 種類の攻撃者のどれも両方は破れません。',
  'learning.concept.pqkex.q1.a.why':
    '大規模な量子コンピュータで Shor のアルゴリズムを使うと、X25519 の楕円曲線問題が解けてしまいます。',
  'learning.concept.pqkex.q1.b.why':
    'ML-KEM はまだ新しく、後から欠陥が見つかれば、単体で守っていたセッションはすべて露出します。',
  'learning.concept.pqkex.q2.prompt':
    'X25519 単体で守られた通信が今日記録されました。数年後、大規模な量子コンピュータが実現します。どうなりますか？',
  'learning.concept.pqkex.q2.a': 'セッション鍵を復元され、中身を読まれる',
  'learning.concept.pqkex.q2.b': '安全なまま。前方秘匿性が守ってくれる',
  'learning.concept.pqkex.q2.c': '安全なまま。送った時点では安全だった',
  'learning.concept.pqkex.q2.why':
    '記録には双方の X25519 公開鍵が残っています。量子コンピュータで秘密鍵を求め、セッション鍵を再計算できます。いわゆる「今収集して、後で解読する（harvest now, decrypt later）」です。',
  'learning.concept.pqkex.q2.b.why':
    '前方秘匿性が防ぐのは後からサーバー鍵が盗まれる場合です。記録から鍵交換そのものを解かれる場合は防げません。',
  'learning.concept.pqkex.q2.c.why':
    '記録は残り続けます。「今収集して後で解読する」攻撃は、まさに送信から解読までの時間差を突きます。',
  'learning.concept.pqkex.q3.prompt':
    'ブラウザの ClientHello は鍵共有を除いて約 480 バイトです。ハイブリッドの鍵共有を使うと、TCP セグメントが 1,460 バイトの経路では何が起きますか？',
  'learning.concept.pqkex.q3.a': '少し大きくなるが 1 セグメントに収まる',
  'learning.concept.pqkex.q3.b': '2 つ目の TCP セグメントにはみ出す',
  'learning.concept.pqkex.q3.c': '完了までに往復が 1 回増える',
  'learning.concept.pqkex.q3.why':
    'ハイブリッドの鍵共有は 1,216 バイト（ML-KEM 1,184 + X25519 32）なので、ClientHello は約 1,696 バイトになり 2 セグメントで届きます。X25519 単体（約 512 バイト）なら 1 つに収まっていました。',
  'learning.concept.pqkex.q3.a.why':
    '鍵共有だけで 1,216 バイトあり、ClientHello は約 1,696 バイトと 1,460 バイトのセグメント 1 つを超えます。',
  'learning.concept.pqkex.q3.c.why':
    '2 つのセグメントは同じフライトで送られるので往復は増えません。ただし ClientHello 全体が 1 パケットに入ると想定していたミドルボックスは壊れました。',
};
