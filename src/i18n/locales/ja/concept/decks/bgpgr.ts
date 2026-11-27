import type { Catalog } from '../../../../types';

/** The `bgpgr` deck's questions (ja); its name is in the core chunk. */
export const bgpgr: Catalog = {
  'learning.concept.bgpgr.q1.prompt':
    'R1 の BGP プロセスが再起動し、フォワーディングプレーンは転送を続けます。R2 は R1 の配下へのほかの経路を持たず、グレースフルリスタートもなしです。セッション断はすぐ見え、セッションは 45 秒後に戻り、R1 の経路はその 15 秒後の End-of-RIB の直前に送り直されます。R2 の通信が失われるのはどれくらい？',
  'learning.concept.bgpgr.q1.a': '失われない（R1 は転送を続けた）',
  'learning.concept.bgpgr.q1.b': '45 秒（セッションが戻るまで）',
  'learning.concept.bgpgr.q1.c': '60 秒（経路が戻るまで）',
  'learning.concept.bgpgr.q1.why':
    'GR がないと、R2 はセッションが切れたときに R1 の経路を取り消し、経路が送り直される（60 秒の End-of-RIB まで）まで通信の送り先がありません。',
  'learning.concept.bgpgr.q1.a.why':
    'R1 は転送できますが、R2 がもう R1 へ送りません。GR がないので、R2 はセッション断の時点で R1 の経路を取り消しています。',
  'learning.concept.bgpgr.q1.b.why':
    'セッションが上がっただけでは経路はまだ送り直されていません。更新が届くまで（End-of-RIB まで）R2 には R1 経由の経路がありません。',
  'learning.concept.bgpgr.q2.prompt':
    'R1 の BGP プロセスが再起動し、フォワーディングプレーンは転送を続けます。セッションは 45 秒後に戻り、その 15 秒後に End-of-RIB が届きます。グレースフルリスタートは Restart Time 120 秒でネゴシエート済みです。R1 の再起動中、R2 は R1 の経路をどう扱う？',
  'learning.concept.bgpgr.q2.a': 'stale として残し、End-of-RIB まで転送に使う',
  'learning.concept.bgpgr.q2.b': '取り消してから、R1 を最大 120 秒待つ',
  'learning.concept.bgpgr.q2.c': 'ちょうど 120 秒残してから消す',
  'learning.concept.bgpgr.q2.why':
    'ヘルパーは経路に stale の印を付けて残し、R1 への転送を続けるので通信は失われません。End-of-RIB（60 秒）で送り直された経路に置き換わります。',
  'learning.concept.bgpgr.q2.b.why':
    '取り消すのは GR がない場合の動きで、通信は失われます。GR は経路を残すための仕組みです。',
  'learning.concept.bgpgr.q2.c.why':
    'Restart Time はセッションが戻るのを待つ上限にすぎません。戻ったあとは stale の経路は End-of-RIB まで残ります。',
  'learning.concept.bgpgr.q3.prompt':
    'R1 の電源が落ち、フォワーディングプレーンも止まりました。GR はあり（Restart Time 120 秒）、BFD は 300 ms × 3 で 0.9 秒で気づきますが C ビットは 0 で、R2 は再起動の可能性として扱います。R1 は戻りません。R2 には R3 経由のバックアップがあり、R1 経由の経路がないときだけ使われ、切り替えは一瞬です。通信の断は？',
  'learning.concept.bgpgr.q3.a': '約 0.9 秒（BFD が気づくまで）',
  'learning.concept.bgpgr.q3.b': '約 121 秒（Restart Time が切れるまで）',
  'learning.concept.bgpgr.q3.c': '失われない（バックアップが引き継ぐ）',
  'learning.concept.bgpgr.q3.why':
    'R2 は止まった R1 経由の stale の経路を Restart Time いっぱい残し、バックアップへ移るのは 0.9 + 120 = 120.9 秒後です。',
  'learning.concept.bgpgr.q3.a.why':
    'BFD は気づきましたが、C ビットが 0 だと BFD の断は再起動にすぎない可能性があるので、GR のヘルパーは stale の経路を残します。',
  'learning.concept.bgpgr.q3.c.why':
    'バックアップは R1 経由の経路がないときだけ使われますが、R2 は Restart Time のあいだ stale の経路を持っています。',
  'learning.concept.bgpgr.q4.prompt':
    'R2 は R1 とグレースフルリスタート（Restart Time 120 秒）を使い、R3 経由のバックアップを持ち、R1 との BFD は C ビットが 0 です。コントロールプレーンの再起動では GR を活かしつつ、R1 が本当に止まったときは 1 秒以内にバックアップへ移るには、どれを変える？',
  'learning.concept.bgpgr.q4.a': 'C ビットが 1 の（コントロールプレーンから独立した）BFD',
  'learning.concept.bgpgr.q4.b': 'R1 の Restart Time を長くする',
  'learning.concept.bgpgr.q4.c': '両方のルータの BGP ホールドタイムを短くする',
  'learning.concept.bgpgr.q4.why':
    'C ビットが 1 の BFD はコントロールプレーンの再起動中も落ちないので GR は働き、落ちたならフォワーディングプレーンの障害なので、R2 は 0.9 秒で経路を消します。',
  'learning.concept.bgpgr.q4.b.why':
    'Restart Time を長くすると、止まったルータへの転送がさらに長く続きます。',
  'learning.concept.bgpgr.q4.c.why':
    'ホールドタイムは 3 秒未満にはできない（RFC 4271）ので 1 秒以内には気づけません。さらに RFC 8538 の GR があると、そのあと Restart Time のあいだ stale の経路を残します。',
};
