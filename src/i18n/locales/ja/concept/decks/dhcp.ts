import type { Catalog } from '../../../../types';

/** The `dhcp` deck's questions (ja); its name is in the core chunk. */
export const dhcp: Catalog = {
  'learning.concept.dhcp.q1.prompt': 'DHCP の4 ステップ交換は…',
  'learning.concept.dhcp.q1.a': 'SYN, SYN-ACK, ACK, FIN',
  'learning.concept.dhcp.q1.b': 'Discover, Offer, Request, Ack（DORA）',
  'learning.concept.dhcp.q1.c': 'Query, Response, Renew, Release',
  'learning.concept.dhcp.q1.why':
    'クライアントが Discover、サーバが Offer、クライアントが Request、サーバが Ack でリースを確定します。',
  'learning.concept.dhcp.q2.prompt': '最初の DHCP Discover の送り方は…',
  'learning.concept.dhcp.q2.a': 'ブロードキャスト',
  'learning.concept.dhcp.q2.b': 'サーバへのユニキャスト',
  'learning.concept.dhcp.q2.c': 'ルータへのマルチキャスト',
  'learning.concept.dhcp.q2.why':
    'クライアントはまだ IP もサーバも知らないため、Discover はブロードキャストされます。',
  'learning.concept.dhcp.q3.prompt': 'IP アドレス以外に DHCP がよく提供するのは…',
  'learning.concept.dhcp.q3.a': 'インタフェースの MAC アドレス',
  'learning.concept.dhcp.q3.b': '待ち受ける TCP ポート',
  'learning.concept.dhcp.q3.c': 'デフォルトゲートウェイと DNS サーバ',
  'learning.concept.dhcp.q3.why':
    'DHCP オプションはアドレスに加えてゲートウェイ・サブネットマスク・DNS・リース時間を運びます。',
  'learning.concept.dhcp.q1.a.why':
    'SYN/ACK/FIN は TCP のハンドシェイクです。DHCP の 4 ステップは Discover, Offer, Request, Ack です。',
  'learning.concept.dhcp.q1.c.why':
    'それらは DHCP のステップ名ではありません。やり取りは Discover → Offer → Request → Ack（DORA）です。',
  'learning.concept.dhcp.q2.b.why':
    'ユニキャストにはサーバのアドレスが必要ですが、それこそクライアントが探しているものです（自分の送信元 IP もまだありません）。',
  'learning.concept.dhcp.q2.c.why':
    'Discover はルータ宛マルチキャストではなく LAN 上の L2 ブロードキャストです。クライアントはまだアドレスを持ちません。',
  'learning.concept.dhcp.q3.a.why':
    'MAC は NIC に焼かれていて DHCP が配るものではありません。DHCP はゲートウェイと DNS サーバを提供します。',
  'learning.concept.dhcp.q3.b.why':
    'TCP ポートはアプリが選ぶもので DHCP は割り当てません。DHCP はゲートウェイと DNS を提供します。',
};
