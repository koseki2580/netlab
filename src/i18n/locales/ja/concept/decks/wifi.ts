import type { Catalog } from '../../../../types';

/** The `wifi` deck's questions (ja); its name is in the core chunk. */
export const wifi: Catalog = {
  'learning.concept.wifi.q1.prompt': 'Wi-Fi が衝突を避ける方式は…',
  'learning.concept.wifi.q1.a': 'CSMA/CA（衝突回避）',
  'learning.concept.wifi.q1.b': 'CSMA/CD（衝突検出）',
  'learning.concept.wifi.q1.c': 'トークンパッシング',
  'learning.concept.wifi.q1.why':
    '無線では衝突を確実に検出できないため、802.11 は検出ではなく、聞いてバックオフして回避します。',
  'learning.concept.wifi.q2.prompt': '無線媒体は…',
  'learning.concept.wifi.q2.a': '局ごとに全二重',
  'learning.concept.wifi.q2.b': '共有かつ半二重',
  'learning.concept.wifi.q2.c': '衝突なし',
  'learning.concept.wifi.q2.why':
    '全局が同じチャネルを共有し送受信は同時にできないため、エアタイムは競合します。',
  'learning.concept.wifi.q3.prompt': 'データ送信前、Wi-Fi クライアントはまず…',
  'learning.concept.wifi.q3.a': 'アクセスポイントと OSPF を実行する',
  'learning.concept.wifi.q3.b': 'ISP から公開 IP アドレスを取得する',
  'learning.concept.wifi.q3.c': 'アクセスポイントと結合し認証する',
  'learning.concept.wifi.q3.why':
    'クライアントはアクセスポイントを探索し、認証して結合（例: WPA2）してからトラフィックを流せます。',
  'learning.concept.wifi.q1.b.why':
    'CSMA/CD（検出）は有線 Ethernet です。無線は送信中に聞けないため、Wi-Fi は衝突回避の CSMA/CA を使います。',
  'learning.concept.wifi.q1.c.why':
    'トークンパッシングは Token Ring/FDDI です。Wi-Fi は共有の電波上で衝突を避ける CSMA/CA を使います。',
  'learning.concept.wifi.q2.a.why':
    '無線は 1 チャネルで同時に送受信できません。媒体は共有で半二重です。',
  'learning.concept.wifi.q2.c.why':
    '無線は衝突がないわけではありません — だから Wi-Fi は CSMA/CA を要します。電波は共有で半二重です。',
  'learning.concept.wifi.q3.a.why':
    'OSPF はルータのルーティングプロトコルで無関係です。Wi-Fi クライアントはまずアクセスポイントに結合します。',
  'learning.concept.wifi.q3.b.why':
    '公開 IP は不要です（NAT/プライベート IP で動きます）。まずクライアントはアクセスポイントと結合し認証します。',
};
