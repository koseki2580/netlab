import type { Catalog } from '../../../../types';

/** The `masque` deck's questions (ja); its name is in the core chunk. */
export const masque: Catalog = {
  'learning.concept.masque.q1.prompt':
    '別々の会社が運用する 2 つの MASQUE リレー（入口と出口）を経由するとき、あなた以外で「あなたのアドレス」と「news.example を見ていること」の両方を知るのは誰ですか？',
  'learning.concept.masque.q1.a': 'あなたが接続する入口リレー',
  'learning.concept.masque.q1.b': 'リクエストを開く出口リレー',
  'learning.concept.masque.q1.c': 'あなた以外には誰もいない',
  'learning.concept.masque.q1.why':
    '各リレーは半分ずつしか知りません。入口は「誰か」を、出口は「どこへ」を知ります。両者の運用者が情報を突き合わせない限り、結び付けられません。',
  'learning.concept.masque.q1.a.why':
    '入口リレーはあなたのアドレスを見ますが、届くのは出口リレー宛てに封をされたリクエストだけで、サイトは分かりません。',
  'learning.concept.masque.q1.b.why':
    '出口リレーはサイトを知りますが、パケットは入口リレーのアドレスから届き、あなたのアドレスは見えません。',
  'learning.concept.masque.q2.prompt':
    '代わりに CONNECT-UDP プロキシを 1 つだけ使うと、そのプロキシは何を知りますか？',
  'learning.concept.masque.q2.a': 'あなたのアドレスと訪問先サイトの両方',
  'learning.concept.masque.q2.b': 'アドレスだけ。サイトは封をされたまま',
  'learning.concept.masque.q2.c': 'サイトだけ。アドレスは隠れたまま',
  'learning.concept.masque.q2.why':
    'プロキシ 1 つではパケットを受け取り、転送先も教えられるため、「誰か」と「どこへ」を単独で結び付けられます。プライベートリレーが 2 段構成にする理由です。',
  'learning.concept.masque.q2.b.why':
    'プロキシは転送先（「news.example へ CONNECT-UDP」）を教えられる必要があるので、サイトを知ります。',
  'learning.concept.masque.q2.c.why':
    'パケットはあなた自身のアドレスからプロキシに届くので、誰なのかも分かります。',
  'learning.concept.masque.q3.prompt':
    '2 つのリレーを使うとき、出口リレーはあなたがサイトで読んでいるページを読めますか？',
  'learning.concept.masque.q3.a': '読める。転送するためにリクエストを復号する',
  'learning.concept.masque.q3.b': '読めない。サイトとの QUIC がエンドツーエンドで暗号化されている',
  'learning.concept.masque.q3.c': '読める。HTTP/3 プロキシは必ず TLS を終端する',
  'learning.concept.masque.q3.why':
    'サイトとのあなた自身の QUIC 接続が、HTTP Datagram としてプロキシの層の内側を運ばれます。その鍵を持つのはサイトだけです。',
  'learning.concept.masque.q3.a.why':
    '開けるのは自分宛ての層（「このホストへ接続して」）だけです。その内側はサイトと鍵を共有した QUIC 接続です。',
  'learning.concept.masque.q3.c.why':
    'CONNECT-UDP は内側の QUIC を終端せずにデータグラムとして中継します。プロキシの TLS が守るのは自分の層だけです。',
  'learning.concept.masque.q4.prompt':
    '2 つのリレーを使うとき、news.example から見た通信の送信元アドレスはどれですか？',
  'learning.concept.masque.q4.a': '出口リレーのアドレス',
  'learning.concept.masque.q4.b': '内側に運ばれたあなたのアドレス',
  'learning.concept.masque.q4.c': '入口リレーのアドレス',
  'learning.concept.masque.q4.why':
    '各ホップは自分のアドレスから送るので、サイトに見えるのは出口リレーです。通常は近くの出口が選ばれ、分かるのはおおよその地域だけです。',
  'learning.concept.masque.q4.b.why':
    'あなたのアドレスを先へ運ぶ層はありません。各ホップは自分のアドレスから送ります。',
  'learning.concept.masque.q4.c.why':
    '入口リレーが送る相手は出口リレーだけです。サイトまでの最後の区間は出口リレーから送られます。',
};
