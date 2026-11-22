import type { Catalog } from '../../../../types';

/** The `smtp` deck's questions (ja); its name is in the core chunk. */
export const smtp: Catalog = {
  'learning.concept.smtp.q1.b.why':
    '受信は IMAP/POP3 の役割です。メールクライアントが SMTP を使うのは送信（投稿）側だけで、メールの取得には使いません。',
  'learning.concept.smtp.q1.c.why':
    'ホスト名解決は DNS です。SMTP はメールを送信・中継するプロトコルです。',
  'learning.concept.smtp.q2.a.why':
    'ポート 110 は POP3（受信）です。SMTP は 25（サーバ間中継）か 587（投稿）を使います。',
  'learning.concept.smtp.q2.c.why': 'ポート 22 は SSH です。SMTP は 25 か 587 を使います。',
  'learning.concept.smtp.q3.a.why':
    'A レコードはホストの IPv4 を返します。メール配送は MX レコードが指示します。',
  'learning.concept.smtp.q3.b.why':
    'CNAME は別名です。ドメインのメールサーバを示すレコードは MX です。',
  'learning.concept.smtp.q1.prompt': 'SMTP の用途は…',
  'learning.concept.smtp.q1.a': 'サーバ間でメールを送信・中継する',
  'learning.concept.smtp.q1.b': 'クライアントへメールを受信する',
  'learning.concept.smtp.q1.c': 'ホスト名を解決する',
  'learning.concept.smtp.q1.why':
    'SMTP はクライアント→サーバ、サーバ→サーバへメールを押し出します。受信は IMAP/POP3 です。',
  'learning.concept.smtp.q2.prompt': 'SMTP がよく使うポートは…',
  'learning.concept.smtp.q2.a': '110',
  'learning.concept.smtp.q2.b': '25',
  'learning.concept.smtp.q2.c': '22',
  'learning.concept.smtp.q2.why':
    '25 はサーバ間 SMTP、587 は認証付きクライアント送信、110 は POP3 です。',
  'learning.concept.smtp.q3.prompt': 'ドメインのメール配送先を示す DNS レコードは？',
  'learning.concept.smtp.q3.a': 'A',
  'learning.concept.smtp.q3.b': 'CNAME',
  'learning.concept.smtp.q3.c': 'MX',
  'learning.concept.smtp.q3.why': 'MX レコードはドメインのメール交換ホストを示します。',
};
