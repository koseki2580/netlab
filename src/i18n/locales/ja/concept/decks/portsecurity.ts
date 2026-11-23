import type { Catalog } from '../../../../types';

/** The `portsecurity` deck's questions (ja); its name is in the core chunk. */
export const portsecurity: Catalog = {
  'learning.concept.portsecurity.q1.prompt':
    '802.1X を有効にしたポートにノート PC をつなぎました。まだ認証は済んでいません。スイッチが転送するのは、PC のどのフレーム？',
  'learning.concept.portsecurity.q1.a': '認証を運ぶ EAPOL だけ',
  'learning.concept.portsecurity.q1.b': '先にアドレスを取れるよう EAPOL と DHCP',
  'learning.concept.portsecurity.q1.c': 'すべて（802.1X は接続者を記録するだけ）',
  'learning.concept.portsecurity.q1.why':
    'RADIUS サーバが Access-Accept を返すまでポートは未認証で、転送するのは EAPOL だけです。スイッチはそれを RADIUS へ中継します。PC はまだアドレスすら取れません。',
  'learning.concept.portsecurity.q1.b.why':
    '未認証のポートは DHCP も通しません。身元を証明するまで、機器はアドレスを取れません。',
  'learning.concept.portsecurity.q1.c.why':
    '802.1X は記録ではなくアクセス制御です。RADIUS が受け入れるまで、ポートは EAPOL 以外をすべて捨てます。',
  'learning.concept.portsecurity.q2.prompt':
    '802.1X のソフトを持たないプリンタをつなぎました。RADIUS はその MAC アドレスを知っていて、VLAN 40 に割り当てます。どうなる？',
  'learning.concept.portsecurity.q2.a': 'EAPOL に答えないので、そのまま拒否される',
  'learning.concept.portsecurity.q2.b': '待たずにすぐゲスト VLAN へ入れられる',
  'learning.concept.portsecurity.q2.c': '90 秒待ったあと MAB で VLAN 40 に入る',
  'learning.concept.portsecurity.q2.why':
    'スイッチは 30 秒おきに 3 回 EAP の要求を送り、そのあと MAC 認証バイパス（MAB）を試します。RADIUS は MAC を知っているので、Tunnel-Private-Group-ID 40 を付けて Access-Accept を返します。',
  'learning.concept.portsecurity.q2.a.why':
    'EAPOL に答えなくても終わりではありません。スイッチは MAB に切り替え、機器の MAC を名前として RADIUS へ送ります。',
  'learning.concept.portsecurity.q2.b.why':
    'ゲスト VLAN は RADIUS が拒否した機器のためのものです。この MAC は登録済みなので、Access-Accept が専用の VLAN を指定します。また MAB は EAP のタイムアウトを待ってから始まります。',
  'learning.concept.portsecurity.q3.prompt':
    'ポートセキュリティで許す MAC アドレスは 1 個、違反時の動作は shutdown です。壁のコンセントの先に小さなスイッチがつながれ、3 台がそれぞれ 1 フレームずつ送ります。つながるのは何台？',
  'learning.concept.portsecurity.q3.a': '最初の 1 台だけ（残りは捨てられる）',
  'learning.concept.portsecurity.q3.b': '0 台（ポートが err-disabled になる）',
  'learning.concept.portsecurity.q3.c': '3 台とも（違反がログに残るだけ）',
  'learning.concept.portsecurity.q3.why':
    '2 台目の MAC が違反となり、shutdown ではポート全体が err-disabled になります。管理者か自動復旧のタイマーが戻すまで、最初の 1 台も含めて 3 台中 0 台がつながりません。',
  'learning.concept.portsecurity.q3.a.why':
    'それは protect か restrict の場合です。shutdown は最初の違反でポートごと止めます。',
  'learning.concept.portsecurity.q3.c.why':
    'ポートセキュリティが上限を超えた MAC を通すことはありません。ログを残すのは、捨てたうえで restrict が加える動作です。',
  'learning.concept.portsecurity.q4.prompt':
    'DHCP スヌーピングとダイナミック ARP インスペクション（DAI）が有効で、信頼するのはアップリンクだけです。固定アドレスで DHCP のリースを持たないホストが、アクセスポートから ARP を送りました。DAI はどうする？',
  'learning.concept.portsecurity.q4.a': '捨てる（その IP と MAC のバインディングがない）',
  'learning.concept.portsecurity.q4.b': '通す（固定アドレスのホストは DHCP が不要）',
  'learning.concept.portsecurity.q4.c': '通す（IP がサブネット内に収まっている）',
  'learning.concept.portsecurity.q4.why':
    'DAI は、信頼しないポートからの ARP を、送信元の IP・MAC・ポートが DHCP スヌーピングのバインディングと一致しない限り捨てます。固定アドレスのホストには、静的なバインディングか ARP ACL が必要です。',
  'learning.concept.portsecurity.q4.b.why':
    'DAI にはホストが固定アドレスかどうかはわかりません。信じるのは DHCP の ACK から学んだバインディングだけで、このホストには何もありません。',
  'learning.concept.portsecurity.q4.c.why':
    'DAI はバインディングテーブルの IP・MAC・ポートとの完全な一致を見ます。サブネットに収まっているかは確かめません。',
};
