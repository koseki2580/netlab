import type { Catalog } from '../../../../types';

/** The `encdns` deck's questions (ja); its name is in the core chunk. */
export const encdns: Catalog = {
  'learning.concept.encdns.q1.prompt':
    'カフェのネットワークは、名前を読み続けるために暗号化 DNS をポート番号でブロックします。Web まで止めずにはその方法でブロックできないのはどれですか？',
  'learning.concept.encdns.q1.a': 'TCP 853 の DNS over TLS',
  'learning.concept.encdns.q1.b': 'TCP 443 の DNS over HTTPS',
  'learning.concept.encdns.q1.c': 'UDP 853 の DNS over QUIC',
  'learning.concept.encdns.q1.why':
    'DoH は普通の HTTPS と同じ TCP 443 の中を流れます。止めるにはリゾルバのアドレスを把握してそれをブロックするしかありません。',
  'learning.concept.encdns.q1.a.why':
    '853 番ポートは DNS 専用なので、ルール 1 つで DoT を止められます。端末は平文の DNS にフォールバックするか、名前解決に失敗します。',
  'learning.concept.encdns.q1.c.why':
    'DoQ も専用の UDP 853 番を使うので、ブロックしても他の通信には影響しません。',
  'learning.concept.encdns.q2.prompt':
    'UDP 53 番の従来の DNS では、カフェのネットワークはあなたの問い合わせに何ができますか？',
  'learning.concept.encdns.q2.a': '名前は読めるが、応答は書き換えられない',
  'learning.concept.encdns.q2.b': '問い合わせがあったことしか分からない',
  'learning.concept.encdns.q2.c': '名前を読め、応答の偽造もできる',
  'learning.concept.encdns.q2.why':
    '従来の DNS はリゾルバまでの経路で暗号化も認証もされません。ネットワークは名前を読み、先回りして自前の応答を返せます。',
  'learning.concept.encdns.q2.a.why':
    '経路上で応答を守るものがないため、ネットワークはリゾルバになりすまして応答できます。',
  'learning.concept.encdns.q2.b.why': '問い合わせは名前も含めて平文で流れています。',
  'learning.concept.encdns.q3.prompt':
    'DNS over TLS に切り替えました。問い合わせた名前をすべて読めるのは、依然として誰ですか？',
  'learning.concept.encdns.q3.a': '自分で選んだリゾルバ',
  'learning.concept.encdns.q3.b': '誰も読めない。サイトまで暗号化される',
  'learning.concept.encdns.q3.c': '853 番を監視しているカフェ',
  'learning.concept.encdns.q3.why':
    '暗号化 DNS が守るのは経路であって、相手先ではありません。信頼する相手がローカルネットワークから、選んだリゾルバへ移るだけです。',
  'learning.concept.encdns.q3.b.why':
    '暗号化はあなたからリゾルバまでです。リゾルバは答えるために問い合わせを読む必要があります。',
  'learning.concept.encdns.q3.c.why':
    'カフェに見えるのは 853 番を使っていることと相手のリゾルバだけで、中の名前は見えません。',
};
