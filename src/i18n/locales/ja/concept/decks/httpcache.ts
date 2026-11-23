import type { Catalog } from '../../../../types';

/** The `httpcache` deck's questions (ja); its name is in the core chunk. */
export const httpcache: Catalog = {
  'learning.concept.httpcache.q1.prompt':
    'index.html は Cache-Control: no-cache と ETag 付きで配信され、内容は変わっていません。30 秒後にブラウザがページを開き直すと、どうなりますか？',
  'learning.concept.httpcache.q1.a': '保存したコピーを、サーバーに何も送らずにそのまま使う',
  'learning.concept.httpcache.q1.b': 'If-None-Match で確認し、本文なしの 304 が返る',
  'learning.concept.httpcache.q1.c':
    '保存されていないので、毎回ファイル全体をもう一度ダウンロードする',
  'learning.concept.httpcache.q1.why':
    'no-cache は「保存してよいが、使うたびに確認すること」という意味です。ブラウザは ETag を If-None-Match に入れて送り、版が一致するので 304 Not Modified が返り、本文はネットワークを流れません。',
  'learning.concept.httpcache.q1.a.why':
    '確認せずに使えるのはコピーが新鮮なときだけで、no-cache はそれを禁じます。使うたびに必ず再検証が要ります。',
  'learning.concept.httpcache.q1.c.why':
    'それは no-store です。no-cache ではキャッシュに保存でき、再検証するだけなので、変わっていなければ全体のダウンロードではなく 304 で済みます。',
  'learning.concept.httpcache.q2.prompt':
    '/account.json は Cache-Control: private, max-age=60 付きで、共有の CDN を通って届きます。保存するのは誰ですか？',
  'learning.concept.httpcache.q2.a': 'ブラウザだけ。CDN は保存せずに中継する',
  'learning.concept.httpcache.q2.b': '誰も保存しない。private は保存禁止の意味',
  'learning.concept.httpcache.q2.c': '両方が、それぞれ 60 秒間保存する',
  'learning.concept.httpcache.q2.why':
    'private は共有キャッシュに保存を禁じるので、ある利用者のデータが別の利用者に配られることはありません。ブラウザのプライベートキャッシュは保存でき、60 秒間は新鮮です。',
  'learning.concept.httpcache.q2.b.why':
    'すべてのキャッシュに保存を禁じるのは no-store です。private が除外するのは CDN のような共有キャッシュだけで、利用者自身のブラウザは保存できます。',
  'learning.concept.httpcache.q2.c.why':
    'max-age=60 が効くのは保存を許されたキャッシュだけで、private は全利用者が共有する CDN を除外します。',
  'learning.concept.httpcache.q3.prompt':
    'hero.jpg は ETag 付きで、Cache-Control: s-maxage=86400, max-age=60 です。最初の訪問から 2 分後、ブラウザがページを開き直すとどうなりますか？',
  'learning.concept.httpcache.q3.a': 'ブラウザが画像全体をオリジンからもう一度ダウンロードする',
  'learning.concept.httpcache.q3.b': 'ブラウザは自分のコピーをそのまま使う。まだ 1 日は新鮮だから',
  'learning.concept.httpcache.q3.c': 'ブラウザが CDN に確認し、CDN 自身が 304 を返す',
  'learning.concept.httpcache.q3.why':
    'ブラウザにとって max-age=60 は切れているので再検証します。s-maxage が max-age を上書きするのは共有キャッシュでだけなので、CDN のコピーはまだ新鮮で、CDN 自身が 304 を返します。オリジンには問い合わせません。',
  'learning.concept.httpcache.q3.a.why':
    'ブラウザにはコピーと検証子があるので条件付きリクエストを送り、画像は変わっていないので全体のダウンロードにはなりません。しかもオリジンに届く前に CDN が答えます。',
  'learning.concept.httpcache.q3.b.why':
    's-maxage が効くのは共有キャッシュだけです。ブラウザは max-age=60 に従うので、120 秒後のコピーは古くなっています。',
  'learning.concept.httpcache.q4.prompt':
    '60 秒の時点で公開があり、style.css（max-age=3600）と index.html（no-cache）が変わりました。120 秒の時点でブラウザが表示するのは？',
  'learning.concept.httpcache.q4.a': '両方とも新しい版。オリジンで内容が変わったから',
  'learning.concept.httpcache.q4.b': '新しい index.html と、確認なしで使う古い style.css',
  'learning.concept.httpcache.q4.c':
    'max-age の 1 時間が過ぎるまでは、どちらのファイルも古い版のまま',
  'learning.concept.httpcache.q4.why':
    'index.html は使うたびに再検証されるので、ETag が変わればすぐ新しい版になります。style.css は 1 時間はまだ新鮮なのでリクエストなしで使われ、古いままです。だから長い max-age は、内容が変わると名前も変わるファイルにだけ付けます。',
  'learning.concept.httpcache.q4.a.why':
    'キャッシュは公開を知りません。新鮮なコピーは確認なしで使われるので、style.css は max-age が切れるまで古いままです。',
  'learning.concept.httpcache.q4.c.why':
    'no-cache なので index.html は毎回確認され、新しい ETag にすぐ気づきます。古いまま残るのは新鮮な style.css だけです。',
};
