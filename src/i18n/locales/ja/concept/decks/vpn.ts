import type { Catalog } from '../../../../types';

/** The `vpn` deck's questions (ja); its name is in the core chunk. */
export const vpn: Catalog = {
  'learning.concept.vpn.q1.b.why':
    'VPN は通常わずかなオーバーヘッドを足すもので高速化ではありません。目的は信頼できないネットワーク上の安全な暗号化トンネルです。',
  'learning.concept.vpn.q1.c.why':
    '公開 IP の割り当ては VPN の役割ではありません。通信を秘匿する暗号化・認証済みトンネルを作ります。',
  'learning.concept.vpn.q2.a.why':
    'どちらも暗号化します。本質的な違いは、サイト間はゲートウェイ経由でネットワーク全体を結び、リモートアクセスは 1 台のクライアントをつなぐ点です。',
  'learning.concept.vpn.q2.c.why':
    'リモートアクセスは Ethernet に限らず任意の IP 経路（多くはインターネット）で動きます。違いはネットワーク全体か単一クライアントかです。',
  'learning.concept.vpn.q3.a.why':
    'スプリットトンネルは通信を遮断しません。選んだ宛先だけ VPN を通し、残りは直接送ります。',
  'learning.concept.vpn.q3.b.why':
    '二重暗号化ではありません。スプリットトンネルは一部の通信だけ VPN を通し、残りはそのまま外へ出します。',
  'learning.concept.vpn.q1.prompt': 'VPN の主な目的は…',
  'learning.concept.vpn.q1.a': '信頼できない網越しに暗号化トンネルを作る',
  'learning.concept.vpn.q1.b': 'インターネット回線を高速化する',
  'learning.concept.vpn.q1.c': 'ホストに公開 IP を割り当てる',
  'learning.concept.vpn.q1.why':
    'VPN は通信をカプセル化して暗号化し、公衆網をあたかも専用線のように越えられるようにします。',
  'learning.concept.vpn.q2.prompt': 'サイト間 VPN とリモートアクセス VPN の違いは…',
  'learning.concept.vpn.q2.a': 'サイト間は暗号化がまったく不要',
  'learning.concept.vpn.q2.b': 'サイト間は網同士、リモートアクセスは端末 1 台を接続する',
  'learning.concept.vpn.q2.c': 'リモートアクセスは Ethernet 上でしか動かない',
  'learning.concept.vpn.q2.why':
    'サイト間はゲートウェイが 2 つのサブネット間をトンネルし、リモートアクセス（クライアント VPN）は 1 ユーザ端末を社内網に参加させます。',
  'learning.concept.vpn.q3.prompt': 'スプリットトンネルとは…',
  'learning.concept.vpn.q3.a': 'VPN が確立するまで全通信が遮断される',
  'learning.concept.vpn.q3.b': 'VPN がすべてを二重に暗号化する',
  'learning.concept.vpn.q3.c': '一部の通信だけ VPN を通す',
  'learning.concept.vpn.q3.why':
    'スプリットトンネルは選んだ宛先だけ VPN 経由にします。負荷は減りますが、フルトンネルより露出が広がります。',
};
