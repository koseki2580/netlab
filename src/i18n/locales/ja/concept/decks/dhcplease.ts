import type { Catalog } from '../../../../types';

/** The `dhcplease` deck's questions (ja); its name is in the core chunk. */
export const dhcplease: Catalog = {
  'learning.concept.dhcplease.q1.prompt':
    'ノート PC が、唯一の DHCP サーバから 8 時間のリースを受け取りました。1 時間後にサーバが落ちます。ノート PC の要求に初めて応答がなくなるのはいつ？',
  'learning.concept.dhcplease.q1.a': '1 時間後。落ちたことにすぐ気づく',
  'learning.concept.dhcplease.q1.b': '4 時間後。更新を頼むとき（T1）',
  'learning.concept.dhcplease.q1.c': '8 時間後。リースが切れたとき',
  'learning.concept.dhcplease.q1.why':
    '更新と更新の間、クライアントとサーバは何もやりとりしません。リース取得後の最初のメッセージは T1、つまり 8 時間の半分の 4 時間後に送るユニキャストの DHCPREQUEST です。ノート PC はリースが切れる 8 時間後まで普通に使えます。',
  'learning.concept.dhcplease.q1.a.why':
    'サーバが落ちたことをクライアントに知らせるものはありません。DHCP にはキープアライブがないので、次にサーバが必要になるまで気づきません。',
  'learning.concept.dhcplease.q1.c.why':
    'アドレスを失うのは 8 時間後ですが、その前の T1（4 時間後）から応答のない要求を送り、T2（7 時間後）からはブロードキャストしています。',
  'learning.concept.dhcplease.q2.prompt':
    '24 時間のリースを持つクライアントが、更新の要求に応答をもらえません。どのサーバでも応えられるように要求をブロードキャストし始めるのはいつ？',
  'learning.concept.dhcplease.q2.a': '12 時間後。最初の更新と同時に',
  'learning.concept.dhcplease.q2.b': '24 時間後。リースが切れてから',
  'learning.concept.dhcplease.q2.c': '21 時間後。T2（リースの 7/8）',
  'learning.concept.dhcplease.q2.why':
    'T1（12 時間後）の更新は、リースをくれたサーバだけにユニキャストで送ります。T2 = 0.875 × 24 時間 = 21 時間後に REBINDING に入り、DHCPREQUEST をブロードキャストします。',
  'learning.concept.dhcplease.q2.a.why':
    'T1 の更新はリースをくれたサーバへのユニキャストです。ブロードキャストは T2 のための予備の手段です。',
  'learning.concept.dhcplease.q2.b.why':
    'リースが切れるとクライアントはアドレスを手放して DHCPDISCOVER を送ります。ブロードキャストの再バインドはそれより前の T2 です。',
  'learning.concept.dhcplease.q3.prompt':
    '8 時間のリースで、サーバが 5 時間後に落ちて戻りません。クライアントがアドレスを失うのはいつ？',
  'learning.concept.dhcplease.q3.a': '12 時間後。4 時間後の更新でリースが延びた',
  'learning.concept.dhcplease.q3.b': '8 時間後。最初のリースが終わるとき',
  'learning.concept.dhcplease.q3.c': '13 時間後。落ちてから 8 時間後',
  'learning.concept.dhcplease.q3.why':
    'T1 の 4 時間後にはサーバはまだ動いていて、その時点から 8 時間のリースに更新しました。このリースは 12 時間後に切れます。8 時間後から更新、11 時間後から再バインドを試しても応答はありません。',
  'learning.concept.dhcplease.q3.b.why':
    '4 時間後の更新で、最初のリースは 4 時間後から数える新しいリースに置き換わりました。8 時間後はもう終わりではありません。',
  'learning.concept.dhcplease.q3.c.why':
    'リースはサーバが落ちた時刻ではなく、与えられた時刻から数えます。最後に与えられたのは 4 時間後なので、終わりは 12 時間後です。',
  'learning.concept.dhcplease.q4.prompt':
    '2 台目のサーバ B が、このクライアントのリースを知っています。サーバ A は T1 より前に落ちました。B が応えるのが T1 ではなく T2 なのはなぜ？',
  'learning.concept.dhcplease.q4.a': 'B は A がしばらく黙るまで待つから',
  'learning.concept.dhcplease.q4.b': 'B はクライアントが DISCOVER を送るまで応えないから',
  'learning.concept.dhcplease.q4.c':
    'T1 の更新は A 宛てのユニキャストで、再バインドだけがブロードキャストだから',
  'learning.concept.dhcplease.q4.why':
    '更新はリースをくれたサーバへのユニキャストなので、B には届きません。T2 でクライアントがブロードキャストすると B が応え、新しいリースでアドレスを使い続けられます。',
  'learning.concept.dhcplease.q4.a.why':
    'B は A を見張っていません。A だけに宛てた更新の要求が、B には届かないだけです。',
  'learning.concept.dhcplease.q4.b.why':
    'B はリースが切れる前、T2 のブロードキャストの再バインドに応えられます。だからクライアントはアドレスを失わず、DISCOVER も要りません。',
};
