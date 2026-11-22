import type { Catalog } from '../../../../types';

/** The `mtu` deck's questions (ja); its name is in the core chunk. */
export const mtu: Catalog = {
  'learning.concept.mtu.q1.prompt': 'MTU とは…',
  'learning.concept.mtu.q1.a': '1 フレームでリンクが運べる最大ペイロード',
  'learning.concept.mtu.q1.b': 'リンクが受け付ける最小パケットサイズ',
  'learning.concept.mtu.q1.c': '経路選択に使うルーティングメトリック',
  'learning.concept.mtu.q1.why':
    '各リンクには最大転送単位があり、それを超えるパケットはフラグメント化されるか拒否されます。',
  'learning.concept.mtu.q2.prompt': 'Path MTU Discovery の仕組みは…',
  'learning.concept.mtu.q2.a': '経路上の全ホストに ping する',
  'learning.concept.mtu.q2.b': 'DF 付きパケットを送り ICMP 応答を読む',
  'learning.concept.mtu.q2.c': 'DNS に Path MTU を尋ねる',
  'learning.concept.mtu.q2.why':
    '送信側は DF を設定し、転送できないルータがネクストホップ MTU 付き ICMP を返すので、送信側はパケットを縮めます。',
  'learning.concept.mtu.q3.prompt': 'DF 付きの過大パケットは…',
  'learning.concept.mtu.q3.a': 'ルータでとにかくフラグメント化される',
  'learning.concept.mtu.q3.b': '相手まで黙って配送される',
  'learning.concept.mtu.q3.c': '破棄され ICMP が返される',
  'learning.concept.mtu.q3.why':
    'DF があるとルータはフラグメント化できず、パケットを破棄して ICMP で問題を通知します。',
  'learning.concept.mtu.q1.b.why':
    '最小ではなく最大です — 1 フレームでリンクが運べる最大のペイロードです。',
  'learning.concept.mtu.q1.c.why':
    'ルーティング指標は経路を順位付けします。MTU はリンクが許す最大フレームペイロードです。',
  'learning.concept.mtu.q2.a.why':
    'PMTUD は全ホストへ ping しません。DF を立てたパケットを送り ICMP「フラグメント必要」を読みます。',
  'learning.concept.mtu.q2.c.why':
    'DNS は名前を解決し経路サイズではありません。PMTUD は DF パケットと ICMP の応答で探ります。',
  'learning.concept.mtu.q3.a.why':
    'フラグメント化してしまえば DF の意味がありません — PMTUD は送信元がボトルネックを知るために、まさにこのビットを立てています。',
  'learning.concept.mtu.q3.b.why':
    '大きすぎるパケットは物理的に細いリンクを通れません。しかも黙ってどころか、送信元は小さく再送できるよう明示的に通知されます。',
};
