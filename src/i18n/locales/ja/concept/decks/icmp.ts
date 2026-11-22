import type { Catalog } from '../../../../types';

/** The `icmp` deck's questions (ja); its name is in the core chunk. */
export const icmp: Catalog = {
  'learning.concept.icmp.q1.prompt': 'ping が使うプロトコルは？',
  'learning.concept.icmp.q1.a': 'ICMP',
  'learning.concept.icmp.q1.b': 'TCP',
  'learning.concept.icmp.q1.c': 'UDP',
  'learning.concept.icmp.q1.why':
    'ping は ICMP Echo Request を送り、Echo Reply の往復時間を測ります。',
  'learning.concept.icmp.q2.prompt': 'TTL が 0 になったパケットが引き起こすのは…',
  'learning.concept.icmp.q2.a': 'ARP リクエストの送信',
  'learning.concept.icmp.q2.b': 'ICMP Time Exceeded',
  'learning.concept.icmp.q2.c': 'TCP RST の送信',
  'learning.concept.icmp.q2.why':
    'TTL を 0 にしたルータはパケットを破棄し ICMP Time Exceeded を返します — traceroute の原理です。',
  'learning.concept.icmp.q3.prompt': 'ICMP が主に運ぶのは…',
  'learning.concept.icmp.q3.a': '利用者のアプリケーションデータ',
  'learning.concept.icmp.q3.b': 'ルータ間のルーティングテーブル',
  'learning.concept.icmp.q3.c': 'エラーと診断メッセージ',
  'learning.concept.icmp.q3.why':
    'ICMP は問題（到達不能・フラグメント必要・時間超過）の通知と診断を担い、ユーザデータは運びません。',
  'learning.concept.icmp.q1.b.why':
    'ping は TCP ではありません — ポートもハンドシェイクもなく、ICMP Echo Request/Reply を使います。',
  'learning.concept.icmp.q1.c.why':
    'ping は UDP も使いません。ICMP Echo Request/Reply の上で直接動きます。',
  'learning.concept.icmp.q2.a.why':
    'ARP はローカルリンクで IP→MAC を解決します。TTL 切れではルータが ICMP Time Exceeded を送ります。',
  'learning.concept.icmp.q2.c.why':
    'TCP RST は接続を中断します。TTL が 0 になるのは L3 の事象で ICMP Time Exceeded を生みます。',
  'learning.concept.icmp.q3.a.why':
    'ICMP はアプリのペイロード用ではありません。制御・エラー・診断メッセージを運びます。',
  'learning.concept.icmp.q3.b.why':
    '到達性を配るのはルーティングプロトコルです（OSPF は LSA をフラッディング、BGP はプレフィックスを広告）。各ルータは自分でテーブルを計算します。ICMP はエラー/診断メッセージを運びます。',
  'learning.concept.icmp.q4.prompt':
    '経路のない宛先への ping が、R1（デフォルトルート）を通って R2 に着き、R2 には経路がありません。Destination Unreachable を送るのは？',
  'learning.concept.icmp.q4.why':
    '先へ進めなかったルータがパケットを捨て、受け取ったアドレスから知らせます。ここでは R2 です。R1 には経路（デフォルト）があったので転送しました。',
  'learning.concept.icmp.q4.a': '途中の最初のルータ R1',
  'learning.concept.icmp.q4.a.why':
    'R1 には経路（デフォルト）があったので、転送しただけで知らせることはありません。',
  'learning.concept.icmp.q4.b': '経路を持たないルータ R2',
  'learning.concept.icmp.q4.c': '知られていない宛先そのもの',
  'learning.concept.icmp.q4.c.why':
    '誰も経路を持たない宛先には答える機器がなく、パケットはそこに届いていません。',
  'learning.concept.icmp.q5.prompt':
    '「断片化禁止（DF）」付きの 1,500 バイトが、MTU 1,400 の回線にさしかかりました。ルータは何を返しますか？',
  'learning.concept.icmp.q5.why':
    '分けることは禁じられているので捨て、次の区間の MTU を添えて Destination Unreachable、断片化が必要（タイプ 3、コード 4）を返します。送り主はそれより小さく送り直します（経路 MTU 探索）。',
  'learning.concept.icmp.q5.a': 'Time Exceeded（タイプ 11、コード 0）',
  'learning.concept.icmp.q5.a.why':
    'Time Exceeded は TTL が尽きたときのものです。ここでは TTL は問題ありません。',
  'learning.concept.icmp.q5.b': '1,400 と 120 バイトの 2 つの断片',
  'learning.concept.icmp.q5.b.why':
    '分けることこそ DF が禁じていることです。DF がなければ、ルータは断片化します。',
  'learning.concept.icmp.q5.c': '到達不能のコード 4 と、MTU 1400',
  'learning.concept.icmp.q6.prompt':
    'ping は ICMP の 1 種類を送り、別の種類が返ってきます。それぞれのタイプ番号は？',
  'learning.concept.icmp.q6.why':
    'ping は Echo Request（タイプ 8）を送り、宛先が自分のアドレスから Echo Reply（タイプ 0）を返します。',
  'learning.concept.icmp.q6.a': 'Echo Request 8、返りは Echo Reply 0',
  'learning.concept.icmp.q6.b': 'Echo Request 0、返りは Echo Reply 8',
  'learning.concept.icmp.q6.b.why': '番号が逆です。要求が 8、応答が 0 です。',
  'learning.concept.icmp.q6.c': 'どちらもタイプ 3（コード 0 と 1）',
  'learning.concept.icmp.q6.c.why':
    'タイプ 3 は Destination Unreachable という知らせで、ping の要求や応答ではありません。',
};
