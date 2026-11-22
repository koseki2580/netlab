import type { Catalog } from '../../../../types';

/** The `email` deck's questions (ja); its name is in the core chunk. */
export const email: Catalog = {
  'learning.concept.email.q1.b.why':
    'サーバ間の送信・中継は SMTP です。IMAP と POP3 はクライアントへメールを受信します。',
  'learning.concept.email.q1.c.why':
    'アドレス割り当ては DHCP です。IMAP/POP3 はメールボックスサーバからメールを取得します。',
  'learning.concept.email.q2.a.why':
    '両方とも TLS で動かせます。本質的な違いは IMAP がサーバ側で同期し、POP3 はダウンロードして削除する点です。',
  'learning.concept.email.q2.c.why':
    'POP3 は受信であって送信ではありません（送信は SMTP）。IMAP はサーバ上で同期し、POP3 はダウンロードします。',
  'learning.concept.email.q3.a.why':
    'ICMP はメールではなく診断用です。セキュアな IMAP/POP3 は TLS で包まれます。',
  'learning.concept.email.q3.b.why':
    'ARP は LAN で IP→MAC を解決します。メール受信は TLS で保護します。',
  'learning.concept.email.q1.prompt': 'IMAP と POP3 の用途は…',
  'learning.concept.email.q1.a': 'メールボックスからメールを受信する',
  'learning.concept.email.q1.b': 'サーバ間でメールを送信する',
  'learning.concept.email.q1.c': 'ホストに IP を割り当てる',
  'learning.concept.email.q1.why':
    'これらはメールをクライアントへ取り込みます。送信は SMTP の役割です。',
  'learning.concept.email.q2.prompt': 'IMAP と POP3 の主な違いは…',
  'learning.concept.email.q2.a': 'IMAP は暗号化なしでしか使えない',
  'learning.concept.email.q2.b': 'IMAP はサーバに残し、POP3 は取得して削除する',
  'learning.concept.email.q2.c': 'POP3 はメールを送信するプロトコル',
  'learning.concept.email.q2.why':
    'IMAP はサーバ側・複数端末向け、POP3 は従来1 端末へダウンロードします。',
  'learning.concept.email.q3.prompt': 'セキュアな IMAP/POP3 が乗るのは…',
  'learning.concept.email.q3.a': 'ICMP',
  'learning.concept.email.q3.b': 'ARP',
  'learning.concept.email.q3.c': 'TLS',
  'learning.concept.email.q3.why': 'IMAPS/POP3S はセッションを TLS で包み機密性を確保します。',
};
