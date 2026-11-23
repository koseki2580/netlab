import type { Catalog } from '../../../../types';

/** The `anycast` deck's questions (ja); its name is in the core chunk. */
export const anycast: Catalog = {
  'learning.concept.anycast.q1.prompt':
    'CDN が 192.0.2.0/24 を東京・フランクフルト・ニューヨークから広告しています。シンガポールの利用者のリクエストは、東京のほうがずっと速く応答できるのにフランクフルトへ届きます。なぜ？',
  'learning.concept.anycast.q1.a': 'BGP は AS パスの短い方を選び、遅延を知らないから',
  'learning.concept.anycast.q1.b': 'エニーキャストは負荷分散のため拠点をランダムに選ぶから',
  'learning.concept.anycast.q1.c': 'フランクフルトが最も空き容量の多い拠点だから',
  'learning.concept.anycast.q1.why':
    '国際キャリアはこのプレフィックスを、フランクフルトから直接（AS 2 個）と、アジアのトランジット経由（AS 3 個）で聞いています。BGP は AS パスの短い方を選ぶので、シンガポールからは東京の 74 ms ではなく、フランクフルトの 162 ms になります。',
  'learning.concept.anycast.q1.b.why':
    'エニーキャストはランダムではありません。パケットはどれも利用者のネットワークが選んだ経路をたどるので、すべて同じ拠点に届きます。',
  'learning.concept.anycast.q1.c.why':
    'BGP は負荷や容量の情報を運びません。どこへ行くかは、利用者のネットワークが聞いた AS パスで決まります。',
  'learning.concept.anycast.q2.prompt':
    'フランクフルトを保守で止め、広告を取り下げました。その利用者が別の拠点につながるまでに、ほかに何を変える必要がある？',
  'learning.concept.anycast.q2.a': 'CDN の DNS が新しいアドレスを返すようにする',
  'learning.concept.anycast.q2.b': '何もいらない（各網が次に良い経路へ切り替わる）',
  'learning.concept.anycast.q2.c': '利用者のリゾルバのキャッシュを消す',
  'learning.concept.anycast.q2.why':
    'エニーキャストでは取り下げそのものが切り替えです。シンガポールのネットワークには東京とニューヨークだけが聞こえるようになり、同じアドレスで東京へ届きます。',
  'learning.concept.anycast.q2.a.why':
    'どの拠点も同じアドレス 192.0.2.1 を使っています。変わるのはそこへの経路だけです。',
  'learning.concept.anycast.q2.c.why':
    'DNS では何も変わっていないので、消すべき古い答えはありません。同じアドレスが別の拠点へルーティングされるだけです。',
  'learning.concept.anycast.q3.prompt':
    '別の CDN は DNS で振り分けており、拠点ごとに別のユニキャストアドレスがあります。大阪の利用者が、ECS を送らないロンドンのパブリックリゾルバ経由で問い合わせました。返されるのはどのサーバ？',
  'learning.concept.anycast.q3.a': 'ロンドンのリゾルバに近いフランクフルトのサーバ',
  'learning.concept.anycast.q3.b': '大阪の利用者に近い東京のサーバ',
  'learning.concept.anycast.q3.c': '3 拠点を順番に返すラウンドロビン',
  'learning.concept.anycast.q3.why':
    '権威サーバは問い合わせてきた相手、つまりロンドンのリゾルバに合わせて答えるので、大阪の利用者はフランクフルトになり、往復は東京の 12 ms ではなく 252 ms です。ECS は利用者のアドレスの一部を伝えることでこれを解決します。',
  'learning.concept.anycast.q3.b.why':
    '権威サーバに見えるのはリゾルバのアドレスだけで、利用者のアドレスは見えません。ECS がなければロンドン向けに答えます。',
  'learning.concept.anycast.q3.c.why':
    '場所による振り分けでは、問い合わせた相手に最も近い拠点を答えます。順番に返すのでは場所をまったく見ていません。',
  'learning.concept.anycast.q4.prompt':
    'エニーキャストが長い TCP のダウンロードより DNS の問い合わせに向いているのはなぜ？',
  'learning.concept.anycast.q4.a': 'TCP のパケットはエニーキャストで送るには大きすぎるから',
  'learning.concept.anycast.q4.b': 'エニーキャストのアドレスは UDP しか運べないから',
  'learning.concept.anycast.q4.c': '経路が変わると、接続を知らない拠点に届いてしまうから',
  'learning.concept.anycast.q4.why':
    '接続の途中で経路が変わるとパケットは別の拠点に届きますが、その拠点はその接続の状態を持たないので接続が切れます。DNS の問い合わせは 1 回のやりとりで終わります。',
  'learning.concept.anycast.q4.a.why':
    'パケットの大きさは関係ありません。エニーキャストは、複数の場所から広告されたアドレスへの普通のルーティングです。',
  'learning.concept.anycast.q4.b.why':
    'エニーキャストはどのトランスポートでも使えます。多くの CDN はエニーキャストのアドレスで TCP 上の HTTP を提供しています。問題は長い接続の途中の経路の変化です。',
};
