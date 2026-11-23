import type { Catalog } from '../../../../types';

/** The `netconf` deck's questions (ja); its name is in the core chunk. */
export const netconf: Catalog = {
  'learning.concept.netconf.q1.prompt':
    'R2 への NETCONF の変更は、説明の設定、アドレスの追加、MTU 10000 の 3 つです。モデルで許される MTU は 68〜9216 です。candidate への edit-config、validate、commit のあと、R2 の running はどうなっている？',
  'learning.concept.netconf.q1.a': '説明とアドレスは入り、MTU だけ入らない',
  'learning.concept.netconf.q1.b': '3 つとも入り、MTU は 9216 に丸められる',
  'learning.concept.netconf.q1.c': 'どれも入らず、running は元のまま',
  'learning.concept.netconf.q1.why':
    '<validate> が candidate を拒否する（…/ipv4/mtu で invalid-value）ので commit されません。変更は破棄され、running は変わりません。',
  'learning.concept.netconf.q1.a.why':
    'それは 1 行ずつ反映される CLI スクリプトの結果です。candidate では変更全体をまず検証し、検証に失敗すれば何も commit されません。',
  'learning.concept.netconf.q1.b.why':
    'YANG の range は制約であって丸めではありません。範囲外の値は invalid-value で拒否されます。',
  'learning.concept.netconf.q2.prompt':
    '同じ 3 つの変更を、CLI スクリプトで 1 行ずつ R2 に送ります。最後の行は ip mtu 10000 です。R2 には何が残る？',
  'learning.concept.netconf.q2.a': '説明と新しいアドレスが反映され、MTU は 1500 のまま',
  'learning.concept.netconf.q2.b': '何も残らない（ルータが前の行を取り消す）',
  'learning.concept.netconf.q2.c': '説明だけ（アドレスは MTU の行を待つ）',
  'learning.concept.netconf.q2.why':
    '説明とアドレスの行は入力した時点で反映され、スクリプトは ip mtu 10000 で止まりました。R2 は中途半端な設定になり、スクリプトはそれに気づいて直さなければなりません。',
  'learning.concept.netconf.q2.b.why':
    'CLI は各行を入力した瞬間に反映します。行をまとめる仕組みがないので、エラーより前の行を取り消すものもありません。',
  'learning.concept.netconf.q2.c.why':
    '行どうしは待ち合わせません。アドレスの行はルータが受け付けた時点で反映されています。',
  'learning.concept.netconf.q3.prompt':
    'オーケストレータが R1・R2・R3 へ all-or-none で送ります。すべての candidate を検証し、全部が正しいときだけ commit します。範囲外の MTU は R2 だけです。R1 と R3 はどうなる？',
  'learning.concept.netconf.q3.a': 'commit され、R2 だけが元のまま',
  'learning.concept.netconf.q3.b': 'candidate がいっしょに破棄される',
  'learning.concept.netconf.q3.c': 'commit され、R2 の失敗後に元に戻される',
  'learning.concept.netconf.q3.why':
    'R2 の candidate が検証に失敗するので、オーケストレータは 3 台すべての candidate を破棄します。R1 と R3 は中止となり、3 台の設定はそろったままです。',
  'learning.concept.netconf.q3.a.why':
    'それは機器ごとに送る場合です。all-or-none では、すべての candidate が検証に通らない限りどこにも commit しません。',
  'learning.concept.netconf.q3.c.why':
    'commit してから取り消すのではありません。commit の前にすべての candidate を検証するので、R1 と R3 は一度も変わりません。',
  'learning.concept.netconf.q4.prompt':
    '<commit><confirmed/> で送った変更が、スクリプトが R2 に届くためのインタフェース eth0 を止めます。どうなる？',
  'learning.concept.netconf.q4.a': 'コンソールから直すまで eth0 は止まったまま',
  'learning.concept.netconf.q4.b': 'セッションが切れるので R2 は commit を拒否する',
  'learning.concept.netconf.q4.c': 'タイムアウト後に R2 が自分で元の設定に戻す',
  'learning.concept.netconf.q4.why':
    'eth0 が止まった瞬間にスクリプトは R2 に届かなくなるので、確定の <commit> は来ません。confirm-timeout（初期値 600 秒）が切れると R2 は自分で元に戻し、eth0 は再び up になります。',
  'learning.concept.netconf.q4.a.why':
    'それは普通の commit です。confirmed commit は、期限内に確定の <commit> が来なければ取り消されます。ここでは確定は届きません。',
  'learning.concept.netconf.q4.b.why':
    '変更はモデルのうえでは正しいので commit されます。どのインタフェースがセッションを運んでいるかを、ルータが判断するわけではありません。',
};
