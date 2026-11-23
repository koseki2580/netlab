import type { Catalog } from '../../../../types';

/** The `loadbalancer` deck's questions (ja); its name is in the core chunk. */
export const loadbalancer: Catalog = {
  'learning.concept.loadbalancer.q1.prompt':
    'ラウンドロビンで 12 件のリクエストを web1、web2、web3 に振り分けます。1 件目から 3 件ごとに、接続が 4 倍長く続きます。同時に開いている接続がいちばん多くなるサーバーは？',
  'learning.concept.loadbalancer.q1.a': 'どれでもない。4 件ずつなので負荷は均等',
  'learning.concept.loadbalancer.q1.b': 'web1。長いリクエストがすべてそこに来る',
  'learning.concept.loadbalancer.q1.c': 'web3。各巡で最後に順番が回ってくる',
  'learning.concept.loadbalancer.q1.why':
    'ラウンドロビンが数えるのはリクエストの件数で、仕事の量ではありません。長いリクエストは 3 件ごとに来て、サーバーが 3 台なら 3 件ごとの順番は毎回 web1 です。web1 は同時に 3、他は 1 になります。',
  'learning.concept.loadbalancer.q2.prompt':
    '同じリクエストで、最小接続数はいちばん忙しいサーバーの同時接続をラウンドロビンより少なくします。なぜ？',
  'learning.concept.loadbalancer.q2.a': '長いリクエスト専用のサーバーを 1 台空けておく',
  'learning.concept.loadbalancer.q2.b': '決まった上限を超える接続を断る',
  'learning.concept.loadbalancer.q2.c': '順番ではなく、今開いている数で選ぶ',
  'learning.concept.loadbalancer.q2.why':
    '各リクエストを、その時点で開いている接続がいちばん少ないサーバーへ送るので、長いものが散らばります。いちばん忙しいサーバーでも 3 ではなく 2 です。',
  'learning.concept.loadbalancer.q3.prompt':
    '3 台のサーバーを送信元 IP のハッシュで選んでいます。web3 がヘルスチェックに失敗し、ハッシュは 2 台から選ぶようになりました。クライアントはどうなる？',
  'learning.concept.loadbalancer.q3.a': 'web1 や web2 にいたクライアントの一部も移る',
  'learning.concept.loadbalancer.q3.b': '移るのは web3 のクライアントだけ',
  'learning.concept.loadbalancer.q3.c': '全員そのまま。web3 の分はエラーになる',
  'learning.concept.loadbalancer.q3.why':
    'サーバーは「ハッシュ値 ÷ 残っている台数」の余りで決まります。台数が変わると web3 以外のクライアントも多くが別のサーバーに移ります。これを抑えるのがコンシステントハッシュです。',
  'learning.concept.loadbalancer.q4.prompt':
    'クライアントが VIP 203.0.113.10 の 80 番へ SYN を送り、ロードバランサーは web2（10.0.0.12）を選びました。web2 が受け取る SYN の宛先は…',
  'learning.concept.loadbalancer.q4.a': 'クライアントが送ったままの VIP 203.0.113.10',
  'learning.concept.loadbalancer.q4.b': 'ロードバランサーが書き換えた web2 の 10.0.0.12',
  'learning.concept.loadbalancer.q4.c': 'ロードバランサーの内側アドレス 10.0.0.1',
  'learning.concept.loadbalancer.q4.why':
    'ロードバランサーは宛先を VIP から選んだサーバーへ書き換える（宛先 NAT）ので、web2 には自分のアドレス宛てのパケットが届きます。クライアントに見えるのは VIP だけです。',
  'learning.concept.loadbalancer.q1.a.why':
    '件数が同じでも負荷は同じではありません。長く開いている接続は、振られたサーバーに積み上がります。',
  'learning.concept.loadbalancer.q1.c.why':
    '長いリクエストは 1、4、7、10 件目で、3 台に順に振るとどれも web1 の番です。',
  'learning.concept.loadbalancer.q2.a.why':
    '最小接続数はリクエストがどれだけ長く続くかを知りません。今開いている数を見るだけです。',
  'learning.concept.loadbalancer.q2.b.why':
    '断られるリクエストはありません。どれも、届いた時点で開いている接続がいちばん少ないサーバーに置かれます。',
  'learning.concept.loadbalancer.q3.b.why':
    'それはコンシステントハッシュで得られる性質です。台数で割った余りを使う単純なハッシュでは、web3 にいなかったクライアントも移ります。',
  'learning.concept.loadbalancer.q3.c.why':
    'ヘルスチェックが web3 を選択肢から外すので、そのクライアントは止まったサーバーではなく別のサーバーへ送られます。',
  'learning.concept.loadbalancer.q4.a.why':
    'web2 は VIP を持っていません。ロードバランサーが宛先を書き換えてからパケットを送ります。',
  'learning.concept.loadbalancer.q4.c.why':
    'それはロードバランサー自身の内側のアドレスです。パケットの宛先は選ばれたサーバー 10.0.0.12 になります。',
};
