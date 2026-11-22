import type { Catalog } from '../../../../types';

/** The `radius` deck's questions (ja); its name is in the core chunk. */
export const radius: Catalog = {
  'learning.concept.radius.q1.b.why':
    'ルーティングはネットワーク間でパケットを動かします。802.1X はポートベースのアクセス制御で、ポートを開く前に認証します。',
  'learning.concept.radius.q1.c.why':
    '名前解決は DNS です。802.1X は機器が認証するまでネットワークアクセスを遮ります。',
  'learning.concept.radius.q2.a.why':
    'RADIUS はルーティングプロトコルではありません。認証・認可・アカウンティングの AAA サーバプロトコルです。',
  'learning.concept.radius.q2.c.why':
    'トンネリングはトラフィックを運びます（L2TP/GRE）。RADIUS は AAA（認証・認可・アカウンティング）を扱います。',
  'learning.concept.radius.q3.a.why':
    'サプリカントは接続しようとするクライアントです。資格情報を中継するスイッチ/AP がオーセンティケータです。',
  'learning.concept.radius.q3.b.why':
    'DNS サーバは名前を解決します。資格情報を RADIUS サーバへ渡す機器がオーセンティケータです。',
  'learning.concept.radius.q1.prompt': '802.1X が提供するのは…',
  'learning.concept.radius.q1.a': 'ポートベースのネットワークアクセス制御',
  'learning.concept.radius.q1.b': 'ネットワーク間のルーティング',
  'learning.concept.radius.q1.c': '名前からアドレスへの解決',
  'learning.concept.radius.q1.why':
    '802.1X はクライアントが認証するまでスイッチポートや Wi-Fi を遮断します。',
  'learning.concept.radius.q2.prompt': 'RADIUS は…',
  'learning.concept.radius.q2.a': 'ルーティングプロトコル',
  'learning.concept.radius.q2.b': 'AAA サーバプロトコル',
  'learning.concept.radius.q2.c': 'トンネリングプロトコル',
  'learning.concept.radius.q2.why': 'RADIUS は誰がアクセスできるかの判断とログを集中管理します。',
  'learning.concept.radius.q3.prompt': '802.1X で資格情報を中継するスイッチ/AP は…',
  'learning.concept.radius.q3.a': 'サプリカント',
  'learning.concept.radius.q3.b': 'DNS サーバ',
  'learning.concept.radius.q3.c': 'オーセンティケータ',
  'learning.concept.radius.q3.why':
    'サプリカント（クライアント）↔ オーセンティケータ（スイッチ/AP）↔ 認証サーバ（RADIUS）。',
};
