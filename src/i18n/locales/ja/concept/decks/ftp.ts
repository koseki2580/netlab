import type { Catalog } from '../../../../types';

/** The `ftp` deck's questions (ja); its name is in the core chunk. */
export const ftp: Catalog = {
  'learning.concept.ftp.q1.b.why':
    'FTP は単一の UDP データグラムではなく 2 本の接続を持つ TCP ベースで、制御とデータを分けます。',
  'learning.concept.ftp.q1.c.why':
    'ICMP は診断用です。FTP は制御とデータを別チャネルに分け TCP 上で動きます。',
  'learning.concept.ftp.q2.a.why':
    'ポート 80 は HTTP です。FTP の制御接続はポート 21 を使います（データは 20 か交渉されたポート）。',
  'learning.concept.ftp.q2.c.why': 'ポート 53 は DNS です。FTP の制御接続はポート 21 を使います。',
  'learning.concept.ftp.q3.a.why':
    'パッシブモードは暗号化しません（それは FTPS/SFTP）。クライアントが自分のファイアウォール/NAT 越しにデータ接続を開けるようにします。',
  'learning.concept.ftp.q3.b.why':
    'パッシブ FTP は DNS と無関係です。データ接続をクライアント側のファイアウォールや NAT を越えられるようにします。',
  'learning.concept.ftp.q1.prompt': 'FTP が使うのは…',
  'learning.concept.ftp.q1.a': '制御用とデータ用の別々の接続',
  'learning.concept.ftp.q1.b': 'ファイルごとに単一の UDP データグラム',
  'learning.concept.ftp.q1.c': 'データ転送に ICMP メッセージ',
  'learning.concept.ftp.q1.why':
    'FTP はコマンド用の制御チャネルを保ち、転送には別のデータ接続を開きます。',
  'learning.concept.ftp.q2.prompt': 'FTP の制御接続のポートは…',
  'learning.concept.ftp.q2.a': '80',
  'learning.concept.ftp.q2.b': '21',
  'learning.concept.ftp.q2.c': '53',
  'learning.concept.ftp.q2.why':
    'ポート 21 が FTP コマンドを運び、データは 20（アクティブ）か交渉したポート（パッシブ）を使います。',
  'learning.concept.ftp.q3.prompt': 'パッシブ FTP が導入された理由は…',
  'learning.concept.ftp.q3.a': 'データ用の接続を暗号化するため',
  'learning.concept.ftp.q3.b': 'DNS の名前解決を速くするため',
  'learning.concept.ftp.q3.c': 'クライアント側のファイアウォールを通すため',
  'learning.concept.ftp.q3.why':
    'パッシブモードではクライアントがデータ接続を開くため、アクティブモードの着信を塞ぐ NAT/ファイアウォールを通れます。',
};
