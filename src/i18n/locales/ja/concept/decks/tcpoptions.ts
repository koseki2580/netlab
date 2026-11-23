import type { Catalog } from '../../../../types';

/** The `tcpoptions` deck's questions (ja); its name is in the core chunk. */
export const tcpoptions: Catalog = {
  'learning.concept.tcpoptions.q1.prompt':
    '1 Gbit/s・往復 150 ms の経路で、ロスはなく、ウィンドウスケールも使いません。1 本の TCP 接続はおよそどのくらいの速さになりますか？',
  'learning.concept.tcpoptions.q1.a': '約 3.5 Mbit/s。1 往復にウィンドウ 1 つ分だけ',
  'learning.concept.tcpoptions.q1.b':
    'スロースタートが終われば、回線の 1 Gbit/s をいっぱいに使える',
  'learning.concept.tcpoptions.q1.c': '約 500 Mbit/s。半分の時間は ACK 待ちになる',
  'learning.concept.tcpoptions.q1.why':
    'スケールなしのウィンドウは最大 65,535 バイトで、送り手はそれを送ると ACK を 1 往復待ちます。65,535 × 8 ÷ 0.15 秒 ≈ 3.5 Mbit/s で、回線の約 0.35 % です。回線を埋めるには 18.75 MB を送信中にしておく必要があります（帯域幅遅延積、BDP）。',
  'learning.concept.tcpoptions.q1.b.why':
    'スロースタートが広げるのは輻輳ウィンドウだけです。16 ビットの受信ウィンドウが送信中のデータを 65,535 バイトに抑えるので、速さは 1 往復にウィンドウ 1 つ分のままです。',
  'learning.concept.tcpoptions.q1.c.why':
    '決まった割合を失うわけではありません。64 KB は一瞬で送り終わり、残りの 150 ms をまるごと待つので、速さはウィンドウ ÷ RTT となり、回線の半分よりはるかに小さくなります。',
  'learning.concept.tcpoptions.q2.prompt':
    'ファイアウォールが、クライアントの SYN からウィンドウスケールのオプションを消してしまいます。接続はどうなりますか？',
  'learning.concept.tcpoptions.q2.a':
    'サーバーがオプションの欠落に気づき、すぐに接続をリセットする',
  'learning.concept.tcpoptions.q2.b': 'サーバーが知ったあと、少し遅れてスケールが始まる',
  'learning.concept.tcpoptions.q2.c': 'つながるが、黙って 65,535 バイトのウィンドウのまま',
  'learning.concept.tcpoptions.q2.why':
    'スケールは SYN と SYN-ACK の両方にオプションがあるときだけ使われ、サーバーは SYN にあったときだけ送れます。そのため接続全体がスケールなしで動き、警告も出ず、遠い相手との転送がただ遅くなります。',
  'learning.concept.tcpoptions.q2.a.why':
    'このオプションは任意なので、付いていない SYN もふつうの SYN です。サーバーはスケールしないだけで、エラーは何も通知されません。',
  'learning.concept.tcpoptions.q2.b.why':
    'ウィンドウスケールは SYN と SYN-ACK でしか取り決められません。ハンドシェイクが終わったら、その接続では二度と有効にできません。',
  'learning.concept.tcpoptions.q3.prompt':
    '1 つのウィンドウのセグメント 5・9・14 が失われました。SACK なし（NewReno）と SACK ありで、回復には何往復かかりますか？',
  'learning.concept.tcpoptions.q3.a': 'どちらも 1 往復。高速再送ですべての穴を再送する',
  'learning.concept.tcpoptions.q3.b': 'NewReno は穴 1 つずつで 3 往復、SACK は 1 往復',
  'learning.concept.tcpoptions.q3.c': 'どちらも 3 往復。SACK が減らすのは再送の量で、時間ではない',
  'learning.concept.tcpoptions.q3.why':
    '累積 ACK が示すのは最初の穴の位置だけです。NewReno は再送のたびに返る部分 ACK で次の穴を知るので、1 往復に 1 つしか直せません。SACK ブロックならすべての穴が一度にわかるので、3 つとも最初の 1 往復で再送できます。',
  'learning.concept.tcpoptions.q3.a.why':
    'SACK がないと、送り手にわかるのは最初の穴（累積 ACK）だけです。次の穴は、再送したセグメントへの ACK が戻って初めてわかります。',
  'learning.concept.tcpoptions.q3.c.why':
    'SACK は時間も節約します。受信側が持っているブロックがすべて見えるので、穴を 1 往復でまとめて再送できます。',
  'learning.concept.tcpoptions.q4.prompt':
    'タイムスタンプオプションと一緒に使うとき、1 つの ACK に SACK ブロックはいくつ載りますか？',
  'learning.concept.tcpoptions.q4.a': '最大 3 つ。オプション領域は 40 バイトしかない',
  'learning.concept.tcpoptions.q4.b': 'ウィンドウ内にある穴の数だけ、いくつでも並べて載せられる',
  'learning.concept.tcpoptions.q4.c': '最後に受け取ったブロックの 1 つだけ',
  'learning.concept.tcpoptions.q4.why':
    'TCP オプションは 40 バイトです。SACK は 2 + ブロックごとに 8 バイト、タイムスタンプはパディング込みで 12 バイトを使うので、ブロックは 3 つ（タイムスタンプなしなら 4 つ）までです。新しいブロックが先頭で、古いものは省かれることがあります。',
  'learning.concept.tcpoptions.q4.b.why':
    'オプション領域は 40 バイトに決まっているので、ブロック数には上限があります。足りないときは古いブロックが省かれ、送り手は以前の ACK で知った内容を覚えておきます。',
  'learning.concept.tcpoptions.q4.c.why':
    '最も新しいブロックが先頭に来ますが、それだけではありません。40 バイトの残りにほかのブロックも載り、タイムスタンプありなら 3 つになります。',
};
