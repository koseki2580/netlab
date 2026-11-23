import type { Catalog } from '../../../../types';

/** The `mptcp` deck's questions (ja); its name is in the core chunk. */
export const mptcp: Catalog = {
  'learning.concept.mptcp.q1.prompt':
    '電話が MPTCP で 50 MB をダウンロードします。Wi-Fi（40 Mbit/s・20 ms）と LTE（20 Mbit/s・60 ms）の両方を埋め続けます。およそ何秒かかりますか？',
  'learning.concept.mptcp.q1.a': '10 秒。速いほうの Wi-Fi の速さで全体が進むから',
  'learning.concept.mptcp.q1.b': '約 6.7 秒。2 つの容量が足されて 60 Mbit/s になる',
  'learning.concept.mptcp.q1.c': '20 秒。遅いほうの LTE が、接続全体の足を引っ張るから',
  'learning.concept.mptcp.q1.why':
    '両方のサブフローが同時にデータを運ぶので、接続は 40 + 20 = 60 Mbit/s になります。400 Mbit ÷ 60 ≈ 6.7 秒で、Wi-Fi が約 33 MB、LTE が約 17 MB を運びます。Wi-Fi だけなら 10 秒です。',
  'learning.concept.mptcp.q1.a.why':
    '10 秒は Wi-Fi だけを使うふつうの TCP です。MPTCP は LTE も埋め続けるので、その 20 Mbit/s が上乗せされます。',
  'learning.concept.mptcp.q1.c.why':
    'スケジューラはサブフローごとにウィンドウを埋めるので、遅い経路がペースを決めることはありません。自分の分を上乗せするだけです。',
  'learning.concept.mptcp.q2.prompt':
    'min-RTT スケジューラで、ウィンドウが空の状態から、アプリが 64 KB の要求を送ります。Wi-Fi のウィンドウには最大 100 KB まで入ります。セグメントはどこを通りますか？',
  'learning.concept.mptcp.q2.a': 'すべて Wi-Fi。往復時間が最短で、まだ空きがあるから',
  'learning.concept.mptcp.q2.b': '帯域に合わせて Wi-Fi と LTE に 2 : 1 で分ける',
  'learning.concept.mptcp.q2.c': 'サブフローに 1 セグメントずつ交互に',
  'learning.concept.mptcp.q2.why':
    'min-RTT は、ウィンドウに空きがあるサブフローのうち往復時間が最短のものに送り、そこが埋まって初めて次を使います。64 KB は Wi-Fi の 100 KB に収まるので LTE は何も運びません。200 KB のまとまったデータなら 100 KB が LTE にあふれます。',
  'learning.concept.mptcp.q2.b.why':
    'よく使われるスケジューラは帯域で分けません。往復時間が最短のサブフローから埋め、LTE にデータが行くのは Wi-Fi のウィンドウが満杯のときだけです。',
  'learning.concept.mptcp.q2.c.why':
    'ラウンドロビンだとセグメントの半分が 60 ms の経路に載り、要求が遅くなります。min-RTT が LTE を使うのは Wi-Fi に空きがないときだけです。',
  'learning.concept.mptcp.q3.prompt':
    '中間装置が SYN から MP_CAPABLE を削っていました。ダウンロード開始から 3 秒で、電話が Wi-Fi から外れます。どうなりますか？',
  'learning.concept.mptcp.q3.a': '遅くなるが、LTE のサブフローでそのまま続く',
  'learning.concept.mptcp.q3.b': 'Wi-Fi が戻ってくるまで、ダウンロードがいったん止まる',
  'learning.concept.mptcp.q3.c': '切れる。接続はふつうの TCP にフォールバックしていた',
  'learning.concept.mptcp.q3.why':
    'MPTCP が合意されるのは、MP_CAPABLE が SYN と SYN/ACK の両方で残ったときだけです。削られるとハンドシェイクは Wi-Fi 上のふつうの TCP として完了し、追加のサブフローもないので、Wi-Fi を失うと接続が切れ、アプリはやり直すことになります。',
  'learning.concept.mptcp.q3.a.why':
    'LTE で続けるには LTE のサブフローが要り、サブフローを足せるのは MPTCP の接続だけです。ここではハンドシェイクが TCP にフォールバックしています。',
  'learning.concept.mptcp.q3.b.why':
    'ふつうの TCP 接続は Wi-Fi のアドレスに結びついているので、そのアドレスがなくなれば待つのではなく失敗します。',
  'learning.concept.mptcp.q4.prompt':
    'MPTCP のサブフロー 2 本と、ふつうの TCP フロー 1 本が 1 つのボトルネックを分け合います。連携した輻輳制御（LIA）では、MPTCP の取り分はどのくらいですか？',
  'learning.concept.mptcp.q4.a': '約半分。サブフローが合わせて 1 本のフローとしてふるまう',
  'learning.concept.mptcp.q4.b': '約 3 分の 2。サブフロー 1 本ごとに 1 フローと数える',
  'learning.concept.mptcp.q4.c': '約 3 分の 1。2 本のサブフローが 1 本分を分け合う',
  'learning.concept.mptcp.q4.why':
    'LIA はサブフローの増やし方を連携させ、合わせて TCP 1 本分のウィンドウに落ち着かせるので、取り分はそれぞれ 50 % です。連携しないと各サブフローが独立した TCP フローになり、MPTCP は約 67 % を取ります。',
  'learning.concept.mptcp.q4.b.why':
    '3 分の 2 は、連携しないサブフローがそれぞれ TCP 1 本のようにふるまったときの取り分です。連携はまさにそれを防ぐためにあります。',
  'learning.concept.mptcp.q4.c.why':
    'サブフローは確かに 1 本分のウィンドウを分け合いますが、それが MPTCP 全体の取り分で、TCP フローと同じ半分です。3 分の 1 ではありません。',
};
