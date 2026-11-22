import type { Catalog } from '../../../../types';

/** The `multicast` deck's questions (ja); its name is in the core chunk. */
export const multicast: Catalog = {
  'learning.concept.multicast.q1.prompt': 'マルチキャストの配送は…',
  'learning.concept.multicast.q1.a': '1 つの送信元から関心のある受信者へ',
  'learning.concept.multicast.q1.b': 'インターネット上の全ホストへ',
  'learning.concept.multicast.q1.c': 'ちょうど 2 ホストの間だけ',
  'learning.concept.multicast.q1.why':
    'コピーは 1 つだけ送られ、ネットワークがマルチキャストグループのメンバへのみ複製します — 効率的な一対多です。',
  'learning.concept.multicast.q2.prompt': 'ホストがマルチキャストグループに参加する手段は…',
  'learning.concept.multicast.q2.a': 'ARP',
  'learning.concept.multicast.q2.b': 'IGMP',
  'learning.concept.multicast.q2.c': 'BGP',
  'learning.concept.multicast.q2.why':
    'IGMP はホストが欲しいマルチキャストグループをローカルルータに伝え、必要な所だけ転送させます。',
  'learning.concept.multicast.q3.prompt': 'マルチキャスト宛先アドレスが指すのは…',
  'learning.concept.multicast.q3.a': '特定の 1 台のホストだけを指す',
  'learning.concept.multicast.q3.b': 'スイッチ上の物理ポートを指す',
  'learning.concept.multicast.q3.c': 'グループ（IPv4 の 224.0.0.0/4）',
  'learning.concept.multicast.q3.why':
    'マルチキャストは専用のグループアドレス範囲を使い、受信者は個別指定でなく購読します。',
  'learning.concept.multicast.q1.b.why':
    '全員へ送るのはブロードキャストです（しかもインターネットを越えられません）。マルチキャストは関心のある受信者だけを狙います。',
  'learning.concept.multicast.q1.c.why':
    '2 ホスト間はユニキャストです。マルチキャストは参加したグループへ 1 つのストリームを送ります。',
  'learning.concept.multicast.q2.a.why':
    'ARP は IP→MAC を解決します。ホストは IGMP でマルチキャストグループへの参加を通知します。',
  'learning.concept.multicast.q2.c.why':
    'BGP は AS 間をルーティングします。LAN でマルチキャストグループに参加するには IGMP を使います。',
  'learning.concept.multicast.q3.a.why':
    '単一ホストはユニキャストアドレスです。マルチキャストアドレス（224.0.0.0/4）は受信者のグループを指します。',
  'learning.concept.multicast.q3.b.why':
    '物理ポートはハードウェアです。マルチキャスト宛先は 224.0.0.0/4 のような論理的なグループアドレスです。',
};
