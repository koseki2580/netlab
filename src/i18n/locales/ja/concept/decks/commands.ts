import type { Catalog } from '../../../../types';

/**
 * The `commands` deck's questions (ja): reading command output (REQ-365), what
 * the terminal prints and what it means. Its name is in the core chunk.
 */
export const commands: Catalog = {
  'learning.concept.commands.q1.prompt':
    'ping が「64 bytes from 10.0.2.80: icmp_seq=1 ttl=63」と出しました。サーバは TTL 64 で応答を送ります。63 は何を表していますか？',
  'learning.concept.commands.q1.why':
    'TTL は 64 から始まり、転送するルータごとに 1 減るので、63 はあいだにルータが 1 台あった印です。ルータ自身からの応答は 64 のまま届きます。',
  'learning.concept.commands.q1.a': '戻る途中で、ルータが 1 台転送した',
  'learning.concept.commands.q1.b': '往復に 63 ミリ秒かかった',
  'learning.concept.commands.q1.b.why':
    'TTL は時間ではなく回数です。転送するルータが 1 台ごとに 1 減らします。',
  'learning.concept.commands.q1.c': '応答のうち 63 バイトだけが届いた',
  'learning.concept.commands.q1.c.why':
    '大きさは行の最初の 64 bytes です。ttl は IP ヘッダの寿命の欄です。',
  'learning.concept.commands.q2.prompt':
    'ping が「From 10.0.1.1 icmp_seq=1 Destination Net Unreachable」と出しました。このメッセージは誰が、なぜ送ってきたのでしょう？',
  'learning.concept.commands.q2.why':
    '宛先への経路がないルータは、パケットを捨て、自分のアドレスから ICMP の Destination Unreachable（タイプ 3、コード 0）で送り主に知らせます。問題はそのルータか、その先にあります。',
  'learning.concept.commands.q2.a': '宛先の機器が、ping を断った',
  'learning.concept.commands.q2.a.why':
    '宛先にはパケットが届いていません。メッセージは途中のルータ「10.0.1.1」から来ています。',
  'learning.concept.commands.q2.b': 'ルータ 10.0.1.1 に、先への経路がない',
  'learning.concept.commands.q2.c': '自分の機器の DNS が失敗した',
  'learning.concept.commands.q2.c.why':
    '名前が引けないと ping は何も送らずに止まります。これはルータからの ICMP です。',
  'learning.concept.commands.q3.prompt':
    'curl が「curl: (6) Could not resolve host: www.example.test」と出しました。どの段階で失敗しましたか？',
  'learning.concept.commands.q3.why':
    'エラー (6) は名前が引けなかったことを表します。その名前で nslookup、続けて DNS サーバへの ping を試し、DNS が答えるかを確かめます。',
  'learning.concept.commands.q3.a': '名前をアドレスに変える段階（DNS）',
  'learning.concept.commands.q3.b': '80 番への TCP 接続の段階',
  'learning.concept.commands.q3.b.why':
    "接続の失敗はエラー (7)「Couldn't connect to server」です。curl はそこまで進んでいません。",
  'learning.concept.commands.q3.c': 'サーバが 404 を返した段階',
  'learning.concept.commands.q3.c.why':
    '404 はサーバからの応答で、ページとして表示されます。ここではサーバに一度も聞いていません。',
  'learning.concept.commands.q4.prompt':
    "curl は「Couldn't connect to server」、それでも同じアドレスへの ping は届きます。最もありそうな原因は？",
  'learning.concept.commands.q4.why':
    '経路は動いていて（ping）、名前も引けています（curl が接続を試みた）。失敗しているのはポートへの接続です。実際のサーバなら、Web サーバのプログラムがそのポートで動いているかを確かめます。',
  'learning.concept.commands.q4.a': 'サーバへの経路がまったくない',
  'learning.concept.commands.q4.a.why':
    'ping がサーバに届いているので、行きも帰りも経路はあります。',
  'learning.concept.commands.q4.b': 'DNS がサーバの名前を引けない',
  'learning.concept.commands.q4.b.why': 'curl は接続まで進んでいるので、名前はもう引けています。',
  'learning.concept.commands.q4.c': 'サーバでそのポートを待つ者がいない',
  'learning.concept.commands.q5.prompt':
    'traceroute が「 1  10.0.1.1 (10.0.1.1)」のあと「* * *」の行ばかりを出しました。問題はどこを探すべきでしょう？',
  'learning.concept.commands.q5.why':
    '1 行が 1 ホップです。最初のルータは答え、その先は何も答えていません。故障は 10.0.1.1 より先（その先の回線、次のルータ、または帰り道）にあります。',
  'learning.concept.commands.q5.a': '自分の機器のアドレスの設定',
  'learning.concept.commands.q5.a.why':
    '最初のルータまで届いて応答があるので、自分の機器の設定でパケットは出ています。',
  'learning.concept.commands.q5.b': '最初のルータ 10.0.1.1 より先',
  'learning.concept.commands.q5.c': '機器が使う DNS サーバ',
  'learning.concept.commands.q5.c.why':
    'アドレスへの traceroute に DNS はいりません。調査パケットそのものが 1 番目のあとで止まっています。',
  'learning.concept.commands.q6.prompt':
    '別のネットワークのサーバに ping したあと、arp -a には「? (10.0.1.1) at 02:00:00:00:00:01 [ether] on eth0」しかありません。なぜサーバが出ないのでしょう？',
  'learning.concept.commands.q6.why':
    '別のネットワークあてのフレームはゲートウェイに渡すので、機器が ARP で聞くのはゲートウェイの MAC だけです。サーバの MAC は、サーバの LAN でルータが聞きます。',
  'learning.concept.commands.q6.a': 'サーバが ARP に答えなかった',
  'learning.concept.commands.q6.a.why':
    'ping には応答があったので、フレームは届いています。そもそもサーバの MAC は聞いていません。',
  'learning.concept.commands.q6.b': 'サーバのエントリがもう消えていた',
  'learning.concept.commands.q6.b.why':
    '同じ ping のゲートウェイのエントリは残っています。サーバのものは最初から作られていません。',
  'learning.concept.commands.q6.c': 'ARP は自分の LAN の中でしか聞かない',
};
