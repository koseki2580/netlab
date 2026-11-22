import type { Catalog } from '../../../../types';

/** The `stun` deck's questions (ja); its name is in the core chunk. */
export const stun: Catalog = {
  'learning.concept.stun.q1.a.why':
    '経路選択はルーティングの仕事です。STUN はホストに自分の公開（NAT 変換後の）IP とポートを教えます。',
  'learning.concept.stun.q1.b.why':
    '名前解決は DNS です。STUN はホストの NAT 変換後の公開アドレスを明らかにし、ピアが到達できるようにします。',
  'learning.concept.stun.q2.b.why':
    'DNS ルートサーバは名前を解決しメディアは運びません。直接経路が失敗すると TURN リレーが転送します。',
  'learning.concept.stun.q2.c.why':
    'BGP は AS 間をルーティングします。遮断する NAT 越しにメディアを中継するのは TURN の役割で BGP ではありません。',
  'learning.concept.stun.q3.a.why':
    '暗号化は SRTP/DTLS です。ICE は候補アドレスを集め、動く経路を見つけるため検査します。',
  'learning.concept.stun.q3.c.why':
    'ICE は番号を割り当てません。ホスト/STUN/TURN の候補を集め、検査して動くペアを選びます。',
  'learning.concept.stun.q1.prompt': 'NAT 配下のホストが STUN で分かるのは？',
  'learning.concept.stun.q1.a': 'メディアサーバまでの最速経路',
  'learning.concept.stun.q1.b': '発信しようとしているピアの DNS 名',
  'learning.concept.stun.q1.c': '自分の公開（NAT 変換後）IP アドレスとポート',
  'learning.concept.stun.q1.why':
    'STUN サーバは見えた送信元 IP:ポートを返し、NAT が作った公開マッピングを明らかにします — ホールパンチングの基礎です。',
  'learning.concept.stun.q2.prompt':
    '直接接続が失敗したとき（例: 対称型 NAT）、メディアを運ぶのは？',
  'learning.concept.stun.q2.a': 'TURN — リレーサーバが中継する',
  'learning.concept.stun.q2.b': 'DNS ルートサーバが中継する',
  'learning.concept.stun.q2.c': 'BGP — ピアが経路を広告する',
  'learning.concept.stun.q2.why':
    'TURN はフォールバックです。ピア同士が直接届かないとき、リレーが双方のパケットを転送します — 確実ですがコストは高め。',
  'learning.concept.stun.q3.prompt': 'ICE の役割は？',
  'learning.concept.stun.q3.a': '通話を暗号化し、両端だけが聞けるようにする',
  'learning.concept.stun.q3.b': '候補アドレスを集め、接続性チェックで動くペアを選ぶ',
  'learning.concept.stun.q3.c': '各端点に発信用の番号を割り当てる',
  'learning.concept.stun.q3.why':
    'ICE は STUN と TURN を統括し、両端からホスト・反射・リレーの候補を集めて検査し、実際に動く最良の経路を見つけます。',
};
