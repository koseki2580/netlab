import type { Catalog } from '../../../../types';

/** The `telemetry` deck's questions (ja); its name is in the core chunk. */
export const telemetry: Catalog = {
  'learning.concept.telemetry.q1.prompt':
    '1 Gbit/s のリンクが 15 % で安定して流れており、そこへ 20 秒間のバーストで 100 % に張り付きました。5 分間隔の SNMP グラフのピークはいくつになりますか？',
  'learning.concept.telemetry.q1.a': '約 100 %',
  'learning.concept.telemetry.q1.b': '約 20 %',
  'learning.concept.telemetry.q1.c': '15 %（いつもと同じ）',
  'learning.concept.telemetry.q1.why':
    '利用率は、2 回の読み取りの間に数えたバイト数を、その時間に回線が運べた量で割ったものです。300 秒で割ると、バーストは数ポイントしか押し上げず約 20.7 % になります。',
  'learning.concept.telemetry.q1.a.why':
    '各点は 5 分間のカウンタ差分なので、100 % の 20 秒は 15 % の 280 秒と平均されます。',
  'learning.concept.telemetry.q1.c.why':
    'バースト分のバイトも数えられており、5 分平均を少しだけ押し上げて約 20 % になります。',
  'learning.concept.telemetry.q2.prompt':
    '10 秒ごとの gNMI SAMPLE ストリームでは、同じバーストが 100 % と表示されるのはなぜですか？',
  'learning.concept.telemetry.q2.a': 'SNMP より精度の高いカウンタを読んでいるから',
  'learning.concept.telemetry.q2.b': 'プッシュはポーリングが取りこぼすバイトも届けるから',
  'learning.concept.telemetry.q2.c': '10 秒の区間がバーストの中にすっぽり収まるから',
  'learning.concept.telemetry.q2.why':
    '10 秒ごとに読むと、20 秒のバーストの中に完全に収まる区間ができ、その区間のカウンタ差分は回線速度いっぱいになります。',
  'learning.concept.telemetry.q2.a.why':
    'どちらも同じ in-octets カウンタを読んでいます。違うのは 2 回の読み取りの間隔だけです。',
  'learning.concept.telemetry.q2.b.why':
    'ポーリングでもバイトは取りこぼしません。カウンタは数え続けており、間隔が長いと長い時間で平均されるだけです。',
  'learning.concept.telemetry.q3.prompt':
    '6:40 にリンクが 30 秒間ダウンしました。SNMP ポーラーは 5:00 と 10:00 に状態を読みます。何が記録されますか？',
  'learning.concept.telemetry.q3.a': '2 回ともアップ。障害はポーリングの間に収まった',
  'learning.concept.telemetry.q3.b': '直後のポーリングである 10:00 にダウン',
  'learning.concept.telemetry.q3.c': 'カウンタが止まっていたのでダウン',
  'learning.concept.telemetry.q3.why':
    'ポーリングは問い合わせた瞬間の状態しか見ないため、5 分おきのポーリングの間に起きた 30 秒の障害は痕跡を残しません（別途 SNMP トラップでなら通知できます）。',
  'learning.concept.telemetry.q3.b.why':
    'ポーリングが返すのはその瞬間の状態です。10:00 にはリンクはとっくに復旧しています。',
  'learning.concept.telemetry.q3.c.why':
    '状態はカウンタとは別に読まれ、どちらのポーリングでもアップです。止まったカウンタは平均を少し下げるだけです。',
  'learning.concept.telemetry.q4.prompt':
    '同じ状態を gNMI の ON_CHANGE サブスクリプションで監視します。この障害について何が送られますか？',
  'learning.concept.telemetry.q4.a': 'ダウン中は 10 秒ごとに更新が届く',
  'learning.concept.telemetry.q4.b': 'ダウン時と復旧時に 1 回ずつ、計 2 回',
  'learning.concept.telemetry.q4.c': '何も届かない。購読できるのはカウンタだけ',
  'learning.concept.telemetry.q4.why':
    'ON_CHANGE は値が変わるたびに 1 回だけプッシュします。6:40 に DOWN、7:10 に UP が、それぞれ起きたその秒に届きます。',
  'learning.concept.telemetry.q4.a.why':
    '一定間隔の更新は SAMPLE モードです。ON_CHANGE は値が変わったときにしか送りません。',
  'learning.concept.telemetry.q4.c.why':
    'gNMI は oper-status を含む任意のパスを購読でき、ON_CHANGE はまさにこうした状態のためのモードです。',
};
