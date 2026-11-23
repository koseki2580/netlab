import type { Catalog } from '../../../../types';

/** The `ech` deck's questions (ja); its name is in the core chunk. */
export const ech: Catalog = {
  'learning.concept.ech.q1.prompt':
    'ECH なしで、カフェの Wi-Fi から TLS 1.3 で https://clinic.example/ を開きます。Wi-Fi 上の誰かが「clinic.example」を読み取れますか？',
  'learning.concept.ech.q1.a': '読める。鍵ができる前の ClientHello に名前がある',
  'learning.concept.ech.q1.b': '読めない。TLS 1.3 は TCP ハンドシェイク後をすべて暗号化する',
  'learning.concept.ech.q1.c': 'サーバー証明書も破らない限り読めない',
  'learning.concept.ech.q1.why':
    'ClientHello には、多数のサイトを収容するサーバーがどの証明書を返すか判断できるようサイト名（SNI）が入っており、しかも鍵がまだない段階で送られます。',
  'learning.concept.ech.q1.b.why':
    'TLS 1.3 は ServerHello 以降を証明書まで暗号化しますが、ClientHello はその前に平文で送られ、SNI に名前が入っています。',
  'learning.concept.ech.q1.c.why':
    '攻撃は不要です。名前は ClientHello に平文で入っており、経路上の誰でも読めます。',
  'learning.concept.ech.q2.prompt':
    'ECH を使うと、カフェの Wi-Fi は最初のバイト列からどのサイト名を読めますか？',
  'learning.concept.ech.q2.a': '本当の名前を、ハッシュの形でだけ',
  'learning.concept.ech.q2.b': '何も読めない。ClientHello 全体が暗号化される',
  'learning.concept.ech.q2.c': 'プロバイダ共通の公開名だけ',
  'learning.concept.ech.q2.why':
    '外側の ClientHello に入るのは cdn.example、つまりそのプロバイダの全サイトが共有する公開名です。clinic.example はその内側に封をされて運ばれます。',
  'learning.concept.ech.q2.a.why':
    '既知の名前のハッシュなら一覧と突き合わせられてしまいます。ECH は本物の ClientHello を暗号化します。',
  'learning.concept.ech.q2.b.why':
    '外側の ClientHello は平文のままで cdn.example を名乗ります。封をされるのは内側の本物だけです。',
  'learning.concept.ech.q3.prompt':
    '封をされた内側の ClientHello を開いて、本当のサイトを知ることができるのは誰ですか？',
  'learning.concept.ech.q3.a': '外側の ClientHello の鍵共有を見た人なら誰でも',
  'learning.concept.ech.q3.b': 'DNS で公開した鍵を持つプロバイダ',
  'learning.concept.ech.q3.c': '誰も開けない。サーバーも本当の名前を知らない',
  'learning.concept.ech.q3.why':
    'ブラウザは内側の ClientHello を、サイトの DNS HTTPS レコードにある鍵に向けて封をします。開けるのは対応する秘密鍵を持つプロバイダだけです。',
  'learning.concept.ech.q3.a.why':
    '封はプロバイダが公開した鍵に向けて作られます。外側の ClientHello を見ても、開ける材料は何も得られません。',
  'learning.concept.ech.q3.c.why':
    'プロバイダは証明書を選ぶためにサイトを知る必要があり、秘密鍵で内側の ClientHello を開きます。',
  'learning.concept.ech.q4.prompt':
    '経路上の誰かが外側の ClientHello を 1 バイト書き換えました。プロバイダが内側を開くとどうなりますか？',
  'learning.concept.ech.q4.a': '開けない。外側も封に結び付けられている',
  'learning.concept.ech.q4.b': '普通に開ける。守られているのは内側だけ',
  'learning.concept.ech.q4.c': '開けるが、攻撃者が選んだサイト名に変わる',
  'learning.concept.ech.q4.why':
    '外側の ClientHello 全体が封の関連データ（AAD）です。隠されてはいませんが AES-GCM で認証されるため、1 バイト変わるだけで開けなくなります。',
  'learning.concept.ech.q4.b.why':
    '外側は暗号化されませんが、関連データとして認証されています。どんな変更でも復号に失敗します。',
  'learning.concept.ech.q4.c.why':
    '鍵がなければ有効な封はそもそも作れません。書き換えられたバイトは認証チェックを失敗させるだけです。',
};
