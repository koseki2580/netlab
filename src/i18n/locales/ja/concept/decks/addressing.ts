import type { Catalog } from '../../../../types';

/** The `addressing` deck's questions (ja); its name is in the core chunk. */
export const addressing: Catalog = {
  'learning.concept.addressing.q1.prompt': 'MAC アドレスがフレームを届けるのは…',
  'learning.concept.addressing.q1.a': 'ローカルリンク上の次の機器へ（L2）',
  'learning.concept.addressing.q1.b': 'インターネット全体を単独で越えて',
  'learning.concept.addressing.q1.c': 'ホスト上の TCP ポートへ',
  'learning.concept.addressing.q1.why':
    'MAC はリンクローカルで、同一セグメントのネクストホップへフレームを運び、各ルータで書き換えられます。',
  'learning.concept.addressing.q2.prompt': 'IP アドレスがパケットを届けるのは…',
  'learning.concept.addressing.q2.a': '1 本のケーブルの中だけ',
  'learning.concept.addressing.q2.b': 'ネットワークを越えて端から端へ',
  'learning.concept.addressing.q2.c': '特定のアプリケーションへ',
  'learning.concept.addressing.q2.why':
    'IP の送信元/宛先は（NAT を除き）端から端まで一定で、ルータはこれを使って各ホップの経路を選びます。',
  'learning.concept.addressing.q3.prompt': '別サブネットのホスト宛では、フレームは…',
  'learning.concept.addressing.q3.a': '宛先ホストの MAC アドレスへ直接届く',
  'learning.concept.addressing.q3.b': '止まらないブロードキャストになる',
  'learning.concept.addressing.q3.c': 'デフォルトゲートウェイの MAC へ',
  'learning.concept.addressing.q3.why':
    'サブネット外ではゲートウェイを ARP します。L2 宛先はゲートウェイ MAC、L3 宛先は最終ホストのまま — これが L2/L3 分離の核心です。',
  'learning.concept.addressing.q4.prompt': 'プライベート IP（10.0.0.0/8, 192.168.0.0/16）は…',
  'learning.concept.addressing.q4.a': '再利用でき、公開インターネットには出ない',
  'learning.concept.addressing.q4.b': '公開アドレスと同じく世界で一意',
  'learning.concept.addressing.q4.c': 'ルータとスイッチだけが使う',
  'learning.concept.addressing.q4.why':
    'プライベートアドレスは NAT の背後でどこでも再利用されます。世界で一意でルーティング可能なのは公開アドレスだけです。',
  'learning.concept.addressing.q5.prompt': 'ブロードキャストが届くのは…',
  'learning.concept.addressing.q5.a': '特定の 1 台のホストだけ',
  'learning.concept.addressing.q5.b': 'ブロードキャストドメイン内の全ホスト',
  'learning.concept.addressing.q5.c': '購読したグループのホストのみ',
  'learning.concept.addressing.q5.why':
    'ブロードキャスト=セグメントの全ホスト（例: ARP リクエスト）、ユニキャスト=1 ホスト、マルチキャスト=参加したグループ。',
  'learning.concept.addressing.q6.prompt': 'インターネットに NAT が必要な理由は？',
  'learning.concept.addressing.q6.a': '網から出るトラフィックを暗号化するため',
  'learning.concept.addressing.q6.b': '名前を IP アドレスに解決するため',
  'learning.concept.addressing.q6.c': 'プライベートホストが希少な公開 IPv4 を共有するため',
  'learning.concept.addressing.q6.why':
    'NAT はプライベート網全体が少数の公開 IPv4 を共有できるようにし、IPv4 枯渇を回避します。',
  'learning.concept.addressing.q1.b.why':
    'MAC はローカルリンク内でのみ意味を持ちます。ネットワークをまたぐのは IP アドレス（L3）の役割です。',
  'learning.concept.addressing.q1.c.why':
    'TCP ポートはアプリケーション（L4）を選びます。MAC は同じ線上の次の機器に届けるだけ（L2）です。',
  'learning.concept.addressing.q2.a.why':
    '1 本のケーブル内に留まるのは L2（MAC）です。IP アドレスは多数のリンクをまたいで端から端へ転送します。',
  'learning.concept.addressing.q2.c.why':
    '特定のアプリへ届けるのはポート（L4）の役割です。IP はパケットをホスト（L3）まで届けるだけです。',
  'learning.concept.addressing.q3.a.why':
    'サブネット外では宛先ホストの MAC に直接は届きません（別リンク上）。代わりにゲートウェイへ ARP します。',
  'learning.concept.addressing.q3.b.why':
    'ブロードキャストはサブネットを越えません。フレームはゲートウェイの MAC へ送られ、その後 IP ルーティングが引き継ぎます。',
  'learning.concept.addressing.q4.b.why':
    '同じプライベートレンジ（例: 10.0.0.0/8）は無数のネットワークに同時に存在するため、世界で一意とは正反対です。',
  'learning.concept.addressing.q4.c.why':
    'プライベートレンジはルータ専用ではなく、内部の任意のホスト（スマホ・サーバ・PC）が使います。',
  'learning.concept.addressing.q5.a.why':
    '特定の 1 ホストへ届けるのはユニキャストです。ブロードキャストはドメイン内の全ホストへ届きます。',
  'learning.concept.addressing.q5.c.why':
    '購読グループへの配送はマルチキャストです。ブロードキャストはブロードキャストドメインの全員へ届きます。',
  'learning.concept.addressing.q6.a.why':
    '暗号化は TLS の役割で NAT ではありません。NAT はアドレスを書き換え、プライベートホストが公開 IP を共有できるようにします。',
  'learning.concept.addressing.q6.b.why':
    '名前解決は DNS です。NAT は枯渇しがちな IPv4 アドレスを引き伸ばすために存在し、名前を引くものではありません。',
  'learning.concept.addressing.q7.prompt':
    'ある部署に 50 台が必要です。それが入る最も小さいサブネットは？',
  'learning.concept.addressing.q7.why':
    '/n には 2^(32−n) − 2 台が入ります（ネットワークとブロードキャストのアドレスを除く）。/27 は 30 台で足りず、/26 は 62 台で足ります。/25 では 64 個のアドレスが無駄になります。',
  'learning.concept.addressing.q7.a': '30 台が入る /27',
  'learning.concept.addressing.q7.a.why': '30 は 50 より少ないので、小さすぎます。',
  'learning.concept.addressing.q7.b': '62 台が入る /26',
  'learning.concept.addressing.q7.c': '126 台が入る /25',
  'learning.concept.addressing.q7.c.why':
    '入りますが、半分の大きさの /26 でも足ります。VLSM では必要なだけを割り当てます。',
  'learning.concept.addressing.q8.prompt': 'VLSM で、最も大きい部署から先に割り当てるのはなぜ？',
  'learning.concept.addressing.q8.why':
    'サブネットは自分のサイズの倍数の位置から始まります。大きいものから置き、残りをすき間なく詰めていくと、あとの小さいサブネットも必ず区切りの位置に来ます。',
  'learning.concept.addressing.q8.a': '大きいサブネットはルータが多く要る',
  'learning.concept.addressing.q8.a.why': 'ルータの数はサブネットの大きさとは関係ありません。',
  'learning.concept.addressing.q8.b': '小さいサブネットはあとで経路にできない',
  'learning.concept.addressing.q8.b.why':
    'どのサブネットも、作ればいつでも経路にできます。順番は関係ありません。',
  'learning.concept.addressing.q8.c': 'どれもサイズの倍数の位置から始められる',
  'learning.concept.addressing.q9.prompt':
    '2 進数のオクテット 11000000 は、10 進数でいくつ？ どのマスクのオクテット？',
  'learning.concept.addressing.q9.why':
    '各ビットの重みは 128・64・32・16・8・4・2・1 です。11000000 は 128 + 64 = 192。マスクなら最後のオクテットに 1 が 2 つで、/24 + 2 = /26 です。',
  'learning.concept.addressing.q9.a': '192：1 が 2 つの /26 のもの',
  'learning.concept.addressing.q9.b': '128：1 が 1 つの /25 のもの',
  'learning.concept.addressing.q9.b.why':
    '128 は 10000000（1 が 1 つ）です。ここでは 2 つあります。',
  'learning.concept.addressing.q9.c': '224：1 が 3 つの /27 のもの',
  'learning.concept.addressing.q9.c.why': '224 は 11100000（1 が 3 つ）です。ここでは 2 つです。',
};
