import type { Catalog } from '../../../../types';

/** The `qinq` deck's questions (ja); its name is in the core chunk. */
export const qinq: Catalog = {
  'learning.concept.qinq.q1.prompt':
    '顧客のフレームは 1500 バイトのペイロードと自社の 802.1Q タグを持ち、ヘッダと FCS を含めて 1522 バイトです。事業者のエッジが 802.1ad の S タグを付けます。事業者のコアでは何バイト？',
  'learning.concept.qinq.q1.a': '1522 バイト（S タグが顧客のタグと入れ替わる）',
  'learning.concept.qinq.q1.b': '1526 バイト（4 バイトのタグが 1 つ増える）',
  'learning.concept.qinq.q1.c': '1540 バイト（新しいヘッダとタグで包む）',
  'learning.concept.qinq.q1.why':
    'S タグは、顧客のタグの前に差し込まれるもう 1 つの 4 バイトのタグ（TPID 0x88A8 と VLAN ID）です。新しいイーサネットヘッダは付かないので、1522 + 4 = 1526 バイトです。',
  'learning.concept.qinq.q1.a.why':
    '顧客の C タグは内側にそのまま残ります。反対側のエッジは S タグだけを外し、顧客には自分のタグが戻ります。',
  'learning.concept.qinq.q1.c.why':
    'それは PBB や VXLAN のような、新しいフレームへのカプセル化です。Q-in-Q は顧客の MAC アドレスを残し、タグを重ねるだけです。',
  'learning.concept.qinq.q2.prompt':
    'ある事業者は、最大 1522 バイトのフレームしか受け付けないコアスイッチで Q-in-Q を運用しています。顧客は自社のタグ付き VLAN で 1500 バイトいっぱいのパケットを送ります。どうなる？',
  'learning.concept.qinq.q2.a': '入る（タグはフレーム長に数えない）',
  'learning.concept.qinq.q2.b': 'エッジスイッチが分割して収める',
  'learning.concept.qinq.q2.c': '入らない（入るペイロードは 1496 バイトまで）',
  'learning.concept.qinq.q2.why':
    'タグ 2 つで 8 バイトを使うので、1522 バイトのフレームに入るペイロードは 1522 − 14 − 4 − 8 = 1496 バイトです。事業者がコアのフレーム長を 1526 以上に上げるか、顧客が MTU を下げる必要があります。',
  'learning.concept.qinq.q2.a.why':
    'タグはフレームの中にあるので、その 1 バイト 1 バイトがスイッチの受け付ける最大フレーム長に数えられます。',
  'learning.concept.qinq.q2.b.why':
    'イーサネットスイッチは分割（フラグメント）しません。リンクに対して大きすぎるフレームはそのまま捨てられます。',
  'learning.concept.qinq.q3.prompt':
    '顧客 A と B はどちらも VLAN 10 を使っています。事業者は A の通信に S-VLAN 100、B の通信に S-VLAN 200 を付けます。A の VLAN 10 に送ったブロードキャストは、反対側のどの拠点に届く？',
  'learning.concept.qinq.q3.a': 'A のもう一方の拠点だけ',
  'learning.concept.qinq.q3.b': 'A と B の両方の拠点',
  'learning.concept.qinq.q3.c': 'どちらにも届かない（VLAN 10 が衝突）',
  'learning.concept.qinq.q3.why':
    '事業者のスイッチは外側の S タグで転送します。S-VLAN 100 に属するのは A のポートだけなので、内側の C-VLAN 10 が B の通信と混ざることはありません。',
  'learning.concept.qinq.q3.b.why':
    'それは事業者が VLAN 10 をそのまま運んだ場合です。顧客ごとに S タグを付ければ、B の VLAN 10 は別の S-VLAN にいます。',
  'learning.concept.qinq.q3.c.why':
    '事業者は顧客の VLAN ID をまったく見ないので、2 社が同じ ID を使っても衝突しません。',
  'learning.concept.qinq.q4.prompt':
    'タグ 1 つで使える VLAN ID は 4094 個です。顧客ごとに S タグを 1 つ割り当て、その中で C-VLAN を自由に使えるとき、1 つの事業者のコアで運べる顧客の VLAN は最大いくつ？',
  'learning.concept.qinq.q4.a': '4094 個（顧客全体で 1 つの ID 空間）',
  'learning.concept.qinq.q4.b': '4094 × 4094、約 1676 万',
  'learning.concept.qinq.q4.c': '4094 + 4094 = 8188 個',
  'learning.concept.qinq.q4.why':
    '4094 個の S-VLAN のそれぞれに 4094 個の C-VLAN が丸ごと入るので、16,760,836 です。ただし顧客の数は S-VLAN 1 つずつで 4094 社までに限られます。',
  'learning.concept.qinq.q4.a.why':
    '顧客は 1 つの ID 空間を分け合うのではありません。各顧客の C-VLAN は自社の S-VLAN の中にあるので、全社が同じ ID を使えます。',
  'learning.concept.qinq.q4.c.why':
    'タグは足し合わさるのではなく入れ子になります。どの S-VLAN も 4094 個の C-VLAN を運ぶので、数はかけ算になります。',
};
