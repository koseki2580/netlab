import type { Catalog } from '../../../../types';

/** The `mobilecore` deck's questions (ja); its name is in the core chunk. */
export const mobilecore: Catalog = {
  'learning.concept.mobilecore.q1.prompt':
    'N3 は MTU 1500 の IPv4 で動き、各パケットには UDP と PDU Session Container 付きの GTP-U ヘッダが付きます。UE の IPv4 パケットで N3 を断片化させない TCP の MSS は？',
  'learning.concept.mobilecore.q1.a': '1460 バイト',
  'learning.concept.mobilecore.q1.b': '1416 バイト',
  'learning.concept.mobilecore.q1.c': '1424 バイト',
  'learning.concept.mobilecore.q1.why':
    'トンネルには 20 + 8 + 8 + 4 + 4 = 44 バイト（IPv4、UDP、GTP-U 必須ヘッダ、オプション部分、コンテナ）かかり、内側のパケットに残るのは 1456 です。そこから IPv4 と TCP のヘッダ 40 を引いて 1416 です。',
  'learning.concept.mobilecore.q1.a.why':
    '1460 はトンネルのない 1500 バイトのリンクでの MSS です。N3 ではトンネルのヘッダも 1500 の中に入ります。',
  'learning.concept.mobilecore.q1.c.why':
    'それは GTP-U の必須ヘッダ 8 バイトしか数えていません。コンテナが付くと、オプション部分 4 バイトとコンテナ自体の 4 バイトが加わります。',
  'learning.concept.mobilecore.q2.prompt':
    'TCP でダウンロード中の UE が、Xn ハンドオーバーで gNB1 から gNB2 へ移ります。どちらの gNB も同じ UPF につながっています。変わるのは？',
  'learning.concept.mobilecore.q2.a': 'UE の IP アドレスとアンカーの UPF',
  'learning.concept.mobilecore.q2.b': 'アンカーが gNB2 に移り、IP はそのまま',
  'learning.concept.mobilecore.q2.c': 'N3 の下りトンネルの gNB 側の端だけ',
  'learning.concept.mobilecore.q2.why':
    'gNB2 が自分のアドレスと TEID をコアに渡し、UPF は下りのパケットをそこへ送ります。UPF は PDU セッションのアンカーのままで、UE の IP も変わりません。',
  'learning.concept.mobilecore.q2.a.why':
    'IP は PDU セッションとともに割り当てられ、アンカーの UPF 経由で届きます。gNB 間のハンドオーバーではどちらも保たれます。',
  'learning.concept.mobilecore.q2.b.why':
    'gNB がアンカーになることはありません。PDU セッションのアンカーはいつも UPF です。',
  'learning.concept.mobilecore.q3.prompt':
    'MPTCP も QUIC のマイグレーションもないのに、UE の TCP 接続がハンドオーバーを乗り切れるのはなぜ？',
  'learning.concept.mobilecore.q3.a': '同じアンカー経由で IP がそのまま届くから',
  'learning.concept.mobilecore.q3.b': 'TCP が新しい IP を知るまで再送するから',
  'learning.concept.mobilecore.q3.c': 'gNB 同士が TCP の状態をコピーするから',
  'learning.concept.mobilecore.q3.why':
    '移動は IP より下で隠されます。インターネットからは同じ UPF 経由で同じアドレスに届き続け、向きが変わるのはコアの中のトンネルだけです。',
  'learning.concept.mobilecore.q3.b.why':
    'TCP は新しいアドレスで続けることはできません。接続が続くのは、アドレスが変わらないからです。',
  'learning.concept.mobilecore.q3.c.why':
    'gNB は TCP の状態を持ちません。UE のパケットを GTP-U に入れて運ぶだけで、接続を終端しません。',
  'learning.concept.mobilecore.q4.prompt':
    '事業者が N3 のトランスポートを IPv4 から IPv6 に変えます。トンネルに入れたパケット 1 つあたり、何バイト増える？',
  'learning.concept.mobilecore.q4.a': '40 バイト',
  'learning.concept.mobilecore.q4.b': '20 バイト',
  'learning.concept.mobilecore.q4.c': '0 バイト',
  'learning.concept.mobilecore.q4.why':
    '変わるのは外側の IP ヘッダだけで、IPv4 の 20 バイトが IPv6 の 40 バイトになります。トンネルは 44 バイトから 64 バイトになります。',
  'learning.concept.mobilecore.q4.a.why':
    '40 バイトは IPv6 ヘッダ全体ですが、20 バイトの IPv4 ヘッダと置き換わるので、増えるのは 20 です。',
  'learning.concept.mobilecore.q4.c.why':
    'GTP-U と UDP の大きさは同じですが、外側の IP ヘッダが 20 から 40 バイトに増えます。',
};
