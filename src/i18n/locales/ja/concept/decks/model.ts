import type { Catalog } from '../../../../types';

/** The `model` deck's questions (ja); its name is in the core chunk. */
export const model: Catalog = {
  'learning.concept.model.q1.prompt': 'ネットワークを層に分ける理由は？',
  'learning.concept.model.q1.a': '各層が1 つの問題を解き、独立に変更できるように',
  'learning.concept.model.q1.b': 'ネットワークをわざと遅くするため',
  'learning.concept.model.q1.c': '物理ケーブルを多く必要とさせるため',
  'learning.concept.model.q1.why':
    '層化により Ethernet・IP・TCP・HTTP がそれぞれ1 つの仕事を担い独立に進化できます — TCP は回線が光か Wi-Fi かを気にしません。',
  'learning.concept.model.q2.prompt': '送信時にスタックを下る順序は…',
  'learning.concept.model.q2.a': 'リンク → インターネット → トランスポート → アプリ',
  'learning.concept.model.q2.b': 'アプリ → トランスポート → インターネット → リンク',
  'learning.concept.model.q2.c': 'ランダム順',
  'learning.concept.model.q2.why':
    '送信側はアプリデータをトランスポート（TCP/UDP）→ IP → リンクフレームの順で包み、受信側は逆順で開きます。',
  'learning.concept.model.q3.prompt': 'カプセル化とは…',
  'learning.concept.model.q3.a': '各層で全パケットを暗号化する',
  'learning.concept.model.q3.b': '送信前に全ヘッダを捨てる',
  'learning.concept.model.q3.c': '各層が上位層を自分のヘッダで包む',
  'learning.concept.model.q3.why':
    '下るにつれ各層がヘッダ（L2 ではトレーラも）を足します。ある層のペイロードは上位層の単位そのものです。',
  'learning.concept.model.q4.prompt': 'ルータが主に動作する層は…',
  'learning.concept.model.q4.a': 'ネットワーク層（L3 / IP）',
  'learning.concept.model.q4.b': 'アプリケーション層（L7）',
  'learning.concept.model.q4.c': '物理層（L1）',
  'learning.concept.model.q4.why':
    'ルータは IP（L3）で、スイッチは MAC（L2）で転送します。両者が協調してパケットを端から端へ運びます。',
  'learning.concept.model.q5.prompt': 'スイッチが主に動作する層は…',
  'learning.concept.model.q5.a': 'トランスポート層（L4）',
  'learning.concept.model.q5.b': 'データリンク層（L2 / MAC）',
  'learning.concept.model.q5.c': 'ネットワーク層（L3）',
  'learning.concept.model.q5.why':
    'スイッチは LAN 内で Ethernet フレームを MAC で転送し、IP ヘッダは見ません。',
  'learning.concept.model.q6.prompt': 'TCP が Web サーバに渡すペイロードは…',
  'learning.concept.model.q6.a': 'カプセル化されたもう 1 つの IP ヘッダ',
  'learning.concept.model.q6.b': '次ホップ宛の MAC アドレス',
  'learning.concept.model.q6.c': 'アプリケーションデータ（例: HTTP リクエスト）',
  'learning.concept.model.q6.why':
    '各層のペイロードは上位層のデータです。TCP はアプリのバイト列をサーバへ運びます。',
  'learning.concept.model.q1.b.why':
    '階層化はそれ自体で遅くするものではありません。仕事を分割し、各層を単純で置き換え可能に保ちます。',
  'learning.concept.model.q1.c.why':
    '階層化は責務の分割であって配線の話ではありません。ケーブルの本数は規定しません。',
  'learning.concept.model.q2.a.why':
    'それは受信時にスタックを上へ展開する順序です。送信ではアプリから始まり下へ向かいます。',
  'learning.concept.model.q2.c.why':
    '順序は固定です。各層が順にヘッダを付け、ランダムにはなりません。',
  'learning.concept.model.q3.a.why':
    'カプセル化は「包む」ことで暗号化ではありません。機密性は別の関心事（TLS・IPsec）です。',
  'learning.concept.model.q3.b.why':
    'カプセル化は各層でヘッダを「付与」します。ヘッダを外すのは上りのデカプセル化のときだけです。',
  'learning.concept.model.q4.b.why':
    'アプリケーション層は端末側の関心事です。ルータはアプリのデータではなく L3 の IP ヘッダで転送します。',
  'learning.concept.model.q4.c.why':
    '物理層はビット/信号を運ぶだけです。ネクストホップの選択には L3 の IP アドレスが必要です。',
  'learning.concept.model.q5.a.why':
    'トランスポート層（L4）はホスト間で端から端をつなぐ関心事です。スイッチは L2 の MAC でフレームを転送します。',
  'learning.concept.model.q5.c.why':
    'IP による転送はルータ（L3）の仕事です。素のスイッチは L2 の MAC で動作します。',
  'learning.concept.model.q6.a.why':
    'IP ヘッダは L3 で、データがアプリに届く前に外されます。TCP はアプリのバイト列を上位へ渡します。',
  'learning.concept.model.q6.b.why':
    'MAC アドレスは L2 フレームヘッダにあり、アプリが受け取るペイロードには含まれません。',
};
