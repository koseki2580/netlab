import type { Catalog } from '../../../../types';

/** The `tunneling` deck's questions (ja); its name is in the core chunk. */
export const tunneling: Catalog = {
  'learning.concept.tunneling.q1.b.why':
    '暗号化は別の追加機能（IPsec）です。トンネリング自体はパケットを新しい外側ヘッダで包むだけです。',
  'learning.concept.tunneling.q1.c.why':
    'トンネリングは圧縮しません。本来運べないネットワークを越えられるよう、パケットをカプセル化します。',
  'learning.concept.tunneling.q2.a.why':
    '外側ヘッダは経路の間ずっと必要です。入口で付け、出口でだけ外します。',
  'learning.concept.tunneling.q2.c.why':
    '外側ヘッダを付けるのは送信側（入口）です。受信側（出口）がそれを外します。',
  'learning.concept.tunneling.q3.a.why':
    '速度は無関係です。外側ヘッダがバイトを消費するため、内側ペイロードはフラグメント化前の余地が減ります。',
  'learning.concept.tunneling.q3.b.why':
    '暗号化は任意で原因ではありません。余分な外側ヘッダ自体が MTU からバイトを消費します。',
  'learning.concept.tunneling.q1.prompt': 'トンネリング（カプセル化）の仕組みは…',
  'learning.concept.tunneling.q1.a': '元のパケットを新しい外側ヘッダで包む',
  'learning.concept.tunneling.q1.b': 'すべてのパケットを端から端まで暗号化する',
  'learning.concept.tunneling.q1.c': 'ペイロードを圧縮して帯域を節約する',
  'learning.concept.tunneling.q1.why':
    'トンネルは元パケットの外側にヘッダ（GRE/IP、VXLAN/UDP、MPLS など）を付け、内側のパケットはペイロードとして中継網を通ります。',
  'learning.concept.tunneling.q2.prompt': 'トンネルの両端では…',
  'learning.concept.tunneling.q2.a': '両端ともすぐに外側ヘッダを捨てる',
  'learning.concept.tunneling.q2.b': '入口が外側ヘッダを付け、出口が剥がす',
  'learning.concept.tunneling.q2.c': '受信側だけが外側ヘッダを付ける',
  'learning.concept.tunneling.q2.why':
    'カプセル化はトンネル入口で、デカプセル化は出口で行われ、出口は復元した内側パケットを通常どおりルーティングします。',
  'learning.concept.tunneling.q3.prompt': 'トンネリングで実効 MTU が下がるのはなぜ？',
  'learning.concept.tunneling.q3.a': '経路そのものが遅くなるから',
  'learning.concept.tunneling.q3.b': '内側パケットが必ず暗号化されるから',
  'learning.concept.tunneling.q3.c': '外側ヘッダの分だけバイトを消費するから',
  'learning.concept.tunneling.q3.why':
    '外側ヘッダはオーバーヘッドです。内側＋外側が経路 MTU を超え DF が立つと破棄されるため、MSS クランプやトンネル MTU の引き下げを行います。',
};
