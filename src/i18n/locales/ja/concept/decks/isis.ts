import type { Catalog } from '../../../../types';

/** The `isis` deck's questions (ja); its name is in the core chunk. */
export const isis: Catalog = {
  'learning.concept.isis.q1.b.why':
    'ディスタンスベクタは RIP/EIGRP です。IS-IS は OSPF のようなリンクステート IGP で、ISP コアで一般的です。',
  'learning.concept.isis.q1.c.why':
    'IS-IS はアプリケーションプロトコルではありません。大規模コアで使われるリンクステートの IGP です。',
  'learning.concept.isis.q2.a.why':
    'OSPF 同様、IS-IS はホップ数ではなくリンクコストを使います。違いは IP の中ではなく L2 上で直接動く点です。',
  'learning.concept.isis.q2.c.why':
    'IS-IS は TCP を使いません — リンク層上で直接動きます（OSPF は IP の中で動く）。',
  'learning.concept.isis.q3.a.why':
    'AS パスは BGP のものです。OSPF も IS-IS も総リンクコストでダイクストラ/SPF を実行します。',
  'learning.concept.isis.q3.b.why':
    'MAC アドレスは L2 転送です。これらリンクステート IGP は最小の総リンクコストで経路を選びます。',
  'learning.concept.isis.q1.prompt': 'IS-IS は…',
  'learning.concept.isis.q1.a': 'リンクステート IGP（OSPF 同様）',
  'learning.concept.isis.q1.b': 'ディスタンスベクタ型プロトコル',
  'learning.concept.isis.q1.c': 'アプリケーション層のプロトコル',
  'learning.concept.isis.q1.why':
    'IS-IS は IGP（内部ゲートウェイプロトコル）で、リンク状態をフラッディングして SPF を走らせます。大規模な ISP 網で広く使われます。',
  'learning.concept.isis.q2.prompt': 'OSPF と比べて IS-IS は…',
  'learning.concept.isis.q2.a': '指標としてホップ数だけを使う',
  'learning.concept.isis.q2.b': 'リンク層上で直接動き、IP の中には入らない',
  'learning.concept.isis.q2.c': '隣接間で TCP セッションを必要とする',
  'learning.concept.isis.q2.why':
    'IS-IS の PDU は L2 上を直接流れます — IP 上で動く OSPF との設計上の違いです。',
  'learning.concept.isis.q3.prompt': 'OSPF と IS-IS の経路選択は…',
  'learning.concept.isis.q3.a': '最短の AS パス長',
  'learning.concept.isis.q3.b': '最小の MAC アドレス',
  'learning.concept.isis.q3.c': '総リンクコストが最小',
  'learning.concept.isis.q3.why':
    'どちらもリンクステートで、SPF により最小コスト経路を計算します。',
};
