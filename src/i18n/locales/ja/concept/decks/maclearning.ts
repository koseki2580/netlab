import type { Catalog } from '../../../../types';

/** The `maclearning` deck's questions (ja); its name is in the core chunk. */
export const maclearning: Catalog = {
  'learning.concept.maclearning.q1.prompt':
    '電源を入れたばかりで MAC テーブルが空のスイッチがあります。ポート 1 のホスト A が、ポート 2 のホスト B あてにユニキャストのフレームを送りました。どのポートから出ていく？',
  'learning.concept.maclearning.q1.a': 'どこからも出ない（B を学習するまで破棄）',
  'learning.concept.maclearning.q1.b': 'B が未知なので、ポート 2・3・4 へフラッディング',
  'learning.concept.maclearning.q1.c': '宛先アドレスを読んで、ポート 2 からだけ',
  'learning.concept.maclearning.q1.why':
    'B のアドレスのエントリがないので、スイッチは B の場所を知りません。そこで入ってきたポート以外のすべてへフラッディングします。B は受け取り、C と D は捨てます。',
  'learning.concept.maclearning.q1.a.why':
    'スイッチは既定では宛先が未知のフレームを捨てず、フラッディングします。だから最初のフレームも届きます。',
  'learning.concept.maclearning.q1.c.why':
    '宛先アドレスが示すのは誰あてかであって、そのホストがどのポートにいるかではありません。それを教えてくれるのはテーブルだけで、テーブルは空です。',
  'learning.concept.maclearning.q2.prompt':
    'ポート 1 に届いた最初のフレーム A → B から、スイッチは何を学習する？',
  'learning.concept.maclearning.q2.a': 'フレームを送ったポート 2 に B がいること',
  'learning.concept.maclearning.q2.b': 'B が応答するまで何も学習しない',
  'learning.concept.maclearning.q2.c': 'A の MAC アドレスがポート 1 にあること',
  'learning.concept.maclearning.q2.why':
    'スイッチはすべてのフレームの送信元アドレスから学習します。A のアドレスがポート 1 から入ってきたので、A あてのフレームはポート 1 から出すようになります。B が応答すれば、B がポート 2 にいることも学習されます。',
  'learning.concept.maclearning.q2.a.why':
    'フレームはポート 2・3・4 へフラッディングされたので、B がそのどれにいるかスイッチにはわかりません。B を学習できるのは B が送ったフレームからだけです。',
  'learning.concept.maclearning.q2.b.why':
    '学習は応答を待ちません。届いたフレームの送信元アドレスはその場で学習されます。',
  'learning.concept.maclearning.q3.prompt':
    '仮想マシン A がポート 1 のサーバからポート 3 のサーバへ移動しました。ポート 1 のリンクは上がったままで、A は何も送っていません。そこへ B が A あてに送ると？',
  'learning.concept.maclearning.q3.a': 'ポート 1 からだけ出て、A には届かない',
  'learning.concept.maclearning.q3.b': 'スイッチが移動に気づき、ポート 3 から出る',
  'learning.concept.maclearning.q3.c': 'A のエントリが消えたので、フラッディング',
  'learning.concept.maclearning.q3.why':
    'テーブルには数秒前に学習した「A はポート 1」が残っているので、フレームはポート 1 からだけ出ます。エントリを動かせるのはポート 3 からの A のフレームだけです。だからハイパーバイザは VM が移ってきたときにフレームを送ります。',
  'learning.concept.maclearning.q3.b.why':
    'スイッチは受け取ったフレームからしか学習しません。A はポート 3 から何も送っていないので、移動を知るすべがありません。',
  'learning.concept.maclearning.q3.c.why':
    'エントリは数秒前に更新されたばかりで、ポート 1 のリンクも落ちていないので、消える理由がありません。スイッチはそのまま信じます。',
  'learning.concept.maclearning.q4.prompt':
    'エージングタイムは初期値の 300 秒です。A は 400 秒間何も送っておらず、ポート 1 にいるままです。ポート 2 の B が A あてに送ると、どのポートから出ていく？',
  'learning.concept.maclearning.q4.a': 'ポート 1 からだけ（エントリは再起動まで残る）',
  'learning.concept.maclearning.q4.b': 'A のエントリが消えたので、ポート 1・3・4',
  'learning.concept.maclearning.q4.c': '古いエントリのせいで破棄され、どこからも出ない',
  'learning.concept.maclearning.q4.why':
    'エージングタイムのあいだ更新されなかったエントリは消されます。A のエントリがないので、電源を入れた直後と同じくフラッディングされ、A にもちゃんと届きます。',
  'learning.concept.maclearning.q4.a.why':
    '学習したエントリは動的なもので、エージングタイム（初期値 300 秒）のあいだ更新されなければ消えます。だからテーブルはネットワークの変化についていけます。',
  'learning.concept.maclearning.q4.c.why':
    '古いエントリは破棄のために残されるのではなく、消されます。宛先が未知になったフレームはフラッディングされます。',
};
