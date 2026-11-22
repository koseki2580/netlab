import type { Catalog } from '../../../../types';

/** The `vrrp` deck's questions (ja); its name is in the core chunk. */
export const vrrp: Catalog = {
  'learning.concept.vrrp.q1.prompt': 'VRRP が提供するのは…',
  'learning.concept.vrrp.q1.a': '仮想 IP による冗長なゲートウェイ',
  'learning.concept.vrrp.q1.b': 'ホスト名から IP への解決',
  'learning.concept.vrrp.q1.c': 'スイッチ間のループ防止',
  'learning.concept.vrrp.q1.why':
    'ホストは1 つの仮想 IP を向き、マスタ障害時に VRRP がバックアップルータへ引き継ぎます。',
  'learning.concept.vrrp.q2.prompt': 'VRRP で仮想 IP を保持するのは、ある時点で…',
  'learning.concept.vrrp.q2.a': 'グループ内の全ルータが同時に',
  'learning.concept.vrrp.q2.b': '1 台のマスタ（他はバックアップ）',
  'learning.concept.vrrp.q2.c': 'サブネットの DNS サーバ',
  'learning.concept.vrrp.q2.why':
    '1 台がマスタとして仮想 IP/MAC に応答し、バックアップは監視して障害時に引き継ぎます。',
  'learning.concept.vrrp.q3.prompt': 'VRRP が解決する問題は…',
  'learning.concept.vrrp.q3.a': '1 台のスイッチにサブネットが多すぎる',
  'learning.concept.vrrp.q3.b': 'クライアントの DNS 解決が遅い',
  'learning.concept.vrrp.q3.c': 'デフォルトゲートウェイが単一障害点になること',
  'learning.concept.vrrp.q3.why':
    'ファーストホップ冗長が無いとゲートウェイ障害でサブネット全体が孤立します。VRRP はその単一障害点を解消します。',
  'learning.concept.vrrp.q1.b.why':
    '名前解決は DNS です。VRRP は 1 つの仮想 IP の背後にある冗長なデフォルトゲートウェイをホストに与えます。',
  'learning.concept.vrrp.q1.c.why':
    'ループ防止は STP です。VRRP は共有の仮想 IP でデフォルトゲートウェイを冗長化します。',
  'learning.concept.vrrp.q2.a.why':
    '全ルータが同時に応答すると、重複や競合する返事が混ざってしまいます。だから VRRP はマスタを 1 台だけ選出します。',
  'learning.concept.vrrp.q2.c.why':
    'DNS サーバは無関係です。仮想 IP は選出されたマスタが持ち、バックアップが控えます。',
  'learning.concept.vrrp.q3.a.why':
    'VRRP はサブネット数ではなくゲートウェイ冗長の話です。単一ゲートウェイの単一障害点を取り除きます。',
  'learning.concept.vrrp.q3.b.why':
    'DNS の速度は無関係です。VRRP はデフォルトゲートウェイが単一障害点になる問題を解決します。',
};
