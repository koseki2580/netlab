import type { Catalog } from '../../../../types';

/** The `dns` deck's questions (ja); its name is in the core chunk. */
export const dns: Catalog = {
  'learning.concept.dns.q1.prompt': 'DNS が変換するのは…',
  'learning.concept.dns.q1.a': 'ホスト名を IP アドレスに',
  'learning.concept.dns.q1.b': 'IP アドレスを MAC アドレスに',
  'learning.concept.dns.q1.c': 'ポートをサービス名に',
  'learning.concept.dns.q1.why':
    'DNS は example.com のような人間向けの名前を、接続に必要な IP アドレスへ解決します。',
  'learning.concept.dns.q2.prompt': '名前を IPv4 アドレスに対応づけるレコードは？',
  'learning.concept.dns.q2.a': 'MX',
  'learning.concept.dns.q2.b': 'A',
  'learning.concept.dns.q2.c': 'CNAME',
  'learning.concept.dns.q2.why':
    'A レコードは IPv4 アドレスを保持します。AAAA は IPv6、MX はメール、CNAME は別名です。',
  'learning.concept.dns.q3.prompt': '再帰リゾルバは…',
  'learning.concept.dns.q3.a': '自分が持つゾーンからのみ答える',
  'learning.concept.dns.q3.b': 'MAC アドレスだけをキャッシュする',
  'learning.concept.dns.q3.c': '答えが出るまで他サーバへ問い合わせる',
  'learning.concept.dns.q3.why':
    '再帰リゾルバは DNS 階層（ルート→TLD→権威）をたどり、最終的な答えを返します。',
  'learning.concept.dns.q4.prompt': 'DNS 応答のキャッシュは…',
  'learning.concept.dns.q4.a': '再参照を高速化する（TTL を尊重）',
  'learning.concept.dns.q4.b': '返される IP アドレスを変える',
  'learning.concept.dns.q4.c': 'DNS 標準で禁止されている',
  'learning.concept.dns.q4.why':
    'リゾルバはレコードを TTL の間キャッシュし、人気の名前は再問い合わせなしで即解決します。',
  'learning.concept.dns.q5.prompt': 'AAAA レコードが保持するのは…',
  'learning.concept.dns.q5.a': 'IPv4 アドレス',
  'learning.concept.dns.q5.b': 'IPv6 アドレス',
  'learning.concept.dns.q5.c': 'メールサーバ名',
  'learning.concept.dns.q5.why': 'A は IPv4、AAAA は IPv6、MX はメール、CNAME は別名です。',
  'learning.concept.dns.q1.b.why':
    'IP→MAC はローカルリンク上の ARP の役割です。DNS は人間が読む名前を IP アドレスに対応づけます。',
  'learning.concept.dns.q1.c.why':
    'ポートは単なる既知の番号です。DNS は名前を IP アドレスに解決するもので、ポートを名前に対応づけるものではありません。',
  'learning.concept.dns.q2.a.why':
    'MX レコードはホストの IPv4 ではなくメールサーバを指します。名前→IPv4 のレコードは A です。',
  'learning.concept.dns.q2.c.why':
    'CNAME はアドレスではなく別の名前への別名です。IPv4 の対応は A レコードです。',
  'learning.concept.dns.q3.a.why':
    '自分のゾーンからのみ答えるのは権威サーバです。再帰リゾルバはあなたの代わりに答えを追いかけます。',
  'learning.concept.dns.q3.b.why':
    'DNS がキャッシュするのは名前→IP の答えで MAC ではありません。再帰リゾルバは名前が解決するまで他サーバへ問い合わせます。',
  'learning.concept.dns.q4.b.why':
    'キャッシュは既存の答えを再利用します。IP を変えることはなく、TTL が切れるまで提供するだけです。',
  'learning.concept.dns.q4.c.why':
    'キャッシュは禁止どころか推奨されます。TTL はまさにリゾルバが安全にキャッシュできるよう存在します。',
  'learning.concept.dns.q5.a.why':
    'IPv4 アドレスは A レコードに入ります。クアッド A（AAAA）レコードは IPv6 アドレスを保持します。',
  'learning.concept.dns.q5.c.why':
    'メールサーバ名は MX レコードです。AAAA は IPv6 アドレスを保持します。',
};
