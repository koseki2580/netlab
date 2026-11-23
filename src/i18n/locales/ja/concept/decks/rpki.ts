import type { Catalog } from '../../../../types';

/** The `rpki` deck's questions (ja); its name is in the core chunk. */
export const rpki: Catalog = {
  'learning.concept.rpki.q1.prompt':
    'ROA は 192.0.2.0/24、maxLength 24、オリジン AS64500 です。AS64511 が 192.0.2.0/25 を広告しました。経路オリジン検証（ROV）の判定は？',
  'learning.concept.rpki.q1.a': 'NotFound：/25 そのものを載せた ROA がない',
  'learning.concept.rpki.q1.b': 'Invalid：ROA がカバーしているがオリジンがちがう',
  'learning.concept.rpki.q1.c': 'Valid：/24 の ROA は中の /25 もすべてカバーする',
  'learning.concept.rpki.q1.why':
    '192.0.2.0/24 の ROA は /25 をカバーしますが、AS64511 を載せた ROA はありません（しかも /25 は maxLength 24 を超えます）。そのため RFC 6811 では Invalid です。',
  'learning.concept.rpki.q1.a.why':
    'ROA はそのプレフィックスに含まれる細かいプレフィックスもカバーするので、/25 はカバーされています。NotFound はどの ROA にもカバーされない場合だけです。',
  'learning.concept.rpki.q1.c.why':
    'カバーすることと認めることは別です。ROA が許すのは AS64500 の /24 までなので、AS64511 の /25 はどちらも合いません。',
  'learning.concept.rpki.q2.prompt':
    'ルータには持ち主の 192.0.2.0/24（Valid）と AS64511 の 192.0.2.0/25（Invalid）が届き、Invalid は捨てる設定です。192.0.2.10 宛てのパケットはどこへ行く？',
  'learning.concept.rpki.q2.a': '/24 に従い、持ち主の AS64500 へ',
  'learning.concept.rpki.q2.b': '/25 に従う（それでも最長一致が勝つ）',
  'learning.concept.rpki.q2.c': 'どこにも届かない（ブロックごと遮断）',
  'learning.concept.rpki.q2.why':
    'ROV があると /25 はテーブルに入らないので、192.0.2.10 を含む最も長い経路は持ち主の /24 です。ROV がなければ /25 のほうが長く、そちらが選ばれます。',
  'learning.concept.rpki.q2.b.why':
    '最長一致はテーブルにある経路の中から選びます。Invalid を捨てると、転送が見る前に /25 は消えています。',
  'learning.concept.rpki.q2.c.why':
    '捨てるのは Invalid の /25 だけです。持ち主の Valid な /24 は残り、192.0.2.10 を含んでいます。',
  'learning.concept.rpki.q3.prompt':
    '203.0.113.0/24 には ROA がまったくなく、NotFound です。Invalid を捨てるルータでも、この経路を残すのはなぜ？',
  'learning.concept.rpki.q3.a': 'BGP が署名のないプレフィックスのオリジンを確かめるから',
  'learning.concept.rpki.q3.b': 'NotFound はバリデータが止まっている印なので残すから',
  'learning.concept.rpki.q3.c': 'ROA のないプレフィックスは多く、捨てると届く網が切れるから',
  'learning.concept.rpki.q3.why':
    'ROV が始まった頃はまだ ROA のないプレフィックスが大半でした。NotFound を捨てると正当に届くネットワークにつながらなくなるので、捨てるのは Invalid だけです。',
  'learning.concept.rpki.q3.a.why':
    'BGP 自体にオリジンを確かめる仕組みはありません。ROA がなければ、誰が広告してよいかを示すものも否定するものもありません。',
  'learning.concept.rpki.q3.b.why':
    'NotFound は障害ではなく判定結果です。バリデータは確かめたうえで、カバーする ROA がないと答えています。',
  'learning.concept.rpki.q4.prompt':
    'AS64501 は 198.51.100.0/22 の ROA の maxLength を 28 に広げましたが、広告しているのは /24 だけです。別のネットワークが、オリジンを AS64501 として 198.51.100.0/26 を広告しました。ROV の判定は？',
  'learning.concept.rpki.q4.a': 'Invalid：AS64501 はその /26 を広告していない',
  'learning.concept.rpki.q4.b': 'NotFound：/26 用の ROA は作られていない',
  'learning.concept.rpki.q4.c': 'Valid：オリジンも長さも ROA に合う',
  'learning.concept.rpki.q4.why':
    'ROV が ROA と照らし合わせるのはオリジン AS と長さだけなので、maxLength 以内でオリジンを偽った細かいプレフィックスは Valid になります。そのため RFC 9319 は、ゆるい maxLength を避けるよう勧めています。',
  'learning.concept.rpki.q4.a.why':
    'ROV が比べるのは ROA であって、実際に広告されているものではありません。AS64501 の /26 は maxLength 28 以内なので一致します。',
  'learning.concept.rpki.q4.b.why':
    '/22 の ROA は /26 をカバーしています。カバーされたプレフィックスが NotFound になることはありません。',
};
