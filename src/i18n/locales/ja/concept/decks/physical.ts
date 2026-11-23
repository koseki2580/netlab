import type { Catalog } from '../../../../types';

/** The `physical` deck's questions (ja); its name is in the core chunk. */
export const physical: Catalog = {
  'learning.concept.physical.q1.prompt':
    'スイッチのポートを 100 Mbit/s 全二重に固定し、向かいの PC はオートのままです。どちらも 10 と 100 に対応しています。PC はどうなる？',
  'learning.concept.physical.q1.a': '100 全二重。オートネゴがスイッチの設定を写す',
  'learning.concept.physical.q1.b': 'リンクなし。固定とオートは折り合わない',
  'learning.concept.physical.q1.c': '100 半二重。スイッチとデュプレックス不一致',
  'learning.concept.physical.q1.why':
    '固定のポートはネゴシエーションのパルスを送りません。PC はパラレル検出で速度はわかりますが、デュプレックスは知る手段がないので半二重とみなします。リンクは上がりますが不一致です。',
  'learning.concept.physical.q2.prompt':
    'その不一致のリンクに負荷をかけると、全二重側のカウンタで増えるエラーは？',
  'learning.concept.physical.q2.a': '受信フレームのラントと FCS エラー',
  'learning.concept.physical.q2.b': '送信フレームのレイトコリジョン',
  'learning.concept.physical.q2.c': 'なし。エラーを数えるのは半二重側だけ',
  'learning.concept.physical.q2.why':
    '半二重側は相手の送信を衝突と思い込み、自分のフレームを途中でやめます。全二重側はそのフレームを、短く切れたもの（ラント）か、チェックサムの合わないもの（FCS エラー）として受け取ります。',
  'learning.concept.physical.q3.prompt':
    '370 W の PoE スイッチが、電話 12 台（クラス 2）、カメラ 4 台（クラス 3）、AP 8 台（クラス 4）にクラスで電力を割り当てます。最後の AP だけ給電されません。なぜ？',
  'learning.concept.physical.q3.a': '動いている機器がすでに 370 W 以上使っている',
  'learning.concept.physical.q3.b': 'ポートごとにクラスの最大値を確保し、それで埋まる',
  'learning.concept.physical.q3.c': 'クラス 4 には 802.3bt が必要で、スイッチが非対応',
  'learning.concept.physical.q3.why':
    '12 × 7.0 + 4 × 15.4 + 7 × 30 = 355.6 W が確保済みで、30 W の AP をもう 1 台足すと 370 W 中 385.6 W 必要です。実際の消費は約 214 W にすぎません。LLDP で電力をネゴシエーションすれば 24 台すべて収まります。',
  'learning.concept.physical.q4.prompt':
    'core-1 は access-1 と access-2 にケーブルでつながり、AP は access-2 につながっています。core-1 の LLDP ネイバーテーブルに載るのは…',
  'learning.concept.physical.q4.a': '3 台すべて。AP は access-2 経由でわかる',
  'learning.concept.physical.q4.b': '誰も載らない。CDP も動かす必要がある',
  'learning.concept.physical.q4.c': 'access-1 と access-2。AP は載らない',
  'learning.concept.physical.q4.why':
    'LLDP フレームはブリッジが転送しないマルチキャストアドレス宛てなので、各機器がわかるのは自分のケーブルの向こう側だけです。',
  'learning.concept.physical.q1.a.why':
    '写す元がありません。固定のポートはネゴシエーションのパルスを送らないので、オート側は速度はわかってもデュプレックスは半二重に戻すしかありません。',
  'learning.concept.physical.q1.b.why':
    'パラレル検出で速度はわかるので、リンクは上がります。リンクが上がらないのは、異なる速度に固定したポート同士だけです。',
  'learning.concept.physical.q2.b.why':
    'レイトコリジョンを数えるのは衝突を監視している半二重側です。全二重側は衝突を検出しません。',
  'learning.concept.physical.q2.c.why':
    '半二重側が途中でやめたフレームは、壊れた状態で全二重側に届きます。両側とも、種類の違うエラーを数えます。',
  'learning.concept.physical.q3.a.why':
    '動いている機器の消費は約 214 W だけです。予算を使い切るのは実際の消費ではなく、確保した分です。',
  'learning.concept.physical.q3.c.why':
    'クラス 4 は 802.3at（ポートで 30 W）で、802.3bt はクラス 5〜8 です。AP が断られるのは予算を使い切ったからです。',
  'learning.concept.physical.q4.a.why':
    'LLDP は中継されません。access-2 は AP から聞いた内容を先へ渡さないので、core-1 は AP を知りません。',
  'learning.concept.physical.q4.b.why':
    'LLDP はベンダー中立の標準（802.1AB）で、それだけで動きます。CDP は Cisco 独自の別のプロトコルです。',
};
