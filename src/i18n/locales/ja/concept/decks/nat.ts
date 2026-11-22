import type { Catalog } from '../../../../types';

/** The `nat` deck's questions (ja); its name is in the core chunk. */
export const nat: Catalog = {
  'learning.concept.nat.q1.prompt': 'NAT が主に可能にするのは…',
  'learning.concept.nat.q1.a': '多数のプライベートホストが公開 IP を共有',
  'learning.concept.nat.q1.b': 'スイッチが MAC アドレスを学習',
  'learning.concept.nat.q1.c': 'ルータが OSPF を実行して経路交換',
  'learning.concept.nat.q1.why':
    'ソース NAT/PAT はプライベートアドレスを公開アドレスに（ポートを追跡して）書き換え、LAN 全体が公開 IP を共有します。',
  'learning.concept.nat.q2.prompt': '外部から内部サーバへ届かせるには…',
  'learning.concept.nat.q2.a': 'デフォルトルートの設定',
  'learning.concept.nat.q2.b': 'ポートフォワーディング（DNAT）',
  'learning.concept.nat.q2.c': 'VLAN トランクの設定',
  'learning.concept.nat.q2.why':
    'DNAT は公開 ip:port を内部 host:port に対応づけ、外部クライアントが到達できるようにします。',
  'learning.concept.nat.q3.prompt': 'NAT が変換テーブルを保持するのは…',
  'learning.concept.nat.q3.a': '外へ出るトラフィックを暗号化するため',
  'learning.concept.nat.q3.b': 'セグメントのルートブリッジを選出するため',
  'learning.concept.nat.q3.c': '応答を正しい内部ホストに戻すため',
  'learning.concept.nat.q3.why':
    'テーブルは inside-local↔inside-global の対応を記憶し、戻りパケットを正しく逆変換します。',
  'learning.concept.nat.q1.b.why':
    'スイッチの MAC 学習は L2 の機能です。NAT の仕事は多数のプライベートホストが 1 つの公開 IP を共有できるようにすることです。',
  'learning.concept.nat.q1.c.why':
    'OSPF はルーティングプロトコルです。NAT はアドレスを書き換え、プライベート網が公開 IP を共有できるようにします。',
  'learning.concept.nat.q2.a.why':
    'デフォルトルートは外向きの通信を送り出します。外から内部サーバへ届かせるにはポートフォワーディング（DNAT）が必要です。',
  'learning.concept.nat.q2.c.why':
    'VLAN トランクはスイッチ間で L2 の VLAN を運びます。内部サーバの公開はポートフォワーディング（DNAT）で行います。',
  'learning.concept.nat.q3.a.why':
    'NAT は暗号化しません。テーブルは応答を正しい内部ホストとポートへ戻すために存在します。',
  'learning.concept.nat.q3.b.why':
    'ルートブリッジ選出は STP（L2）です。NAT のテーブルは戻りの通信を正しい内部ホストに対応づけます。',
};
