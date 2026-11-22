import type { Catalog } from '../../../../types';

/** The `arp` deck's questions (ja); its name is in the core chunk. */
export const arp: Catalog = {
  'learning.concept.arp.q1.prompt': 'ARP は何を解決する？',
  'learning.concept.arp.q1.a': 'IPv4 アドレスを MAC アドレスに',
  'learning.concept.arp.q1.b': 'ホスト名を IP アドレスに',
  'learning.concept.arp.q1.c': 'MAC アドレスをスイッチポートに',
  'learning.concept.arp.q1.why':
    'ARP は既知の IPv4 アドレスを、LAN 上でフレーム化するのに必要なリンク層の MAC に対応づけます。',
  'learning.concept.arp.q2.prompt': 'ARP リクエストの宛先 MAC は？',
  'learning.concept.arp.q2.a': 'ターゲットホスト自身の MAC',
  'learning.concept.arp.q2.b': 'ブロードキャスト ff:ff:ff:ff:ff:ff',
  'learning.concept.arp.q2.c': 'デフォルトゲートウェイの MAC アドレス',
  'learning.concept.arp.q2.why':
    'まだターゲットの MAC を知らないため、リクエストはセグメント全体にブロードキャストされます。',
  'learning.concept.arp.q3.prompt': 'ARP が働く範囲は…',
  'learning.concept.arp.q3.a': 'インターネット全体の範囲',
  'learning.concept.arp.q3.b': 'ルータとルータの間だけ',
  'learning.concept.arp.q3.c': '単一のブロードキャストドメイン',
  'learning.concept.arp.q3.why':
    'ARP はリンクローカルです。遠隔ネットワークへはリモートホストではなくゲートウェイを ARP します。',
  'learning.concept.arp.q4.prompt': 'ARP が要るのは、宛先 IP は分かるが分からないのが…',
  'learning.concept.arp.q4.a': 'MAC アドレス',
  'learning.concept.arp.q4.b': 'ポート番号',
  'learning.concept.arp.q4.c': 'ホスト名（DNS 名）',
  'learning.concept.arp.q4.why':
    'L2 フレームを作るには、ローカルリンクでその IP を持つ MAC を知る必要があります。',
  'learning.concept.arp.q5.prompt': 'ARP 応答をキャッシュするのは…',
  'learning.concept.arp.q5.a': 'ネットワークをわざと遅く保つため',
  'learning.concept.arp.q5.b': 'パケットごとに ARP しなくて済むように',
  'learning.concept.arp.q5.c': 'IP アドレスをより頻繁に変えるため',
  'learning.concept.arp.q5.why':
    'ARP キャッシュは各フレーム前のブロードキャスト探索を省きます。エントリは時間で失効します。',
  'learning.concept.arp.q1.b.why':
    'ホスト名→IP の対応づけは DNS です。ARP はローカルリンク上で既知の IP を MAC に解決します。',
  'learning.concept.arp.q1.c.why':
    'MAC→ポートはスイッチが自分で学習します。ARP は IP を MAC に解決するもので、MAC をポートに対応づけるものではありません。',
  'learning.concept.arp.q2.a.why':
    'ターゲットの MAC はまだ分かりません — それこそ ARP が問い合わせている相手です — だからリクエストはブロードキャストします。',
  'learning.concept.arp.q2.c.why':
    'ゲートウェイはサブネット外宛ての通信でのみ関係します。ARP リクエストは LAN 全体へブロードキャストします。',
  'learning.concept.arp.q3.a.why':
    'ARP はルータを越えられません。インターネット全体ではなく、1 つのブロードキャストドメイン内でのみ働きます。',
  'learning.concept.arp.q3.b.why':
    'ARP はルータ間に限りません。同一セグメント上のホストもルータも隣接の IP を ARP で解決します。境界になるのはブロードキャストドメインです。',
  'learning.concept.arp.q4.b.why':
    'ポート（L4）はアプリを選ぶもので、フレームの宛先ではありません。ARP が補うのは欠けている MAC です。',
  'learning.concept.arp.q4.c.why':
    'ホスト名は先に DNS で解決済みです。フレーム構築にまだ足りないのは MAC です。',
  'learning.concept.arp.q5.a.why':
    'キャッシュはネットワークを遅くするのではなく速くします — パケットごとの ARP 往復を省きます。',
  'learning.concept.arp.q5.c.why':
    'キャッシュは IP アドレスを変えません。しばらくの間 IP→MAC の対応を覚えておくだけです。',
};
