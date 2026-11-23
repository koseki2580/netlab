import type { Catalog } from '../../../../types';

/** The `roaming` deck's questions (ja); its name is in the core chunk. */
export const roaming: Catalog = {
  'learning.concept.roaming.q1.prompt':
    '電話のローミングのしきい値を −70 dBm から −85 dBm に下げました。AP の前を歩いていくとき、何が変わりますか？',
  'learning.concept.roaming.q1.a': 'いちばん強い AP を追って、早く頻繁にローミングする',
  'learning.concept.roaming.q1.b': '変わらない。端末をいつ移すかはコントローラが決める',
  'learning.concept.roaming.q1.c': '遠くの AP に弱い電波のまま長くしがみつく',
  'learning.concept.roaming.q1.why':
    'いつローミングするかを決めるのは端末だけで、今の AP がしきい値より弱くなるまで待ちます。しきい値を下げると、遠くの AP にとどまる「スティッキークライアント」になり、遅い通信速度に落ちて、その AP のほかの端末の通信時間まで奪います。802.11k と 802.11v は助言しかできません。',
  'learning.concept.roaming.q1.a.why':
    'しきい値が低いほど上回り続けやすいので、電話はローミングまで長く待つようになります。早くはなりません。',
  'learning.concept.roaming.q1.b.why':
    'コントローラや AP はよりよい AP を勧められます（802.11v）が、決めるのは端末で、自分のしきい値を使います。',
  'learning.concept.roaming.q2.prompt':
    'ローミングのたびに 802.1X で最初からログインします。30 ms 先の RADIUS サーバと EAP を 8 往復します。通話が隠せる途切れは 150 ms までです。通話はどうなりますか？',
  'learning.concept.roaming.q2.a': '約 260 ms 途切れ、相手には音声の欠けが聞こえる',
  'learning.concept.roaming.q2.b': '再アソシエーションの約 10 ms だけで、通話が隠せる',
  'learning.concept.roaming.q2.c': '途切れない。新しい鍵ができるまで古い AP の鍵を使い続ける',
  'learning.concept.roaming.q2.why':
    'EAP の 8 往復だけで 240 ms かかり、認証・再アソシエーション・4 ウェイハンドシェイクを足すと 260 ms です。通話が隠せる 150 ms を超えるので、音声パケットが約 13 個失われます。',
  'learning.concept.roaming.q2.b.why':
    '無線上のフレーム交換は短いですが、フルログインでは EAP の往復ごとに RADIUS サーバを待つので、そちらが大半を占めます。',
  'learning.concept.roaming.q2.c.why':
    '古い AP の鍵は新しい AP では使えません。802.1X と 4 ウェイハンドシェイクが終わるまで、新しい AP で音声は流れません。',
  'learning.concept.roaming.q3.prompt':
    '802.11r の高速ローミング（FT）が約 10 ms で済むのはなぜですか？',
  'learning.concept.roaming.q3.a': '通話が終わるまで暗号化を省くから',
  'learning.concept.roaming.q3.b': '鍵を前もって導出済みで、RADIUS との往復が要らないから',
  'learning.concept.roaming.q3.c': '同じ EAP ログインを、再アソシエーションと並行して行うから',
  'learning.concept.roaming.q3.why':
    'FT では最初のログインから次の AP 用の鍵を前もって導出しておくので、ローミングは無線上の 2 回の交換（FT 認証と再アソシエーション、各 5 ms）だけで済みます。',
  'learning.concept.roaming.q3.a.why':
    '通信は暗号化されたままです。FT はセキュリティを落とすのではなく、鍵を用意しておくことで速くしています。',
  'learning.concept.roaming.q3.c.why':
    'FT ではローミング中に EAP をまったく送りません。重ねるべき RADIUS の往復はなく、無線上の 2 回の交換だけです。',
  'learning.concept.roaming.q4.prompt':
    'セントラルスイッチング（CAPWAP）です。AP1 の電話 A が AP2 の電話 B に発信します。AP は 2 台ともスイッチ SW1 につながっています。音声フレームはどう流れますか？',
  'learning.concept.roaming.q4.a': 'AP1 → SW1 → AP2。スイッチを通る最短の道',
  'learning.concept.roaming.q4.b': '無線で AP1 から AP2 へ直接',
  'learning.concept.roaming.q4.c': 'トンネルで WLC まで行き、AP2 へ戻ってくる',
  'learning.concept.roaming.q4.why':
    'セントラルスイッチングでは、端末のフレームはすべて CAPWAP トンネルでコントローラまで行って戻ります。ここでは AP1・SW1・Core・WLC・Core・SW1・AP2 で、2 リンクではなく 6 リンクです。その代わり端末の VLAN とアドレスはコントローラ側にあり、ローミングしても変わりません。',
  'learning.concept.roaming.q4.a.why':
    'それはローカルスイッチングで、AP 自身が通信を有線の VLAN へ流します。セントラルスイッチングでは、フレームはまずコントローラへトンネルされます。',
  'learning.concept.roaming.q4.b.why':
    'AP どうしが端末のフレームを無線で中継することはありません。各 AP は有線のアップリンクへ送ります。',
};
