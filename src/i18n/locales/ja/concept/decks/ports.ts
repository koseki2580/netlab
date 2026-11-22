import type { Catalog } from '../../../../types';

/** The `ports` deck's questions (ja); its name is in the core chunk. */
export const ports: Catalog = {
  'learning.concept.ports.q1.prompt': 'ポート番号が識別するのは…',
  'learning.concept.ports.q1.a': 'ホスト上のどのアプリ/サービスか',
  'learning.concept.ports.q1.b': 'パケットがどのルータを使うか',
  'learning.concept.ports.q1.c': 'ホストの MAC アドレス',
  'learning.concept.ports.q1.why':
    'IP でホストへ、ポートでその上の正しいサービスへ届きます（例: HTTPS は 443）。',
  'learning.concept.ports.q2.prompt': 'TCP 接続を一意に識別するのは…',
  'learning.concept.ports.q2.a': '宛先 IP アドレスだけ',
  'learning.concept.ports.q2.b': '5タプル（送信元と宛先の IP・ポート＋プロトコル）',
  'learning.concept.ports.q2.c': '送信元と宛先の MAC アドレスの対',
  'learning.concept.ports.q2.why':
    '5タプルにより、同じポート宛でもサーバは何千もの同時接続を区別できます。',
  'learning.concept.ports.q3.prompt': 'HTTPS サーバの既定の待受ポートは…',
  'learning.concept.ports.q3.a': '22',
  'learning.concept.ports.q3.b': '53',
  'learning.concept.ports.q3.c': '443',
  'learning.concept.ports.q3.why':
    '443 は HTTPS、80 は HTTP、22 は SSH、53 は DNS — 1024 未満のウェルノウンポートです。',
  'learning.concept.ports.q4.prompt': '1 台のサーバがポート 443 で多数のクライアントを捌けるのは…',
  'learning.concept.ports.q4.a': '送信元 IP とポートでクライアントを区別するから',
  'learning.concept.ports.q4.b': 'クライアントごとに新しい IP を開くから',
  'learning.concept.ports.q4.c': '一度に 1 クライアントしか捌けないから',
  'learning.concept.ports.q4.why':
    'サーバ側ポートは共有で、接続はタプルのクライアント側で区別されます。',
  'learning.concept.ports.q5.prompt': 'ソケットとは…',
  'learning.concept.ports.q5.a': 'ネットワークケーブルの一種',
  'learning.concept.ports.q5.b': 'エンドポイント = IP アドレス + ポート',
  'learning.concept.ports.q5.c': 'エンドポイント用のルーティングプロトコル',
  'learning.concept.ports.q5.why':
    'ソケットはサービスを（IP, ポート）に結びつけます。接続は2 つのソケットを結びます。',
  'learning.concept.ports.q6.prompt': 'DNS 参照と Web 取得が通常使うのは…',
  'learning.concept.ports.q6.a': 'どちらも TCP ポート 80 の上で行う',
  'learning.concept.ports.q6.b': 'どちらも代わりに ICMP を使う',
  'learning.concept.ports.q6.c': 'DNS は UDP/53、HTTPS は TCP/443',
  'learning.concept.ports.q6.why':
    '小さな DNS 問い合わせは UDP/53、その後ページは信頼性のある TCP/443 接続で取得します。',
  'learning.concept.ports.q1.b.why':
    'ルータの選択は IP ルーティング（L3）です。ポートはホスト上のアプリ（L4）を選びます。',
  'learning.concept.ports.q1.c.why':
    'MAC は L2 のハードウェアアドレスです。ポートはサービスを識別する L4 の番号です。',
  'learning.concept.ports.q2.a.why':
    '宛先 IP だけでは同一サーバへの多数の接続を区別できません。完全な 5タプルが必要です。',
  'learning.concept.ports.q2.c.why':
    'MAC はホップごとに変わる L2 です。接続は L3/L4 の 5タプルで識別します。',
  'learning.concept.ports.q3.a.why': 'ポート 22 は SSH です。HTTPS は 443 で待ち受けます。',
  'learning.concept.ports.q3.b.why': 'ポート 53 は DNS です。HTTPS は 443 で待ち受けます。',
  'learning.concept.ports.q4.b.why':
    'サーバの IP は 1 つのままです。クライアントは送信元 IP/ポートで区別され、サーバ IP を増やすわけではありません。',
  'learning.concept.ports.q4.c.why':
    'サーバは 1 つのポートで多数のクライアントを同時に扱います。タプルのクライアント側の違いで区別されます。',
  'learning.concept.ports.q5.a.why':
    'ソケットはハードウェアではなくソフトウェアのエンドポイント — IP アドレスとポートの組です。',
  'learning.concept.ports.q5.c.why':
    'ルーティングプロトコル（OSPF など）はルータに経路を教えるもので、パケットを転送するのはルータです。ソケットは接続のエンドポイントにすぎません。',
  'learning.concept.ports.q6.a.why':
    'DNS は通常 UDP/53、現代の Web は HTTPS の TCP/443 を使います。両方が素の TCP/80 ではありません。',
  'learning.concept.ports.q6.b.why':
    'ICMP は診断用（ping）です。DNS は UDP/53、Web 取得は TCP/443 を使います。',
};
