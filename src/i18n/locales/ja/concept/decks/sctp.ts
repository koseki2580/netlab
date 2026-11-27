import type { Catalog } from '../../../../types';

/** The `sctp` deck's questions (ja); its name is in the core chunk. */
export const sctp: Catalog = {
  'learning.concept.sctp.q1.prompt':
    'SCTP のアソシエーションにプライマリとセカンダリの経路があり、プライマリが切れました。RTO は 1 秒から始まりタイムアウトごとに 2 倍（上限 60 秒）、エラー数が Path.Max.Retrans = 5 を超えるとプライマリをあきらめます。新しいデータがセカンダリへ移るのはいつ？',
  'learning.concept.sctp.q1.a': '5 秒後（1 秒のタイムアウト 5 回）',
  'learning.concept.sctp.q1.b': '31 秒後（倍々のタイムアウト 5 回）',
  'learning.concept.sctp.q1.c': '63 秒後（倍々のタイムアウト 6 回）',
  'learning.concept.sctp.q1.why':
    '「5 を超える」のは 6 回めのタイムアウトで、1 回ごとに待ち時間が前の 2 倍になります。1 + 2 + 4 + 8 + 16 + 32 = 63 秒です。',
  'learning.concept.sctp.q1.a.why':
    'RTO は一定ではなく、タイムアウトのたびに 2 倍になります。待ち時間は 1、2、4、8 … 秒と伸びます。',
  'learning.concept.sctp.q1.b.why':
    'タイムアウト 5 回ではエラー数は 5 で、Path.Max.Retrans と等しいだけです。あきらめるのは超えたとき、つまり 6 回めです。',
  'learning.concept.sctp.q2.prompt':
    '1 つのアソシエーションで順序ありのストリームを 2 本使います。A1（ストリーム 1）、B1（ストリーム 2）、A2、B2、A3、B3 の順に送り、A1 が失われました。アプリケーションに渡るのが遅れるのはどれ？',
  'learning.concept.sctp.q2.a': 'A1、A2、A3（ストリーム 1 だけ）',
  'learning.concept.sctp.q2.b': 'A1 が再送されるまで 6 つすべて',
  'learning.concept.sctp.q2.c': 'A1 だけ',
  'learning.concept.sctp.q2.why':
    '順序はストリームの中でだけ守られます。A2 と A3 は A1 を待ちますが、B1、B2、B3 は届いたらすぐに渡されます。',
  'learning.concept.sctp.q2.b.why':
    'それは 1 本の TCP 接続の場合で、すべてのバイトが 1 つの順序に並びます。SCTP はストリームごとに順序を守ります。',
  'learning.concept.sctp.q2.c.why':
    'ストリーム 1 は順序ありなので、A2 と A3 はもう届いていても A1 より先には渡せません。',
  'learning.concept.sctp.q3.prompt':
    '同じ障害で、RTO は 1 秒から始まり 2 倍ずつ増えますが、運用者が Path.Max.Retrans = 2 にしました。新しいデータがセカンダリへ移るのはいつ？',
  'learning.concept.sctp.q3.a': '2 秒後（1 秒のタイムアウト 2 回）',
  'learning.concept.sctp.q3.b': '7 秒後（1 + 2 + 4 秒）',
  'learning.concept.sctp.q3.c': '3 秒後（1 + 2 秒）',
  'learning.concept.sctp.q3.why':
    'エラー数が 2 を超える必要があるので、3 回めのタイムアウトで切り替わります。1 + 2 + 4 = 7 秒で、初期値 5 のときの 63 秒よりずっと早くなります。',
  'learning.concept.sctp.q3.a.why':
    'RTO はタイムアウトのたびに 2 倍になり、あきらめるのはエラー数が 2 を超える 3 回めです。',
  'learning.concept.sctp.q3.c.why':
    'タイムアウト 2 回ではエラー数は 2 で、Path.Max.Retrans と等しいだけです。超えるには 4 秒の 3 回めが要ります。',
  'learning.concept.sctp.q4.prompt':
    '同じ 6 つのメッセージを今度は 1 本の TCP 接続で送り、A1 が失われました。アプリケーションに渡るのが遅れるのはいくつ？',
  'learning.concept.sctp.q4.a': '1 つ（A1 だけ）',
  'learning.concept.sctp.q4.b': '3 つ（A1、A2、A3）',
  'learning.concept.sctp.q4.c': '6 つすべて',
  'learning.concept.sctp.q4.why':
    'TCP は順序のある 1 本のバイト列を渡すので、失われたバイトより後ろはすべて再送を待ちます。これが head-of-line ブロッキングです。',
  'learning.concept.sctp.q4.a.why':
    'TCP は欠けたバイトより後ろのバイトを先に渡せないので、A1 より後のメッセージも待たされます。',
  'learning.concept.sctp.q4.b.why':
    'TCP はアプリケーションのストリームを知りません。B1、B2、B3 も 1 本のバイト列の中で A1 の後ろに並んでいます。',
};
