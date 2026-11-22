import type { Catalog } from '../../../../types';

/** The `ssh` deck's questions (ja); its name is in the core chunk. */
export const ssh: Catalog = {
  'learning.concept.ssh.q1.b.why':
    '平文転送は FTP/Telnet です。SSH は暗号化されたリモートシェルと安全なトンネルを提供します。',
  'learning.concept.ssh.q1.c.why':
    'アドレス割り当ては DHCP です。SSH は暗号化されたリモートシェルとトンネリングを提供します。',
  'learning.concept.ssh.q2.a.why': 'ポート 23 は Telnet（非暗号）です。SSH は 22 で待ち受けます。',
  'learning.concept.ssh.q2.c.why': 'ポート 443 は HTTPS です。SSH は 22 で待ち受けます。',
  'learning.concept.ssh.q3.a.why':
    'MAC フィルタリングは偽装も容易な弱い L2 アクセス制御です。SSH の強力な方式は公開鍵認証です。',
  'learning.concept.ssh.q3.b.why':
    'VLAN タグはトラフィックを分けるもので利用者認証ではありません。SSH は公開鍵認証を使います。',
  'learning.concept.ssh.q1.prompt': 'SSH が提供するのは…',
  'learning.concept.ssh.q1.a': '暗号化されたリモートシェルとトンネル',
  'learning.concept.ssh.q1.b': 'サーバへの平文ファイル転送',
  'learning.concept.ssh.q1.c': 'クライアントへの IP アドレス割り当て',
  'learning.concept.ssh.q1.why':
    'SSH は暗号化と認証でリモートログインや任意のトンネルを保護し、Telnet を置き換えます。',
  'learning.concept.ssh.q2.prompt': 'SSH のウェルノウンポートは？',
  'learning.concept.ssh.q2.a': '23',
  'learning.concept.ssh.q2.b': '22',
  'learning.concept.ssh.q2.c': '443',
  'learning.concept.ssh.q2.why': '22 が SSH、23 は安全でない Telnet、443 は HTTPS です。',
  'learning.concept.ssh.q3.prompt': 'パスワードより強い SSH 認証方式は…',
  'learning.concept.ssh.q3.a': 'スイッチポートでの MAC フィルタリング',
  'learning.concept.ssh.q3.b': 'セッションへの VLAN タグ付与',
  'learning.concept.ssh.q3.c': '公開鍵認証',
  'learning.concept.ssh.q3.why':
    '鍵ペアは秘密を回線に流さず認証します。サーバはクライアントの公開鍵を信頼します。',
};
