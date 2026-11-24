import type { Catalog } from '../../../../types';

/** The `plpmtud` deck's questions (ja); its name is in the core chunk. */
export const plpmtud: Catalog = {
  'learning.concept.plpmtud.q1.prompt':
    '経路の途中のトンネルは 1400 バイトまでのパケットしか運べず、ファイアウォールが ICMP をすべて捨てます。従来の PMTUD を使う送り手が最大サイズのパケットで止まってしまうのはなぜ？',
  'learning.concept.plpmtud.q1.a': 'Packet Too Big が返らず、同じサイズで再送し続けるから',
  'learning.concept.plpmtud.q1.b': 'トンネルがパケットを分割し、受け手がそれを捨てるから',
  'learning.concept.plpmtud.q1.c': 'ファイアウォールが DF の立ったパケットをすべて捨てるから',
  'learning.concept.plpmtud.q1.why':
    '従来の PMTUD は、ルータが返す Packet Too Big でしか経路 MTU を知りません。それが捨てられると送り手は 1400 を知ることができず、再送もまた大きすぎて失われます。これがブラックホールです。',
  'learning.concept.plpmtud.q1.b.why':
    'DF が立っていれば（IPv6 では常に）ルータは分割せず、パケットを捨てて Packet Too Big を返します。ファイアウォールが消しているのはそのメッセージです。',
  'learning.concept.plpmtud.q1.c.why':
    'DF の立った小さなパケットは通ります。捨てられるのは 1400 バイトを超えるものだけで、捨てるのはトンネルです。',
  'learning.concept.plpmtud.q2.prompt':
    'QUIC の送り手が DPLPMTUD を使います。確実に通るものとして出発点にするサイズは？',
  'learning.concept.plpmtud.q2.a': '自分のリンクの Ethernet MTU、1500 バイト',
  'learning.concept.plpmtud.q2.b': '古い IPv4 の最小値、576 バイト',
  'learning.concept.plpmtud.q2.c': 'UDP ペイロードで 1200 バイト',
  'learning.concept.plpmtud.q2.why':
    'QUIC の経路はどれも 1200 バイトのデータグラムを運べなければなりません（RFC 9000 §14）。それが BASE_PLPMTU で、IPv6 なら 1248 バイトのパケットとなり、どの IPv6 リンクも運べなければならない最小 MTU の 1280 バイトに収まります。',
  'learning.concept.plpmtud.q2.a.why':
    '自分のリンクは 1500 を通しますが、その先のトンネルが通すとは限りません。1500 は試してよい最大で、通ると分かっている値ではありません。',
  'learning.concept.plpmtud.q2.b.why':
    'QUIC は 1200 バイトを運べない経路では使ってはいけないので、1200 は通ると分かっています。576 から始めても、QUIC が必要としない大きさを試すだけです。',
  'learning.concept.plpmtud.q3.prompt':
    '1389 バイトの DPLPMTUD のプローブに確認応答が返ってきません。送り手はどう判断する？',
  'learning.concept.plpmtud.q3.a': '経路が混んでいるので、送信レートを半分にする',
  'learning.concept.plpmtud.q3.b': '3 回失われたら、1389 は通らないとみなす',
  'learning.concept.plpmtud.q3.c': '接続が壊れたので、最初からやり直す',
  'learning.concept.plpmtud.q3.why':
    'MAX_PROBES（既定値 3）回続けて確認されなければそのサイズは通らないとみなし、もっと小さなサイズを探します。ふつうの通信が危険にさらされることはありません。',
  'learning.concept.plpmtud.q3.a.why':
    'プローブは確認済みのサイズより大きく、ときどき失われるのが前提です。RFC 9000 は、その消失で輻輳制御を働かせるべきではないとしています。',
  'learning.concept.plpmtud.q3.c.why':
    '大きすぎたのはプローブだけです。ふつうのパケットは確認済みのサイズのまま流れ続けます。',
  'learning.concept.plpmtud.q4.prompt':
    '1200 から始め、差が 8 バイト以下になったら止まるレッスンの半分ずつの探し方を、1400 バイトの IPv6 の経路で使います。どこに落ち着く？',
  'learning.concept.plpmtud.q4.a': '1352 バイト、ちょうど通る大きさ',
  'learning.concept.plpmtud.q4.b': '1349 バイト、通る大きさより少し下',
  'learning.concept.plpmtud.q4.c': '1400 バイト、経路 MTU そのもの',
  'learning.concept.plpmtud.q4.why':
    '確認できた大きさと失われた大きさの差が 8 バイト以内になると止まり、6 サイズ試したところで 1349 です。通るのは 1352 までなので 3 バイト足りませんが、超えることはありません。',
  'learning.concept.plpmtud.q4.a.why':
    'ちょうどの大きさにたどり着くには、最後に 1 バイトずつ試すなど、もっと多くのプローブが要ります。この探し方は 8 バイト以内で止まります。',
  'learning.concept.plpmtud.q4.c.why':
    '1400 は IPv6 パケット全体の大きさです。データグラムのサイズには IPv6 と UDP のヘッダ 48 バイトが含まれないので、通るのは最大 1352 です。',
};
