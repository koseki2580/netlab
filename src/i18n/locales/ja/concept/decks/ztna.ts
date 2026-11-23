import type { Catalog } from '../../../../types';

/** The `ztna` deck's questions (ja); its name is in the core chunk. */
export const ztna: Catalog = {
  'learning.concept.ztna.q1.prompt':
    'コードリポジトリだけを許可された業務委託の人が、フルトンネルの VPN（ACL は 10.0.0.0/8 を許可）につなぎ、ノート PC がマルウェアに乗っ取られました。5 つの社内アプリのうち、どれに届きますか？',
  'learning.concept.ztna.q1.a': '5 つすべて。ACL が 10.0.0.0/8 全体を開けている',
  'learning.concept.ztna.q1.b': '許可されたコードリポジトリだけに届く',
  'learning.concept.ztna.q1.c': 'どれにも届かない。VPN トンネルの中の通信は暗号化されている',
  'learning.concept.ztna.q1.why':
    'VPN は端末を社内ネットワークに参加させ、全員に同じ ACL を与えるので、10.0.0.0/8 の 16,777,216 アドレスすべてと、そこにあるすべてのアプリにパケットを送れます。届く範囲に、誰か・端末の状態は関係しません。',
  'learning.concept.ztna.q1.b.why':
    '1 つのアプリだけ「許可」されていても、この VPN はそれを強制しません。ACL は 1 つだけで接続した人を見ないので、10.0.0.0/8 全体に届きます。',
  'learning.concept.ztna.q1.c.why':
    '暗号化は途中の通信を守るだけで、つながった端末がどこへ送れるかは制限しません。マルウェアはトンネルの内側から送ります。',
  'learning.concept.ztna.q2.prompt':
    '同じ乗っ取られたノート PC で、今度は ZTNA の場合です。何に届きますか？',
  'learning.concept.ztna.q2.a': 'アクセスプロキシを通り抜ければ、やはり 5 つすべて',
  'learning.concept.ztna.q2.b': '何にも届かない。会社管理でない端末はすべて拒否される',
  'learning.concept.ztna.q2.c': 'コードリポジトリだけ。社内アドレスには直接届かない',
  'learning.concept.ztna.q2.why':
    'ZTNA ではノート PC からアプリへの経路はなく、話せるのはアクセスプロキシだけです。ポリシーエンジンがリクエストごとに、誰か・どのアプリか・ポスチャから許可を決めます。業務委託の人のルールで許されるのはコードリポジトリだけなので、届くアプリは 1 つで、社内アドレスには 1 つも届きません。',
  'learning.concept.ztna.q2.a.why':
    'プロキシを「通り抜ける」ことはありません。リクエストを 1 つずつ判定するので、1 回の確認で得られるのは 1 つのアプリで、その奥のネットワークではありません。',
  'learning.concept.ztna.q2.b.why':
    'ポスチャの条件はアプリごとです。コードリポジトリは OS が最新の私物端末を受け入れるので、業務委託の人は届きますし、マルウェアも届き得ます。',
  'learning.concept.ztna.q3.prompt':
    '作業中に、エンジニアのノート PC の OS 更新が遅れました。ZTNA ではどうなりますか？',
  'learning.concept.ztna.q3.a': '次のログインまでは何も起きず、そのまま許可される',
  'learning.concept.ztna.q3.b': '次のリクエストで拒否され、更新すればまた許可される',
  'learning.concept.ztna.q3.c': '更新するまでノート PC がインターネットから切り離される',
  'learning.concept.ztna.q3.why':
    'ポリシーエンジンはリクエストごとに判定するので、ポスチャの変化はすぐ効きます。次のリクエストは「OS が古い」として拒否され、更新すれば次のリクエストからまた通ります。',
  'learning.concept.ztna.q3.a.why':
    'ログイン時にだけ確認するのは、VPN のポスチャ確認のやり方です。ZTNA はリクエストのたびにポリシーを評価し直します。',
  'learning.concept.ztna.q3.c.why':
    'ZTNA が決めるのはプロキシ経由の社内アプリへのアクセスで、ノート PC をインターネットから外すことはしません。拒否されるのは保護されたアプリへのリクエストだけです。',
};
