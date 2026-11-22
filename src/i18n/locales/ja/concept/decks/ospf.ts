import type { Catalog } from '../../../../types';

/** The `ospf` deck's questions (ja); its name is in the core chunk. */
export const ospf: Catalog = {
  'learning.concept.ospf.q1.prompt': 'OSPF は…',
  'learning.concept.ospf.q1.a': 'リンクステート型プロトコル',
  'learning.concept.ospf.q1.b': 'ディスタンスベクタ型プロトコル',
  'learning.concept.ospf.q1.c': 'パスベクタ型プロトコル',
  'learning.concept.ospf.q1.why':
    'OSPF はリンクステート広告をフラッディングし、全ルータが同じ地図を作って SPF（ダイクストラ）を実行します。',
  'learning.concept.ospf.q2.prompt': 'OSPF が最良経路を選ぶ基準は…',
  'learning.concept.ospf.q2.a': '最小のホップ数',
  'learning.concept.ospf.q2.b': '総リンクコストが最小',
  'learning.concept.ospf.q2.c': '最短の AS パス長',
  'learning.concept.ospf.q2.why':
    'OSPF はリンクごとのコストを合算し、総コスト最小が勝ちます。RIP のホップ数とは異なります。',
  'learning.concept.ospf.q3.prompt': 'リンク障害時、OSPF は…',
  'learning.concept.ospf.q3.a': '次の定期タイマが来るのを待つだけ',
  'learning.concept.ospf.q3.b': '次の定期更新まで何もしない',
  'learning.concept.ospf.q3.c': 'LSA を再フラッディングし最短経路を再計算する',
  'learning.concept.ospf.q3.why':
    'トポロジ変化が新しい LSA と SPF 再計算を引き起こし、OSPF は障害を迂回して再収束します。',
  'learning.concept.ospf.q1.b.why':
    'ディスタンスベクタは RIP/EIGRP です。OSPF はリンクステートで、各ルータが完全な地図を作り SPF を実行します。',
  'learning.concept.ospf.q1.c.why':
    'パスベクタは BGP です。OSPF は LSA をフラッディングし最短経路を計算するリンクステート IGP です。',
  'learning.concept.ospf.q2.a.why':
    'ホップ数は RIP の指標です。OSPF は素のホップ数ではなくリンクコスト（多くは帯域ベース）の合計で選びます。',
  'learning.concept.ospf.q2.c.why':
    'AS パス長は BGP のものです。AS 内では OSPF は総リンクコストで選びます。',
  'learning.concept.ospf.q3.a.why':
    'OSPF はタイマを受け身で待つのではなく、LSA を再フラッディングして即座に変化へ反応します。',
  'learning.concept.ospf.q3.b.why':
    '何もしなければ死んだリンクへ通信を送り続けてしまいます。リンクステートは設計上、変化を全ルータへフラッディングして反応します。',
};
