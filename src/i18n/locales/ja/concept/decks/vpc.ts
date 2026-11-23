import type { Catalog } from '../../../../types';

/** The `vpc` deck's questions (ja); its name is in the core chunk. */
export const vpc: Catalog = {
  'learning.concept.vpc.q1.prompt':
    'VPC の公開サブネットに web（10.0.1.10）があり、セキュリティグループは TCP 80 を通します。インターネットの利用者が web の公開アドレス http://198.51.100.1/ を開きます。リクエストは…',
  'learning.concept.vpc.q1.a': '止められる。web にはプライベートアドレスしかない',
  'learning.concept.vpc.q1.b': 'web に届く。宛先が 10.0.1.10 に書き換えられる',
  'learning.concept.vpc.q1.c': 'web にそのまま届く。web がそのアドレスを持つ',
  'learning.concept.vpc.q1.why':
    'インターネットゲートウェイが公開アドレスを web のプライベートアドレスに対応づけ、セキュリティグループが TCP 80 を通します。クラウドではインスタンスの公開 IP（Elastic IP）にあたります。',
  'learning.concept.vpc.q2.prompt':
    '非公開サブネットの db（10.0.2.10）が、更新を取りにインターネットへ接続します。接続は…',
  'learning.concept.vpc.q2.a': '外に出る。送信元を両方のゲートウェイが書き換える',
  'learning.concept.vpc.q2.b': '止められる。非公開サブネットには出口がない',
  'learning.concept.vpc.q2.c': '外に出る。送信元は 10.0.2.10 のまま',
  'learning.concept.vpc.q2.why':
    '非公開サブネットのルートテーブルが NAT ゲートウェイへ送り、NAT ゲートウェイが自分のアドレスに、インターネットゲートウェイが公開アドレスに書き換えます。返事は戻れますが、外から接続を始めることはできません。',
  'learning.concept.vpc.q3.prompt':
    'インターネットの利用者が db（10.0.2.10）の 80 番に直接つなごうとします。80 番はセキュリティグループが通す番号です。接続は…',
  'learning.concept.vpc.q3.a': 'db に届く。セキュリティグループが 80 番を通す',
  'learning.concept.vpc.q3.b': 'db に届く。NAT ゲートウェイを通って入る',
  'learning.concept.vpc.q3.c': 'インターネットゲートウェイで止まる。対応づけがない',
  'learning.concept.vpc.q3.why':
    'プライベートアドレスにはインターネットゲートウェイの対応づけがないので、入れません（本物のインターネットでは 10.0.0.0/8 はそもそも経路に載りません）。これが「非公開サブネット」の意味です。',
  'learning.concept.vpc.q4.prompt':
    'ゲートウェイは web の公開アドレスの 80 番と 22 番を web に対応づけています。インターネットの利用者がそのアドレスに SSH（TCP 22）でつなごうとすると…',
  'learning.concept.vpc.q4.a': 'web に届く。22 番も web に対応づけてある',
  'learning.concept.vpc.q4.b': 'web の手前でセキュリティグループに止められる',
  'learning.concept.vpc.q4.c': 'web に届き、web が接続を拒否する',
  'learning.concept.vpc.q4.why':
    '対応づけに従えば web へ行きますが、セキュリティグループが通すのは TCP 80 だけなので、TCP 22 は先に捨てられます。SSH を開けるなら管理者のアドレスだけにし、全員には開けません。',
  'learning.concept.vpc.q1.a.why':
    'プライベートアドレスは外から届きませんが、インターネットゲートウェイが公開アドレスをそこへ対応づけるので、リクエストは入れます。',
  'learning.concept.vpc.q1.c.why':
    'web 自身が知っているのは 10.0.1.10 だけです。公開アドレスはインターネットゲートウェイが持ち、入ってくるときに宛先を書き換えます。',
  'learning.concept.vpc.q2.b.why':
    '非公開サブネットは外から届かないだけで、外へは出られます。ルートテーブルが通信を NAT ゲートウェイへ送ります。',
  'learning.concept.vpc.q2.c.why':
    '送信元が 10.x のままではインターネット越しに返事が戻れません。出ていくときに NAT ゲートウェイ、次にインターネットゲートウェイが書き換えます。',
  'learning.concept.vpc.q3.a.why':
    'セキュリティグループが絞るのは、届く通信のうちどれを通すかだけです。プライベートアドレスには、そもそもインターネットゲートウェイからの入口がありません。',
  'learning.concept.vpc.q3.b.why':
    'NAT ゲートウェイが通すのは、内から出る接続とその返事だけです。外から接続を始めさせることはありません。',
  'learning.concept.vpc.q4.a.why':
    '対応づけが決めるのはパケットの行き先です。入れるかどうかはセキュリティグループが決め、通すのは TCP 80 だけです。',
  'learning.concept.vpc.q4.c.why':
    'パケットは web まで届きません。手前のセキュリティグループが TCP 22 を先に捨てます。',
};
