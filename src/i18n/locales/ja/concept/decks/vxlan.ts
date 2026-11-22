import type { Catalog } from '../../../../types';

/** The `vxlan` deck's questions (ja); its name is in the core chunk. */
export const vxlan: Catalog = {
  'learning.concept.vxlan.q1.prompt': 'VXLAN が運ぶのは…',
  'learning.concept.vxlan.q1.a': 'UDP/IP の中の L2 フレーム（L3 上の L2）',
  'learning.concept.vxlan.q1.b': 'IPv6 パケットのみ（IPv4 は不可）',
  'learning.concept.vxlan.q1.c': 'ピア間のルーティングテーブル',
  'learning.concept.vxlan.q1.why':
    'VXLAN はイーサネットフレームを UDP でトンネルし、ルーテッド（L3）なデータセンタファブリック上に L2 を延伸します。',
  'learning.concept.vxlan.q2.prompt': 'VXLAN セグメントを識別するのは…',
  'learning.concept.vxlan.q2.a': 'VLAN ID（12 ビット）',
  'learning.concept.vxlan.q2.b': 'VNI（24 ビットの識別子）',
  'learning.concept.vxlan.q2.c': '宛先 MAC アドレス',
  'learning.concept.vxlan.q2.why':
    '24 ビットの VNI は約 1600 万セグメントを可能にし、802.1Q VLAN の 4094 をはるかに超えます。',
  'learning.concept.vxlan.q3.prompt': 'EVPN が VXLAN とよく併用されるのは…',
  'learning.concept.vxlan.q3.a': 'トンネル両端の間でフレームを暗号化するため',
  'learning.concept.vxlan.q3.b': 'テナントに IP を割り当てるため',
  'learning.concept.vxlan.q3.c': 'MAC/IP 到達性を BGP で配布するため',
  'learning.concept.vxlan.q3.why':
    'EVPN（BGP のアドレスファミリ）はどの MAC/IP がどのトンネル端点の背後にあるかを広告し、フラッド&ラーンを置き換えます。',
  'learning.concept.vxlan.q1.b.why':
    'VXLAN は IPv6 専用ではありません。内側のプロトコルに関係なく L2 フレームを UDP/IP（L2 over L3）にトンネルします。',
  'learning.concept.vxlan.q1.c.why':
    'VXLAN はルーティングテーブルを運びません。L2 フレームを UDP/IP にカプセル化し、セグメントを L3 上に延ばします。',
  'learning.concept.vxlan.q2.a.why':
    '12 ビットの VLAN ID は約 4094 が上限です。VXLAN は 24 ビットの VNI で約 1600 万セグメントを扱います。',
  'learning.concept.vxlan.q2.c.why':
    'MAC はセグメントではなくホストを識別します。VXLAN のセグメントは 24 ビットの VNI で識別します。',
  'learning.concept.vxlan.q3.a.why':
    'EVPN は暗号化ではなくコントロールプレーンです。MAC/IP 到達性を BGP で配布します。',
  'learning.concept.vxlan.q3.b.why':
    'アドレス割り当ては DHCP です。EVPN は VXLAN に BGP コントロールプレーンを与え MAC/IP 到達性を広告します。',
};
