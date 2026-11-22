import type { Catalog } from '../../../../types';

/** The `eigrp` deck's questions (ja); its name is in the core chunk. */
export const eigrp: Catalog = {
  'learning.concept.eigrp.q1.b.why':
    'EIGRP は純粋なリンクステートではありません（それは OSPF/IS-IS）。DUAL を使う高度なディスタンスベクタです。',
  'learning.concept.eigrp.q1.c.why':
    'EIGRP はアプリケーションプロトコルではなくルーティングプロトコルです。DUAL アルゴリズムを使う高度なディスタンスベクタです。',
  'learning.concept.eigrp.q2.a.why':
    'フィージブルサクセサは暗号化ではなく事前計算済みのバックアップ経路です。即時の再収束を可能にします。',
  'learning.concept.eigrp.q2.c.why':
    'IP 割り当ては DHCP です。フィージブルサクセサはループのないバックアップで、再計算なしに EIGRP を再収束させます。',
  'learning.concept.eigrp.q3.a.why':
    'ホップ数のみは RIP です。EIGRP は帯域と遅延の複合指標を使います。',
  'learning.concept.eigrp.q3.b.why':
    'AS パスは BGP のものです。EIGRP の複合指標は帯域と遅延に基づきます。',
  'learning.concept.eigrp.q1.prompt': 'EIGRP は…',
  'learning.concept.eigrp.q1.a': '高度なディスタンスベクタ型',
  'learning.concept.eigrp.q1.b': '純粋なリンクステート型プロトコル',
  'learning.concept.eigrp.q1.c': 'アプリケーション層のプロトコル',
  'learning.concept.eigrp.q1.why':
    'EIGRP は高度なディスタンスベクタ型で、DUAL アルゴリズムが高速でループのない収束を実現します。',
  'learning.concept.eigrp.q2.prompt': 'フィージブルサクセサにより EIGRP は…',
  'learning.concept.eigrp.q2.a': '隣接間のトラフィックを暗号化する',
  'learning.concept.eigrp.q2.b': '再計算なしで高速に再収束する',
  'learning.concept.eigrp.q2.c': 'インタフェースに IP を割り当てる',
  'learning.concept.eigrp.q2.why':
    '事前計算したバックアップ経路により、主経路の障害時に即座に切り替えられます。',
  'learning.concept.eigrp.q3.prompt': 'EIGRP のメトリックの基礎は…',
  'learning.concept.eigrp.q3.a': 'ホップ数のみ（RIP と同じ）',
  'learning.concept.eigrp.q3.b': 'AS パス長（BGP と同じ）',
  'learning.concept.eigrp.q3.c': '帯域と遅延（複合）',
  'learning.concept.eigrp.q3.why':
    'EIGRP は帯域と遅延（任意で負荷/信頼性）を複合します。RIP のホップ数とは異なります。',
};
