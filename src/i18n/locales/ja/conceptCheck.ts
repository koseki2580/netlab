import type { Catalog } from '../../types';

export const conceptCheck: Catalog = {
  'learning.concept.title': 'プロトコル・コンセプトチェック',
  'learning.concept.primer.title': '遊び方',
  'learning.concept.primer.body':
    'プロトコルを選び、いくつかの問いに答えて理解度を確認します。各回答には一行の解説が付き、セッション終了時にスコアが出ます。デッキは L2 からセキュリティまでスタックを横断します。',
  'learning.concept.pickDeck': 'ドリルするプロトコルを選択',
  'learning.concept.search': 'プロトコルを絞り込み（例: BGP、TLS）',
  'learning.concept.searchEmpty': '「{{query}}」に一致するプロトコルがありません。',
  'learning.concept.streak': '{{count}}問連続正解',
  'learning.concept.backToDecks': '← すべてのプロトコル',
  'learning.concept.deckProgress': '問題 {{current}} / {{total}}',
  'learning.concept.layer.l2': 'レイヤー2 — リンク',
  'learning.concept.layer.l3': 'レイヤー3 — ネットワーク',
  'learning.concept.layer.l4': 'レイヤー4 — トランスポート',
  'learning.concept.layer.l5': 'セキュリティ',
  'learning.concept.layer.l7': 'レイヤー7 — アプリケーション',
  'learning.concept.layer.routing': 'ルーティング',
  'learning.concept.arp.name': 'ARP',
  'learning.concept.arp.q1.prompt': 'ARP は何を解決する？',
  'learning.concept.arp.q1.a': 'IPv4 アドレスを MAC アドレスに',
  'learning.concept.arp.q1.b': 'ホスト名を IP アドレスに',
  'learning.concept.arp.q1.c': 'MAC アドレスをスイッチポートに',
  'learning.concept.arp.q1.why':
    'ARP は既知の IPv4 アドレスを、LAN 上でフレーム化するのに必要なリンク層の MAC に対応づけます。',
  'learning.concept.arp.q2.prompt': 'ARP リクエストの宛先 MAC は？',
  'learning.concept.arp.q2.a': 'ターゲットホストの MAC',
  'learning.concept.arp.q2.b': 'ブロードキャスト ff:ff:ff:ff:ff:ff',
  'learning.concept.arp.q2.c': 'デフォルトゲートウェイの MAC',
  'learning.concept.arp.q2.why':
    'まだターゲットの MAC を知らないため、リクエストはセグメント全体にブロードキャストされます。',
  'learning.concept.arp.q3.prompt': 'ARP が働く範囲は…',
  'learning.concept.arp.q3.a': 'インターネット全体',
  'learning.concept.arp.q3.b': 'ルータ間のみ',
  'learning.concept.arp.q3.c': '単一のブロードキャストドメイン（LAN）',
  'learning.concept.arp.q3.why':
    'ARP はリンクローカルです。遠隔ネットワークへはリモートホストではなくゲートウェイを ARP します。',
  'learning.concept.stp.name': 'STP',
  'learning.concept.stp.q1.prompt': 'スパニングツリーが防ぐ問題は？',
  'learning.concept.stp.q1.a': 'IP アドレス枯渇',
  'learning.concept.stp.q1.b': 'L2 の転送ループ',
  'learning.concept.stp.q1.c': 'ルーティングループ',
  'learning.concept.stp.q1.why':
    '冗長なスイッチ間リンクはブロードキャストを永久に巡回させます。STP はポートをブロックしてループのない木を作ります。',
  'learning.concept.stp.q2.prompt': '木の基準点に選ばれるスイッチは…',
  'learning.concept.stp.q2.a': 'ルートブリッジ',
  'learning.concept.stp.q2.b': '代表ルータ',
  'learning.concept.stp.q2.c': 'デフォルトゲートウェイ',
  'learning.concept.stp.q2.why':
    '優先度/MAC が最小のブリッジがルートになり、すべての経路コストはそこへ向けて測られます。',
  'learning.concept.stp.q3.prompt': 'ブロックされた STP ポートは…',
  'learning.concept.stp.q3.a': '物理的に切断されている',
  'learning.concept.stp.q3.b': 'データを転送するが BPDU を無視する',
  'learning.concept.stp.q3.c': 'BPDU だけを処理しデータフレームは転送しない',
  'learning.concept.stp.q3.why':
    'ブロックポートも BPDU を聞き続けるため、トポロジ変化時に STP が再有効化できます。',
  'learning.concept.vlan.name': 'VLAN',
  'learning.concept.vlan.q1.prompt': 'VLAN が作るのは…',
  'learning.concept.vlan.q1.a': '共有スイッチ上の独立したブロードキャストドメイン',
  'learning.concept.vlan.q1.b': '新しい物理ケーブル',
  'learning.concept.vlan.q1.c': 'ルーティングテーブル',
  'learning.concept.vlan.q1.why':
    '各 VLAN は独立した L2 ブロードキャストドメインで、別 VLAN のホスト同士はルータが必要です。',
  'learning.concept.vlan.q2.prompt': 'トランクポートが運ぶのは…',
  'learning.concept.vlan.q2.a': '単一の VLAN のみ',
  'learning.concept.vlan.q2.b': '802.1Q タグ付きの複数 VLAN',
  'learning.concept.vlan.q2.c': 'タグなしトラフィックのみ',
  'learning.concept.vlan.q2.why':
    'トランクはフレームに VLAN ID を付与し、複数 VLAN がスイッチ間の1 リンクを共有します。',
  'learning.concept.vlan.q3.prompt': '2 つの VLAN 間でトラフィックを通すには…',
  'learning.concept.vlan.q3.a': 'より長いケーブル',
  'learning.concept.vlan.q3.b': '2 台目のルートブリッジ',
  'learning.concept.vlan.q3.c': 'ルータまたは L3 スイッチ',
  'learning.concept.vlan.q3.why':
    'VLAN は別々の L3 サブネットなので、VLAN 間トラフィックはルーティングが必要です。',
  'learning.concept.tcp.name': 'TCP',
  'learning.concept.tcp.q1.prompt': 'TCP 3ウェイハンドシェイクの順序は…',
  'learning.concept.tcp.q1.a': 'SYN, SYN-ACK, ACK',
  'learning.concept.tcp.q1.b': 'ACK, SYN, FIN',
  'learning.concept.tcp.q1.c': 'SYN, ACK, SYN',
  'learning.concept.tcp.q1.why':
    'クライアントが SYN、サーバが SYN-ACK、クライアントが ACK — これで接続確立です。',
  'learning.concept.tcp.q2.prompt': 'TCP が保証するのは…',
  'learning.concept.tcp.q2.a': '可能な限り低い遅延',
  'learning.concept.tcp.q2.b': '信頼性のある順序通りの配送',
  'learning.concept.tcp.q2.c': 'ペイロードの暗号化',
  'learning.concept.tcp.q2.why':
    'シーケンス番号・確認応答・再送が順序通りの信頼配送を実現します。暗号化は TLS の役割です。',
  'learning.concept.tcp.q3.prompt': 'TCP 接続を正常に閉じるのは？',
  'learning.concept.tcp.q3.a': 'RST セグメント',
  'learning.concept.tcp.q3.b': '2度目の SYN',
  'learning.concept.tcp.q3.c': 'FIN の交換',
  'learning.concept.tcp.q3.why':
    '双方が FIN を送り相手の FIN を ACK します。RST は突然の中断で正常終了ではありません。',
  'learning.concept.udp.name': 'UDP',
  'learning.concept.udp.q1.prompt': 'TCP と比べて UDP は…',
  'learning.concept.udp.q1.a': '再送を加える',
  'learning.concept.udp.q1.b': '順序を保証する',
  'learning.concept.udp.q1.c': 'ハンドシェイクも配送保証もない',
  'learning.concept.udp.q1.why':
    'UDP はコネクションレスの投げっぱなし — 低オーバーヘッドで信頼性なしです。',
  'learning.concept.udp.q2.prompt': 'UDP が向くのは…',
  'learning.concept.udp.q2.a': '大きなファイルのダウンロード',
  'learning.concept.udp.q2.b': 'リアルタイム音声/映像や DNS',
  'learning.concept.udp.q2.c': '銀行取引',
  'learning.concept.udp.q2.why':
    '遅延に敏感な、または単純な要求/応答は、TCP の信頼性コストより UDP の低オーバーヘッドを好みます。',
  'learning.concept.udp.q3.prompt': 'UDP ヘッダに含まれるのは…',
  'learning.concept.udp.q3.a': '送信元/宛先ポート・長さ・チェックサム',
  'learning.concept.udp.q3.b': 'シーケンス番号と確認応答番号',
  'learning.concept.udp.q3.c': '輻輳ウィンドウ',
  'learning.concept.udp.q3.why':
    'UDP は最小限 — ポート・長さ・任意のチェックサムのみで、接続状態を持ちません。',
  'learning.concept.nat.name': 'NAT',
  'learning.concept.nat.q1.prompt': 'NAT が主に可能にするのは…',
  'learning.concept.nat.q1.a': '多数のプライベートホストが1 つの公開 IP を共有',
  'learning.concept.nat.q1.b': 'スイッチが MAC を学習',
  'learning.concept.nat.q1.c': 'ルータが OSPF を実行',
  'learning.concept.nat.q1.why':
    'ソース NAT/PAT はプライベートアドレスを公開アドレスに（ポートを追跡して）書き換え、LAN 全体が公開 IP を共有します。',
  'learning.concept.nat.q2.prompt': '外部から内部サーバへ届かせるには…',
  'learning.concept.nat.q2.a': 'デフォルトルート',
  'learning.concept.nat.q2.b': 'ポートフォワーディング（DNAT）',
  'learning.concept.nat.q2.c': 'VLAN トランク',
  'learning.concept.nat.q2.why':
    'DNAT は 公開 ip:port を内部 host:port に対応づけ、外部クライアントが到達できるようにします。',
  'learning.concept.nat.q3.prompt': 'NAT が変換テーブルを保持するのは…',
  'learning.concept.nat.q3.a': 'トラフィックを暗号化するため',
  'learning.concept.nat.q3.b': 'ルートブリッジを選出するため',
  'learning.concept.nat.q3.c': '応答を正しい内部ホストに戻すため',
  'learning.concept.nat.q3.why':
    'テーブルは inside-local↔inside-global の対応を記憶し、戻りパケットを正しく逆変換します。',
  'learning.concept.dns.name': 'DNS',
  'learning.concept.dns.q1.prompt': 'DNS が変換するのは…',
  'learning.concept.dns.q1.a': 'ホスト名を IP アドレスに',
  'learning.concept.dns.q1.b': 'IP アドレスを MAC アドレスに',
  'learning.concept.dns.q1.c': 'ポートをサービス名に',
  'learning.concept.dns.q1.why':
    'DNS は example.com のような人間向けの名前を、接続に必要な IP アドレスへ解決します。',
  'learning.concept.dns.q2.prompt': '名前を IPv4 アドレスに対応づけるレコードは？',
  'learning.concept.dns.q2.a': 'MX',
  'learning.concept.dns.q2.b': 'A',
  'learning.concept.dns.q2.c': 'CNAME',
  'learning.concept.dns.q2.why':
    'A レコードは IPv4 アドレスを保持します。AAAA は IPv6、MX はメール、CNAME は別名です。',
  'learning.concept.dns.q3.prompt': '再帰リゾルバは…',
  'learning.concept.dns.q3.a': '自分のゾーンからのみ回答する',
  'learning.concept.dns.q3.b': 'MAC アドレスだけをキャッシュする',
  'learning.concept.dns.q3.c': '答えを得るまで代わりに他サーバへ問い合わせる',
  'learning.concept.dns.q3.why':
    '再帰リゾルバは DNS 階層（ルート→TLD→権威）をたどり、最終的な答えを返します。',
  'learning.concept.tls.name': 'TLS',
  'learning.concept.tls.q1.prompt': 'TLS が提供するのは…',
  'learning.concept.tls.q1.a': 'ネットワーク間のルーティング',
  'learning.concept.tls.q1.b': '暗号化・完全性・サーバ認証',
  'learning.concept.tls.q1.c': 'IP アドレスの割り当て',
  'learning.concept.tls.q1.why':
    'TLS はトランスポート接続を保護します — データを暗号化し、改ざんを検知し、証明書でサーバを認証します。',
  'learning.concept.tls.q2.prompt': 'ハンドシェイク中、サーバが身元を証明するのは…',
  'learning.concept.tls.q2.a': 'MAC アドレス',
  'learning.concept.tls.q2.b': 'VLAN タグ',
  'learning.concept.tls.q2.c': 'X.509 証明書',
  'learning.concept.tls.q2.why':
    'クライアントが信頼する CA が署名した証明書が、サーバ名とその公開鍵を結びつけます。',
  'learning.concept.tls.q3.prompt': 'TLS が動作するのは…',
  'learning.concept.tls.q3.a': 'TCP のような信頼トランスポートの上',
  'learning.concept.tls.q3.b': 'IP の下',
  'learning.concept.tls.q3.c': 'イーサネットの代わり',
  'learning.concept.tls.q3.why':
    'TLS は順序通りで信頼できるバイトストリームを前提とするため TCP の上に乗ります（QUIC は独自に提供）。',
  'learning.concept.ethernet.name': 'イーサネット',
  'learning.concept.ethernet.q1.prompt': 'イーサネットフレームの宛先指定は…',
  'learning.concept.ethernet.q1.a': 'MAC アドレス',
  'learning.concept.ethernet.q1.b': 'IP アドレス',
  'learning.concept.ethernet.q1.c': 'ポート番号',
  'learning.concept.ethernet.q1.why':
    'L2 フレームは LAN セグメント内で 48 ビットの MAC アドレスにより配送されます。',
  'learning.concept.ethernet.q2.prompt': 'スイッチが MAC テーブルを作る方法は…',
  'learning.concept.ethernet.q2.a': 'IP ヘッダを読む',
  'learning.concept.ethernet.q2.b': '受信フレームの送信元 MAC を学習する',
  'learning.concept.ethernet.q2.c': 'OSPF を動かす',
  'learning.concept.ethernet.q2.why':
    'スイッチは各送信元 MAC がどのポートから来たかを記録し、宛先 MAC で転送します。',
  'learning.concept.ethernet.q3.prompt': '宛先 MAC が未知のフレームは…',
  'learning.concept.ethernet.q3.a': '破棄される',
  'learning.concept.ethernet.q3.b': 'ゲートウェイへルーティングされる',
  'learning.concept.ethernet.q3.c': '他の全ポートへフラッディングされる',
  'learning.concept.ethernet.q3.why':
    '宛先不明ユニキャストはフラッディングされ、宛先が応答して学習されます。',
  'learning.concept.dhcp.name': 'DHCP',
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
  'learning.concept.dhcp.q3.a': 'MAC アドレス',
  'learning.concept.dhcp.q3.b': 'TCP ポート',
  'learning.concept.dhcp.q3.c': 'デフォルトゲートウェイと DNS サーバ',
  'learning.concept.dhcp.q3.why':
    'DHCP オプションはアドレスに加えてゲートウェイ・サブネットマスク・DNS・リース時間を運びます。',
  'learning.concept.icmp.name': 'ICMP',
  'learning.concept.icmp.q1.prompt': 'ping が使うプロトコルは？',
  'learning.concept.icmp.q1.a': 'ICMP Echo Request/Reply',
  'learning.concept.icmp.q1.b': 'TCP',
  'learning.concept.icmp.q1.c': 'UDP',
  'learning.concept.icmp.q1.why':
    'ping は ICMP Echo Request を送り、Echo Reply の往復時間を測ります。',
  'learning.concept.icmp.q2.prompt': 'TTL が 0 になったパケットが引き起こすのは…',
  'learning.concept.icmp.q2.a': 'ARP リクエスト',
  'learning.concept.icmp.q2.b': 'ICMP Time Exceeded',
  'learning.concept.icmp.q2.c': 'TCP RST',
  'learning.concept.icmp.q2.why':
    'TTL を 0 にしたルータはパケットを破棄し ICMP Time Exceeded を返します — traceroute の原理です。',
  'learning.concept.icmp.q3.prompt': 'ICMP が主に運ぶのは…',
  'learning.concept.icmp.q3.a': 'アプリケーションデータ',
  'learning.concept.icmp.q3.b': 'ルーティングテーブル',
  'learning.concept.icmp.q3.c': 'エラーと診断メッセージ',
  'learning.concept.icmp.q3.why':
    'ICMP は問題（到達不能・フラグメント必要・時間超過）の通知と診断を担い、ユーザデータは運びません。',
  'learning.concept.ipv4.name': 'IPv4',
  'learning.concept.ipv4.q1.prompt': 'IPv4 の TTL フィールドは…',
  'learning.concept.ipv4.q1.a': 'パケットを暗号化する',
  'learning.concept.ipv4.q1.b': '各ルータで減算されループを防ぐ',
  'learning.concept.ipv4.q1.c': '優先度を設定する',
  'learning.concept.ipv4.q1.why':
    '各ホップで TTL は減算され、0 で破棄されることで、パケットの巡回時間を制限します。',
  'learning.concept.ipv4.q2.prompt': 'IPv4 アドレスは…',
  'learning.concept.ipv4.q2.a': '32 ビット、4 オクテット表記',
  'learning.concept.ipv4.q2.b': '48 ビット',
  'learning.concept.ipv4.q2.c': '128 ビット',
  'learning.concept.ipv4.q2.why':
    'IPv4 は 32 ビットで 192.168.1.1 のようなドット10進表記です。48 ビットは MAC、128 ビットは IPv6。',
  'learning.concept.ipv4.q3.prompt': 'パケットがリンク MTU を超え DF が未設定なら、ルータは…',
  'learning.concept.ipv4.q3.a': '黙って破棄する',
  'learning.concept.ipv4.q3.b': '暗号化する',
  'learning.concept.ipv4.q3.c': 'フラグメント化する',
  'learning.concept.ipv4.q3.why':
    'IPv4 ルータは過大パケットをフラグメント化します（DF ビットがあれば代わりに ICMP を返す）。',
  'learning.concept.ipv6.name': 'IPv6',
  'learning.concept.ipv6.q1.prompt': 'IPv6 アドレスは…',
  'learning.concept.ipv6.q1.a': '128 ビット',
  'learning.concept.ipv6.q1.b': '32 ビット',
  'learning.concept.ipv6.q1.c': '64 ビット',
  'learning.concept.ipv6.q1.why':
    'IPv6 はアドレスを 128 ビットに拡張し、8 つの16進グループで表記します。',
  'learning.concept.ipv6.q2.prompt': 'IPv6 が ARP の代わりに使うのは…',
  'learning.concept.ipv6.q2.a': 'DHCP',
  'learning.concept.ipv6.q2.b': '近隣探索（NDP）',
  'learning.concept.ipv6.q2.c': 'STP',
  'learning.concept.ipv6.q2.why':
    'NDP は ICMPv6 の近隣要請/近隣広告でリンク層アドレスを解決します。',
  'learning.concept.ipv6.q3.prompt': 'IPv6 に存在しないのは…',
  'learning.concept.ipv6.q3.a': 'ルーティング',
  'learning.concept.ipv6.q3.b': 'アドレス',
  'learning.concept.ipv6.q3.c': 'ブロードキャスト（マルチキャストを使う）',
  'learning.concept.ipv6.q3.why':
    'IPv6 はブロードキャストを廃止し、全ノード宛にはマルチキャストグループを使います。',
  'learning.concept.ospf.name': 'OSPF',
  'learning.concept.ospf.q1.prompt': 'OSPF は…',
  'learning.concept.ospf.q1.a': 'リンクステート型プロトコル',
  'learning.concept.ospf.q1.b': 'ディスタンスベクタ型プロトコル',
  'learning.concept.ospf.q1.c': 'パスベクタ型プロトコル',
  'learning.concept.ospf.q1.why':
    'OSPF はリンクステート広告をフラッディングし、全ルータが同じ地図を作って SPF（ダイクストラ）を実行します。',
  'learning.concept.ospf.q2.prompt': 'OSPF が最良経路を選ぶ基準は…',
  'learning.concept.ospf.q2.a': 'ホップ数',
  'learning.concept.ospf.q2.b': '総リンクコスト（多くは帯域ベース）',
  'learning.concept.ospf.q2.c': 'AS パス長',
  'learning.concept.ospf.q2.why':
    'OSPF はリンクごとのコストを合算し、総コスト最小が勝ちます。RIP のホップ数とは異なります。',
  'learning.concept.ospf.q3.prompt': 'リンク障害時、OSPF は…',
  'learning.concept.ospf.q3.a': 'タイマーを待つだけ',
  'learning.concept.ospf.q3.b': '何もしない',
  'learning.concept.ospf.q3.c': 'LSA を再フラッディングし最短経路を再計算する',
  'learning.concept.ospf.q3.why':
    'トポロジ変化が新しい LSA と SPF 再計算を引き起こし、OSPF は障害を迂回して再収束します。',
  'learning.concept.bgp.name': 'BGP',
  'learning.concept.bgp.q1.prompt': 'BGP は…',
  'learning.concept.bgp.q1.a': '自律システム間をルーティングする（インターネットの背骨）',
  'learning.concept.bgp.q1.b': 'IP アドレスを割り当てる',
  'learning.concept.bgp.q1.c': '名前を解決する',
  'learning.concept.bgp.q1.why':
    'BGP は AS 間で到達性を交換し、独立したネットワーク群が世界規模のインターネットを形成する仕組みです。',
  'learning.concept.bgp.q2.prompt': 'BGP が経路を選ぶ主基準は…',
  'learning.concept.bgp.q2.a': '最小ホップ数',
  'learning.concept.bgp.q2.b': 'ポリシーと AS パス（パスベクタ）',
  'learning.concept.bgp.q2.c': 'リンクコスト',
  'learning.concept.bgp.q2.why':
    'BGP はパスベクタ型で、運用者は AS パス長やローカルプリファレンス等の属性にポリシーを適用します。',
  'learning.concept.bgp.q3.prompt': 'BGP の「AS」とは…',
  'learning.concept.bgp.q3.a': '1 台のルータ',
  'learning.concept.bgp.q3.b': 'サブネット',
  'learning.concept.bgp.q3.c': '自律システム — 単一管理下のネットワーク',
  'learning.concept.bgp.q3.why': '各 AS は番号を持ち、自分が到達できるプレフィックスを広告します。',
  'learning.concept.rip.name': 'RIP',
  'learning.concept.rip.q1.prompt': 'RIP の経路選択基準は…',
  'learning.concept.rip.q1.a': 'ホップ数（ディスタンスベクタ）',
  'learning.concept.rip.q1.b': 'リンクコスト',
  'learning.concept.rip.q1.c': 'AS パス',
  'learning.concept.rip.q1.why':
    'RIP はルータのホップ数を数え、回線速度に関わらず最少ホップが勝ちます。',
  'learning.concept.rip.q2.prompt': 'RIP の使用可能な最大ホップ数は…',
  'learning.concept.rip.q2.a': '255',
  'learning.concept.rip.q2.b': '15（16 は到達不能）',
  'learning.concept.rip.q2.c': '無制限',
  'learning.concept.rip.q2.why':
    'RIP は 15 ホップが上限で、16 は「無限大」。このため小規模ネットワーク向けです。',
  'learning.concept.rip.q3.prompt': 'OSPF と比べて RIP は…',
  'learning.concept.rip.q3.a': '収束が速い',
  'learning.concept.rip.q3.b': '巨大ネットワークに拡張できる',
  'learning.concept.rip.q3.c': '単純だが遅く規模が限られる',
  'learning.concept.rip.q3.why':
    'RIP の周期的なディスタンスベクタ更新は簡単ですが収束が遅く、リンクステートの OSPF ほど拡張しません。',
  'learning.concept.http.name': 'HTTP',
  'learning.concept.http.q1.prompt': 'HTTP のモデルは？',
  'learning.concept.http.q1.a': '要求/応答',
  'learning.concept.http.q1.b': '発行/購読',
  'learning.concept.http.q1.c': 'ブロードキャスト',
  'learning.concept.http.q1.why':
    'クライアントが要求（メソッド + URL）を送り、サーバがステータスと本文を含む応答を返します。',
  'learning.concept.http.q2.prompt': '安全な読み取り専用 HTTP メソッドは？',
  'learning.concept.http.q2.a': 'POST',
  'learning.concept.http.q2.b': 'GET',
  'learning.concept.http.q2.c': 'DELETE',
  'learning.concept.http.q2.why':
    'GET は副作用なくリソースを取得します。POST/PUT/DELETE は状態を変更します。',
  'learning.concept.http.q3.prompt': 'HTTP 404 の意味は…',
  'learning.concept.http.q3.a': '成功',
  'learning.concept.http.q3.b': 'サーバエラー',
  'learning.concept.http.q3.c': 'リソースが見つからない',
  'learning.concept.http.q3.why':
    '4xx はクライアントエラーで、404 は要求リソースが存在しないこと（2xx 成功、5xx サーバエラー）。',
  'learning.concept.quic.name': 'QUIC',
  'learning.concept.quic.q1.prompt': 'QUIC が上に乗るのは…',
  'learning.concept.quic.q1.a': 'UDP',
  'learning.concept.quic.q1.b': 'TCP',
  'learning.concept.quic.q1.c': 'ICMP',
  'learning.concept.quic.q1.why':
    'QUIC は信頼性・順序・暗号を自前で実装し UDP の上に乗り、TCP の HOL ブロッキングとハンドシェイク遅延を避けます。',
  'learning.concept.quic.q2.prompt': 'QUIC の TCP+TLS に対する利点は…',
  'learning.concept.quic.q2.a': '暗号化しない',
  'learning.concept.quic.q2.b': '接続確立が速い（多くは 1-RTT や 0-RTT）',
  'learning.concept.quic.q2.c': 'スループットが低い',
  'learning.concept.quic.q2.why':
    'QUIC はトランスポートと TLS のハンドシェイクを統合し、データ送出前の往復を削減します。',
  'learning.concept.quic.q3.prompt': 'QUIC が複数ストリームを持つ理由は…',
  'learning.concept.quic.q3.a': '接続ごとに1 要求しか入らない',
  'learning.concept.quic.q3.b': 'パケットが決して失われない',
  'learning.concept.quic.q3.c': '1 つのパケット損失が他ストリームを止めない',
  'learning.concept.quic.q3.why':
    '独立したストリームは、1 つの損失が全体を遅らせる TCP の HOL ブロッキングを回避します。',
  'learning.concept.http2.name': 'HTTP/2',
  'learning.concept.http2.q1.prompt': 'HTTP/2 が HTTP/1.1 を改善する主な点は…',
  'learning.concept.http2.q1.a': '1 接続で多数のリクエストを多重化',
  'learning.concept.http2.q1.b': 'IPsec で暗号化',
  'learning.concept.http2.q1.c': 'TCP の代わりに UDP を使う',
  'learning.concept.http2.q1.why':
    'HTTP/2 は多数の接続を開く代わりに、単一 TCP 接続上で並行ストリームを送ります。',
  'learning.concept.http2.q2.prompt': 'HTTP/2 のフレーミングは…',
  'learning.concept.http2.q2.a': 'プレーンテキスト行',
  'learning.concept.http2.q2.b': 'バイナリフレーム',
  'learning.concept.http2.q2.c': '固定 1500 バイトセル',
  'learning.concept.http2.q2.why':
    'HTTP/2 はテキストをやめ、ストリームを運ぶバイナリフレーミング層にし、解析を効率化します。',
  'learning.concept.http2.q3.prompt': 'HTTP/2 のヘッダ圧縮は…',
  'learning.concept.http2.q3.a': 'gzip',
  'learning.concept.http2.q3.b': '圧縮なし',
  'learning.concept.http2.q3.c': 'HPACK',
  'learning.concept.http2.q3.why':
    'HPACK は共有の動的テーブルで反復ヘッダを圧縮し、リクエストごとのオーバーヘッドを削減します。',
  'learning.concept.http3.name': 'HTTP/3',
  'learning.concept.http3.q1.prompt': 'HTTP/3 が動くのは…',
  'learning.concept.http3.q1.a': 'QUIC（UDP）',
  'learning.concept.http3.q1.b': '生の TCP',
  'learning.concept.http3.q1.c': 'ICMP',
  'learning.concept.http3.q1.why':
    'HTTP/3 は HTTP の意味を QUIC に載せます。QUIC は UDP 上でストリーム・信頼性・TLS を提供します。',
  'learning.concept.http3.q2.prompt': 'HTTP/3 が HTTP/2 に勝る点は…',
  'learning.concept.http3.q2.a': 'ヘッダが大きい',
  'learning.concept.http3.q2.b': 'ストリーム間で TCP の HOL ブロッキングが無い',
  'learning.concept.http3.q2.c': '暗号化が無い',
  'learning.concept.http3.q2.why':
    'QUIC のストリームは独立なので、1 つのパケット損失が TCP のように他を止めません。',
  'learning.concept.http3.q3.prompt': 'HTTP/3 のヘッダ圧縮は…',
  'learning.concept.http3.q3.a': 'HPACK',
  'learning.concept.http3.q3.b': 'gzip',
  'learning.concept.http3.q3.c': 'QPACK',
  'learning.concept.http3.q3.why':
    'QPACK は QUIC 向けに調整した HPACK で、ヘッダテーブル更新での HOL ブロッキングを避けます。',
  'learning.concept.qos.name': 'QoS / DSCP',
  'learning.concept.qos.q1.prompt': 'DSCP が優先度を記すのは…',
  'learning.concept.qos.q1.a': 'IP ヘッダ',
  'learning.concept.qos.q1.b': 'イーサネットのプリアンブル',
  'learning.concept.qos.q1.c': 'TCP ペイロード',
  'learning.concept.qos.q1.why':
    'DSCP は IPv4/IPv6 の ToS/Traffic Class フィールドの 6 ビットを使い、各パケットをホップごとの扱いに分類します。',
  'learning.concept.qos.q2.prompt': 'QoS が最も役立つのは…',
  'learning.concept.qos.q2.a': 'リンクが常に空いている',
  'learning.concept.qos.q2.b': 'リンクが輻輳し一部が遅延に敏感',
  'learning.concept.qos.q2.c': 'ホストが1 台だけ',
  'learning.concept.qos.q2.why':
    '輻輳時、QoS はルータが一括転送より音声/映像を優先でき、全てを同等に扱わずに済みます。',
  'learning.concept.qos.q3.prompt': 'ルータが DSCP に従う方法は…',
  'learning.concept.qos.q3.a': 'パケットを暗号化する',
  'learning.concept.qos.q3.b': 'マークされた全パケットを破棄する',
  'learning.concept.qos.q3.c': '優先キューイング等のホップごとの動作を適用する',
  'learning.concept.qos.q3.why':
    '各ホップは DSCP 値をキュー/スケジューリングのホップごとの動作（PHB）に対応づけます。エンドツーエンドには一貫したマーキングが必要です。',
  'learning.concept.ecmp.name': 'ECMP',
  'learning.concept.ecmp.q1.prompt': 'ECMP を使うのは…',
  'learning.concept.ecmp.q1.a': '宛先への複数経路が同コストのとき',
  'learning.concept.ecmp.q1.b': '経路が1 つだけのとき',
  'learning.concept.ecmp.q1.c': 'リンクが落ちているとき',
  'learning.concept.ecmp.q1.why':
    'ルーティングが同コストの複数ネクストホップを見つけると、ECMP はトラフィックをそれらに分散します。',
  'learning.concept.ecmp.q2.prompt': 'ECMP が同一フローを1 経路に保つ方法は…',
  'learning.concept.ecmp.q2.a': 'パケットごとにランダム選択',
  'learning.concept.ecmp.q2.b': '5タプルをハッシュしてネクストホップを選ぶ',
  'learning.concept.ecmp.q2.c': '常に最小 IP を使う',
  'learning.concept.ecmp.q2.why':
    'フロー単位ハッシュは並べ替えを避けるため接続を1 経路に保ち、異なるフローは経路間で分散します。',
  'learning.concept.ecmp.q3.prompt': 'ECMP の利点は…',
  'learning.concept.ecmp.q3.a': '暗号化',
  'learning.concept.ecmp.q3.b': '経路が減る',
  'learning.concept.ecmp.q3.c': '負荷分散と総帯域の増加',
  'learning.concept.ecmp.q3.why':
    'ECMP は並列リンクを同時利用し、スループットを高め冗長性も提供します。',
  'learning.concept.vrrp.name': 'VRRP / FHRP',
  'learning.concept.vrrp.q1.prompt': 'VRRP が提供するのは…',
  'learning.concept.vrrp.q1.a': '仮想 IP による冗長なデフォルトゲートウェイ',
  'learning.concept.vrrp.q1.b': '名前解決',
  'learning.concept.vrrp.q1.c': 'ループ防止',
  'learning.concept.vrrp.q1.why':
    'ホストは1 つの仮想 IP を向き、マスタ障害時に VRRP がバックアップルータへ引き継ぎます。',
  'learning.concept.vrrp.q2.prompt': 'VRRP で仮想 IP を保持するのは、ある時点で…',
  'learning.concept.vrrp.q2.a': '全ルータが同時に',
  'learning.concept.vrrp.q2.b': '1 台のマスタ（他はバックアップ）',
  'learning.concept.vrrp.q2.c': 'DNS サーバ',
  'learning.concept.vrrp.q2.why':
    '1 台がマスタとして仮想 IP/MAC に応答し、バックアップは監視して障害時に引き継ぎます。',
  'learning.concept.vrrp.q3.prompt': 'VRRP が解決する問題は…',
  'learning.concept.vrrp.q3.a': 'サブネットが多すぎる',
  'learning.concept.vrrp.q3.b': 'DNS が遅い',
  'learning.concept.vrrp.q3.c': '単一のデフォルトゲートウェイが単一障害点になること',
  'learning.concept.vrrp.q3.why':
    'ファーストホップ冗長が無いとゲートウェイ障害でサブネット全体が孤立します。VRRP はその単一障害点を解消します。',
  'learning.concept.multicast.name': 'マルチキャスト / IGMP',
  'learning.concept.multicast.q1.prompt': 'マルチキャストの配送は…',
  'learning.concept.multicast.q1.a': '1 つの送信元から、関心のある受信者グループへ',
  'learning.concept.multicast.q1.b': 'インターネット上の全ホストへ',
  'learning.concept.multicast.q1.c': '2 ホスト間のみ',
  'learning.concept.multicast.q1.why':
    '1 部だけ送られ、ネットワークがマルチキャストグループのメンバへのみ複製します — 効率的な一対多です。',
  'learning.concept.multicast.q2.prompt': 'ホストがマルチキャストグループに参加する手段は…',
  'learning.concept.multicast.q2.a': 'ARP',
  'learning.concept.multicast.q2.b': 'IGMP',
  'learning.concept.multicast.q2.c': 'BGP',
  'learning.concept.multicast.q2.why':
    'IGMP はホストが欲しいマルチキャストグループをローカルルータに伝え、必要な所だけ転送させます。',
  'learning.concept.multicast.q3.prompt': 'マルチキャスト宛先アドレスが指すのは…',
  'learning.concept.multicast.q3.a': '単一ホスト',
  'learning.concept.multicast.q3.b': '物理ポート',
  'learning.concept.multicast.q3.c': 'グループ（IPv4 では 224.0.0.0/4 等）',
  'learning.concept.multicast.q3.why':
    'マルチキャストは専用のグループアドレス範囲を使い、受信者は個別指定でなく購読します。',
  'learning.concept.mtu.name': 'MTU / PMTUD',
  'learning.concept.mtu.q1.prompt': 'MTU とは…',
  'learning.concept.mtu.q1.a': '1 フレームでリンクが運べる最大ペイロード',
  'learning.concept.mtu.q1.b': '最小パケットサイズ',
  'learning.concept.mtu.q1.c': 'ルーティングメトリック',
  'learning.concept.mtu.q1.why':
    '各リンクには最大転送単位があり、それを超えるパケットはフラグメント化されるか拒否されます。',
  'learning.concept.mtu.q2.prompt': 'Path MTU Discovery の仕組みは…',
  'learning.concept.mtu.q2.a': '全ホストに ping する',
  'learning.concept.mtu.q2.b': 'DF 付きパケットを送り ICMP「フラグメント必要」を読む',
  'learning.concept.mtu.q2.c': 'DNS に尋ねる',
  'learning.concept.mtu.q2.why':
    '送信側は DF を設定し、転送できないルータがネクストホップ MTU 付き ICMP を返すので、送信側はパケットを縮めます。',
  'learning.concept.mtu.q3.prompt': 'DF 付きの過大パケットは…',
  'learning.concept.mtu.q3.a': 'とにかくフラグメント化される',
  'learning.concept.mtu.q3.b': '黙って配送される',
  'learning.concept.mtu.q3.c': '破棄され ICMP が返される',
  'learning.concept.mtu.q3.why':
    'DF があるとルータはフラグメント化できず、パケットを破棄して ICMP で問題を通知します。',
  'learning.concept.gre.name': 'GRE トンネル',
  'learning.concept.gre.q1.prompt': 'GRE トンネルの仕組みは…',
  'learning.concept.gre.q1.a': 'パケットを別の IP パケットにカプセル化する',
  'learning.concept.gre.q1.b': 'AES で暗号化する',
  'learning.concept.gre.q1.c': 'MAC アドレスを切り替える',
  'learning.concept.gre.q1.why':
    'GRE は元パケットを新しい IP+GRE ヘッダでカプセル化し、途中のネットワークをペイロードとして通過させます。',
  'learning.concept.gre.q2.prompt': 'GRE 自体が提供するのは…',
  'learning.concept.gre.q2.a': '強力な暗号化',
  'learning.concept.gre.q2.b': 'カプセル化のみで暗号化なし',
  'learning.concept.gre.q2.c': 'アドレス割り当て',
  'learning.concept.gre.q2.why':
    'GRE はトンネリング/カプセル化プロトコルで、保護するには IPsec と組み合わせます。',
  'learning.concept.gre.q3.prompt': 'トンネルは2 つの遠隔ネットワークを…',
  'learning.concept.gre.q3.a': '1 つのホストのように見せる',
  'learning.concept.gre.q3.b': '到達不能に見せる',
  'learning.concept.gre.q3.c': 'アンダーレイ越しに直結のように見せる',
  'learning.concept.gre.q3.why':
    '多数のホップを挟んでも、両端はポイントツーポイントリンク上の隣接のように振る舞います。',
  'learning.concept.mpls.name': 'MPLS',
  'learning.concept.mpls.q1.prompt': 'MPLS の転送方法は…',
  'learning.concept.mpls.q1.a': 'IP ルックアップの代わりに短いラベルを交換する',
  'learning.concept.mpls.q1.b': 'ブロードキャスト',
  'learning.concept.mpls.q1.c': 'ARP 解決',
  'learning.concept.mpls.q1.why':
    'エッジルータがラベルを付与し、コアは定めた経路に沿ってラベルを交換、ホップごとの IP ルックアップを避けます。',
  'learning.concept.mpls.q2.prompt': 'ラベル付きパケットがたどる経路を…',
  'learning.concept.mpls.q2.a': 'ブロードキャストドメイン',
  'learning.concept.mpls.q2.b': 'ラベルスイッチドパス（LSP）',
  'learning.concept.mpls.q2.c': '自律システム',
  'learning.concept.mpls.q2.why':
    'ラベルは MPLS コアを通る LSP を定義し、ホップごとの宛先検索とは独立に設定されます。',
  'learning.concept.mpls.q3.prompt': 'MPLS の位置づけは…',
  'learning.concept.mpls.q3.a': 'HTTP の上',
  'learning.concept.mpls.q3.b': 'イーサネットの下',
  'learning.concept.mpls.q3.c': 'L2 と L3 の間（「レイヤー2.5」）',
  'learning.concept.mpls.q3.why':
    'MPLS はリンクヘッダとネットワークヘッダの間にシムラベルを足すため「レイヤー2.5」と呼ばれます。',
  'learning.concept.vxlan.name': 'VXLAN / EVPN',
  'learning.concept.vxlan.q1.prompt': 'VXLAN が運ぶのは…',
  'learning.concept.vxlan.q1.a': 'UDP/IP の中の L2 フレーム（L3 上の L2）',
  'learning.concept.vxlan.q1.b': 'IPv6 のみ',
  'learning.concept.vxlan.q1.c': 'ルーティングテーブル',
  'learning.concept.vxlan.q1.why':
    'VXLAN はイーサネットフレームを UDP でトンネルし、ルーテッド（L3）なデータセンタファブリック上に L2 を延伸します。',
  'learning.concept.vxlan.q2.prompt': 'VXLAN セグメントを識別するのは…',
  'learning.concept.vxlan.q2.a': 'VLAN ID（12 ビット）',
  'learning.concept.vxlan.q2.b': 'VNI（24 ビットのネットワーク識別子）',
  'learning.concept.vxlan.q2.c': 'MAC アドレス',
  'learning.concept.vxlan.q2.why':
    '24 ビットの VNI は約 1600 万セグメントを可能にし、802.1Q VLAN の 4094 をはるかに超えます。',
  'learning.concept.vxlan.q3.prompt': 'EVPN が VXLAN とよく併用されるのは…',
  'learning.concept.vxlan.q3.a': 'フレームを暗号化するため',
  'learning.concept.vxlan.q3.b': 'IP を割り当てるため',
  'learning.concept.vxlan.q3.c': 'MAC/IP 到達性をコントロールプレーン（BGP）で配布するため',
  'learning.concept.vxlan.q3.why':
    'EVPN（BGP のアドレスファミリ）はどの MAC/IP がどのトンネル端点の背後にあるかを広告し、フラッド&ラーンを置き換えます。',
  'learning.concept.wifi.name': 'Wi-Fi / 802.11',
  'learning.concept.wifi.q1.prompt': 'Wi-Fi が衝突を避ける方式は…',
  'learning.concept.wifi.q1.a': 'CSMA/CA（衝突回避）',
  'learning.concept.wifi.q1.b': 'CSMA/CD（衝突検出）',
  'learning.concept.wifi.q1.c': 'トークンパッシング',
  'learning.concept.wifi.q1.why':
    '無線では衝突を確実に検出できないため、802.11 は検出ではなく、聞いてバックオフして回避します。',
  'learning.concept.wifi.q2.prompt': '無線媒体は…',
  'learning.concept.wifi.q2.a': '局ごとに全二重',
  'learning.concept.wifi.q2.b': '共有かつ半二重',
  'learning.concept.wifi.q2.c': '衝突なし',
  'learning.concept.wifi.q2.why':
    '全局が同じチャネルを共有し送受信は同時にできないため、エアタイムは競合します。',
  'learning.concept.wifi.q3.prompt': 'データ送信前、Wi-Fi クライアントはまず…',
  'learning.concept.wifi.q3.a': 'OSPF を実行',
  'learning.concept.wifi.q3.b': '公開 IP を取得',
  'learning.concept.wifi.q3.c': 'アクセスポイントと結合（と認証）する',
  'learning.concept.wifi.q3.why':
    'クライアントはアクセスポイントを探索し、認証して結合（例: WPA2）してからトラフィックを流せます。',
  'learning.concept.acl.name': 'ACL / ファイアウォール',
  'learning.concept.acl.q1.prompt': 'ACL がトラフィックを選別する基準は…',
  'learning.concept.acl.q1.a': 'パケットのフィールドを permit/deny ルールと照合',
  'learning.concept.acl.q1.b': '暗号化',
  'learning.concept.acl.q1.c': '圧縮',
  'learning.concept.acl.q1.why':
    'ACL は送信元/宛先 IP やポート等のフィールドを順序付きルールと照合し、許可か拒否を決めます。',
  'learning.concept.acl.q2.prompt': 'ステートフルファイアウォールがステートレス ACL と違うのは…',
  'learning.concept.acl.q2.a': '常に遅い',
  'learning.concept.acl.q2.b': '接続を追跡し応答を自動許可する',
  'learning.concept.acl.q2.c': 'ポートを無視する',
  'learning.concept.acl.q2.why':
    'ステートフルは確立済みフローを記憶し、明示的な逆ルール無しで戻りトラフィックを許可します。',
  'learning.concept.acl.q3.prompt': 'ファイアウォールの安全な既定は…',
  'learning.concept.acl.q3.a': 'すべて許可',
  'learning.concept.acl.q3.b': 'ルールなし',
  'learning.concept.acl.q3.c': '既定拒否 — 明示許可以外をブロック',
  'learning.concept.acl.q3.why':
    '既定拒否は明示的に許可したトラフィックのみ通し、攻撃面を縮小します。',
  'learning.concept.layer.fundamentals': '基礎',
  'learning.concept.model.name': 'TCP/IP・OSI モデル',
  'learning.concept.model.q1.prompt': 'ネットワークを層に分ける理由は？',
  'learning.concept.model.q1.a': '各層が1 つの問題を解き、独立に変更できるように',
  'learning.concept.model.q1.b': '遅くするため',
  'learning.concept.model.q1.c': 'ケーブルを増やすため',
  'learning.concept.model.q1.why':
    '層化により Ethernet・IP・TCP・HTTP がそれぞれ1 つの仕事を担い独立に進化できます — TCP は回線が光か Wi-Fi かを気にしません。',
  'learning.concept.model.q2.prompt': '送信時にスタックを下る順序は…',
  'learning.concept.model.q2.a': 'リンク → インターネット → トランスポート → アプリ',
  'learning.concept.model.q2.b': 'アプリ → トランスポート → インターネット → リンク',
  'learning.concept.model.q2.c': 'ランダム順',
  'learning.concept.model.q2.why':
    '送信側はアプリデータをトランスポート（TCP/UDP）→ IP → リンクフレームの順で包み、受信側は逆順で開きます。',
  'learning.concept.model.q3.prompt': 'カプセル化とは…',
  'learning.concept.model.q3.a': '全パケットを暗号化する',
  'learning.concept.model.q3.b': '全ヘッダを捨てる',
  'learning.concept.model.q3.c': '各層が上位層を自分のヘッダで包む',
  'learning.concept.model.q3.why':
    '下るにつれ各層がヘッダ（L2 ではトレーラも）を足します。ある層のペイロードは上位層の単位そのものです。',
  'learning.concept.model.q4.prompt': 'ルータが主に動作する層は…',
  'learning.concept.model.q4.a': 'ネットワーク層（L3 / IP）',
  'learning.concept.model.q4.b': 'アプリケーション層',
  'learning.concept.model.q4.c': '物理層',
  'learning.concept.model.q4.why':
    'ルータは IP（L3）で、スイッチは MAC（L2）で転送します。両者が協調してパケットを端から端へ運びます。',
  'learning.concept.model.q5.prompt': 'スイッチが主に動作する層は…',
  'learning.concept.model.q5.a': 'トランスポート層',
  'learning.concept.model.q5.b': 'データリンク層（L2 / MAC）',
  'learning.concept.model.q5.c': 'ネットワーク層',
  'learning.concept.model.q5.why':
    'スイッチは LAN 内で Ethernet フレームを MAC で転送し、IP ヘッダは見ません。',
  'learning.concept.model.q6.prompt': 'TCP が Web サーバに渡すペイロードは…',
  'learning.concept.model.q6.a': '別の IP ヘッダ',
  'learning.concept.model.q6.b': 'MAC アドレス',
  'learning.concept.model.q6.c': 'アプリケーションデータ（例: HTTP リクエスト）',
  'learning.concept.model.q6.why':
    '各層のペイロードは上位層のデータです。TCP はアプリのバイト列をサーバへ運びます。',
  'learning.concept.model.q1.b.why':
    '階層化はそれ自体で遅くするものではありません。仕事を分割し、各層を単純で置き換え可能に保ちます。',
  'learning.concept.model.q1.c.why':
    '階層化は責務の分割であって配線の話ではありません。ケーブルの本数は規定しません。',
  'learning.concept.model.q2.a.why':
    'それは受信時にスタックを上へ展開する順序です。送信ではアプリケーションから始まり下へ向かいます。',
  'learning.concept.model.q2.c.why':
    '順序は固定です。各層が順にヘッダを付け、ランダムにはなりません。',
  'learning.concept.model.q3.a.why':
    'カプセル化は「包む」ことで暗号化ではありません。機密性は別の関心事（TLS・IPsec）です。',
  'learning.concept.model.q3.b.why':
    'カプセル化は各層でヘッダを「付与」します。ヘッダを外すのは上りのデカプセル化のときだけです。',
  'learning.concept.model.q4.b.why':
    'アプリケーション層は端末側の関心事です。ルータはアプリのデータではなく L3 の IP ヘッダで転送します。',
  'learning.concept.model.q4.c.why':
    '物理層はビット/信号を運ぶだけです。ネクストホップの選択には L3 の IP アドレスが必要です。',
  'learning.concept.model.q5.a.why':
    'トランスポート層（L4）はホスト間のエンドツーエンドの関心事です。スイッチは L2 の MAC でフレームを転送します。',
  'learning.concept.model.q5.c.why':
    'IP による転送はルータ（L3）の仕事です。素のスイッチは L2 の MAC で動作します。',
  'learning.concept.model.q6.a.why':
    'IP ヘッダは L3 で、データがアプリに届く前に外されます。TCP はアプリのバイト列を上位へ渡します。',
  'learning.concept.model.q6.b.why':
    'MAC アドレスは L2 フレームヘッダにあり、アプリが受け取るペイロードには含まれません。',
  'learning.concept.addressing.name': 'アドレッシングと配送',
  'learning.concept.addressing.q1.prompt': 'MAC アドレスがフレームを届けるのは…',
  'learning.concept.addressing.q1.a': 'ローカルリンク上の次の機器へ（L2）',
  'learning.concept.addressing.q1.b': 'インターネット全体を越えて',
  'learning.concept.addressing.q1.c': 'TCP ポートへ',
  'learning.concept.addressing.q1.why':
    'MAC はリンクローカルで、同一セグメントのネクストホップへフレームを運び、各ルータで書き換えられます。',
  'learning.concept.addressing.q2.prompt': 'IP アドレスがパケットを届けるのは…',
  'learning.concept.addressing.q2.a': '1 本のケーブル内のみ',
  'learning.concept.addressing.q2.b': 'ネットワークを越えて端から端へ（L3）',
  'learning.concept.addressing.q2.c': '特定のアプリへ',
  'learning.concept.addressing.q2.why':
    'IP の送信元/宛先は（NAT を除き）端から端まで一定で、ルータはこれを使って各ホップの経路を選びます。',
  'learning.concept.addressing.q3.prompt': '別サブネットのホスト宛では、フレームは…',
  'learning.concept.addressing.q3.a': '宛先ホストの MAC へ直接',
  'learning.concept.addressing.q3.b': '永久にブロードキャスト',
  'learning.concept.addressing.q3.c':
    'デフォルトゲートウェイの MAC へ。ただしパケットの宛先 IP は最終ホスト',
  'learning.concept.addressing.q3.why':
    'サブネット外ではゲートウェイを ARP します。L2 宛先はゲートウェイ MAC、L3 宛先は最終ホストのまま — これが L2/L3 分離の核心です。',
  'learning.concept.addressing.q4.prompt': 'プライベート IP（10.0.0.0/8, 192.168.0.0/16）は…',
  'learning.concept.addressing.q4.a':
    'どのネットワークでも再利用でき、公開インターネットでは経路されない',
  'learning.concept.addressing.q4.b': '世界で一意',
  'learning.concept.addressing.q4.c': 'ルータ専用',
  'learning.concept.addressing.q4.why':
    'プライベートアドレスは NAT の背後でどこでも再利用されます。世界で一意で経路可能なのは公開アドレスだけです。',
  'learning.concept.addressing.q5.prompt': 'ブロードキャストが届くのは…',
  'learning.concept.addressing.q5.a': '特定の1 ホスト',
  'learning.concept.addressing.q5.b': 'ブロードキャストドメイン内の全ホスト',
  'learning.concept.addressing.q5.c': '購読したグループのみ',
  'learning.concept.addressing.q5.why':
    'ブロードキャスト=セグメントの全ホスト（例: ARP リクエスト）、ユニキャスト=1 ホスト、マルチキャスト=参加したグループ。',
  'learning.concept.addressing.q6.prompt': 'インターネットに NAT が必要な理由は？',
  'learning.concept.addressing.q6.a': 'トラフィックを暗号化するため',
  'learning.concept.addressing.q6.b': '名前を解決するため',
  'learning.concept.addressing.q6.c':
    'IPv4 が枯渇気味で、多数のプライベートホストが公開 IP を共有するため',
  'learning.concept.addressing.q6.why':
    'NAT はプライベート網全体が少数の公開 IPv4 を共有できるようにし、IPv4 枯渇を回避します。',
  'learning.concept.addressing.q1.b.why':
    'MAC はローカルリンク内でのみ意味を持ちます。ネットワークをまたぐのは IP アドレス（L3）の役割です。',
  'learning.concept.addressing.q1.c.why':
    'TCP ポートはアプリケーション（L4）を選びます。MAC は同じ線上の次の機器に届けるだけ（L2）です。',
  'learning.concept.addressing.q2.a.why':
    '1 本のケーブル内に留まるのは L2（MAC）です。IP アドレスは多数のリンクをまたいでエンドツーエンドに転送します。',
  'learning.concept.addressing.q2.c.why':
    '特定のアプリへ届けるのはポート（L4）の役割です。IP はパケットをホスト（L3）まで届けるだけです。',
  'learning.concept.addressing.q3.a.why':
    'サブネット外では宛先ホストの MAC に直接は届きません（別リンク上）。代わりにゲートウェイへ ARP します。',
  'learning.concept.addressing.q3.b.why':
    'ブロードキャストはサブネットを越えません。フレームはゲートウェイの MAC へ送られ、その後 IP ルーティングが引き継ぎます。',
  'learning.concept.addressing.q4.b.why':
    '同じプライベートレンジ（例: 10.0.0.0/8）は無数のネットワークに同時に存在するため、グローバルに一意とは正反対です。',
  'learning.concept.addressing.q4.c.why':
    'プライベートレンジはルータ専用ではなく、内部の任意のホスト（スマホ・サーバ・PC）が使います。',
  'learning.concept.addressing.q5.a.why':
    '特定の 1 ホストへ届けるのはユニキャストです。ブロードキャストはドメイン内の全ホストへ届きます。',
  'learning.concept.addressing.q5.c.why':
    '購読グループへの配送はマルチキャストです。ブロードキャストはブロードキャストドメインの全員へ届きます。',
  'learning.concept.addressing.q6.a.why':
    '暗号化は TLS の役割で NAT ではありません。NAT はアドレスを書き換え、プライベートホストが公開 IP を共有できるようにします。',
  'learning.concept.addressing.q6.b.why':
    '名前解決は DNS です。NAT は枯渇しがちな IPv4 アドレスを引き伸ばすために存在し、名前を引くものではありません。',
  'learning.concept.ports.name': 'ポート・ソケット・接続',
  'learning.concept.ports.q1.prompt': 'ポート番号が識別するのは…',
  'learning.concept.ports.q1.a': 'ホスト上のどのアプリ/サービスか',
  'learning.concept.ports.q1.b': 'どのルータを使うか',
  'learning.concept.ports.q1.c': 'MAC アドレス',
  'learning.concept.ports.q1.why':
    'IP でホストへ、ポートでその上の正しいサービスへ届きます（例: HTTPS は 443）。',
  'learning.concept.ports.q2.prompt': 'TCP 接続を一意に識別するのは…',
  'learning.concept.ports.q2.a': '宛先 IP だけ',
  'learning.concept.ports.q2.b':
    '5タプル: 送信元 IP・送信元ポート・宛先 IP・宛先ポート・プロトコル',
  'learning.concept.ports.q2.c': 'MAC アドレスの対',
  'learning.concept.ports.q2.why':
    '5タプルにより、同じポート宛でもサーバは何千もの同時接続を区別できます。',
  'learning.concept.ports.q3.prompt': 'HTTPS サーバの既定の待受ポートは…',
  'learning.concept.ports.q3.a': '22',
  'learning.concept.ports.q3.b': '53',
  'learning.concept.ports.q3.c': '443',
  'learning.concept.ports.q3.why':
    '443 は HTTPS、80 は HTTP、22 は SSH、53 は DNS — 1024 未満のウェルノウンポートです。',
  'learning.concept.ports.q4.prompt': '1 台のサーバがポート 443 で多数のクライアントを捌けるのは…',
  'learning.concept.ports.q4.a':
    '各クライアントが異なる送信元 IP/ポートを使い、5タプルが異なるから',
  'learning.concept.ports.q4.b': 'クライアントごとに新しい IP を開くから',
  'learning.concept.ports.q4.c': '一度に1 つしか捌けない',
  'learning.concept.ports.q4.why':
    'サーバ側ポートは共有で、接続はタプルのクライアント側で区別されます。',
  'learning.concept.ports.q5.prompt': 'ソケットとは…',
  'learning.concept.ports.q5.a': 'ケーブルの一種',
  'learning.concept.ports.q5.b': 'エンドポイント = IP アドレス + ポート',
  'learning.concept.ports.q5.c': 'ルーティングプロトコル',
  'learning.concept.ports.q5.why':
    'ソケットはサービスを（IP, ポート）に結びつけます。接続は2 つのソケットを結びます。',
  'learning.concept.ports.q6.prompt': 'DNS 参照と Web 取得が通常使うのは…',
  'learning.concept.ports.q6.a': 'どちらも TCP/80',
  'learning.concept.ports.q6.b': 'どちらも ICMP',
  'learning.concept.ports.q6.c': 'DNS は UDP/53、続いて HTTPS は TCP/443',
  'learning.concept.ports.q6.why':
    '小さな DNS 問い合わせは UDP/53、その後ページは信頼性のある TCP/443 接続で取得します。',
  'learning.concept.ports.q1.b.why':
    'ルータの選択は IP ルーティング（L3）です。ポートはホスト上のアプリ（L4）を選びます。',
  'learning.concept.ports.q1.c.why':
    'MAC は L2 のハードウェアアドレスです。ポートはサービスを識別する L4 の番号です。',
  'learning.concept.ports.q2.a.why':
    '宛先 IP だけでは同一サーバへの多数の接続を区別できません。完全な 5タプルが必要です。',
  'learning.concept.ports.q2.c.why':
    'MAC はホップごとに変わる L2 です。接続は L3/L4 の 5タプルで識別します。',
  'learning.concept.ports.q3.a.why': 'ポート 22 は SSH です。HTTPS は 443 で待ち受けます。',
  'learning.concept.ports.q3.b.why': 'ポート 53 は DNS です。HTTPS は 443 で待ち受けます。',
  'learning.concept.ports.q4.b.why':
    'サーバの IP は 1 つのままです。クライアントは送信元 IP/ポートで区別され、サーバ IP を増やすわけではありません。',
  'learning.concept.ports.q4.c.why':
    'サーバは 1 つのポートで多数のクライアントを同時に扱います。タプルのクライアント側の違いで区別されます。',
  'learning.concept.ports.q5.a.why':
    'ソケットはハードウェアではなくソフトウェアのエンドポイント — IP アドレスとポートの組です。',
  'learning.concept.ports.q5.c.why':
    'ルーティングプロトコル（OSPF など）はネットワーク間でパケットを運びます。ソケットは接続のエンドポイントにすぎません。',
  'learning.concept.ports.q6.a.why':
    'DNS は通常 UDP/53、現代の Web は HTTPS の TCP/443 を使います。両方が素の TCP/80 ではありません。',
  'learning.concept.ports.q6.b.why':
    'ICMP は診断用（ping）です。DNS は UDP/53、Web 取得は TCP/443 を使います。',
  'learning.concept.ethernet.q4.prompt': 'イーサネットフレームが運ぶ送信元/宛先は…',
  'learning.concept.ethernet.q4.a': 'MAC アドレス',
  'learning.concept.ethernet.q4.b': 'IP アドレス',
  'learning.concept.ethernet.q4.c': 'ポート番号',
  'learning.concept.ethernet.q4.why':
    'L2 フレームは MAC で宛先指定し、IP アドレスはペイロード内にあります。',
  'learning.concept.ethernet.q5.prompt': '2 台のスイッチを接続すると拡張されるのは…',
  'learning.concept.ethernet.q5.a': '2 つの別インターネット',
  'learning.concept.ethernet.q5.b': '同一のブロードキャストドメイン',
  'learning.concept.ethernet.q5.c': 'ルーティングテーブル',
  'learning.concept.ethernet.q5.why':
    '素のスイッチングは1 つのブロードキャストドメインを保ちます。分割にはルータ（または VLAN）が必要です。',
  'learning.concept.arp.q4.prompt': 'ARP が要るのは、宛先 IP は分かるが分からないのが…',
  'learning.concept.arp.q4.a': 'MAC アドレス',
  'learning.concept.arp.q4.b': 'ポート',
  'learning.concept.arp.q4.c': 'ホスト名',
  'learning.concept.arp.q4.why':
    'L2 フレームを作るには、ローカルリンクでその IP を持つ MAC を知る必要があります。',
  'learning.concept.arp.q5.prompt': 'ARP 応答をキャッシュするのは…',
  'learning.concept.arp.q5.a': 'ネットワークを遅く保つため',
  'learning.concept.arp.q5.b': 'パケットごとに ARP しなくて済むように',
  'learning.concept.arp.q5.c': 'IP を変えるため',
  'learning.concept.arp.q5.why':
    'ARP キャッシュは各フレーム前のブロードキャスト探索を省きます。エントリは時間で失効します。',
  'learning.concept.ipv4.q4.prompt': 'IPv4 のネットワーク部とホスト部の境界を決めるのは…',
  'learning.concept.ipv4.q4.a': 'サブネットマスク / プレフィックス長',
  'learning.concept.ipv4.q4.b': 'TTL',
  'learning.concept.ipv4.q4.c': 'ポート',
  'learning.concept.ipv4.q4.why':
    'マスクは先頭何ビットがネットワークかを示し、残りのビットがホストを識別します。',
  'learning.concept.ipv4.q5.prompt': 'ルーティングテーブルの 0.0.0.0/0 は…',
  'learning.concept.ipv4.q5.a': 'ブロードキャストアドレス',
  'learning.concept.ipv4.q5.b': 'デフォルトルート — すべてに一致',
  'learning.concept.ipv4.q5.c': '無効なエントリ',
  'learning.concept.ipv4.q5.why':
    'すべて 0 の /0 はあらゆる宛先に一致し、より具体的な経路が無いときに使われます。',
  'learning.concept.tcp.q4.prompt': 'TCP セグメントが失われると、TCP は…',
  'learning.concept.tcp.q4.a': '再送する',
  'learning.concept.tcp.q4.b': '無視する',
  'learning.concept.tcp.q4.c': '接続を閉じる',
  'learning.concept.tcp.q4.why':
    '確認応答の欠落が再送を起こします — これが信頼性のない網で TCP が確実に届ける仕組みです。',
  'learning.concept.tcp.q5.prompt': 'TCP のフロー制御と輻輳制御の目的は…',
  'learning.concept.tcp.q5.a': 'データを暗号化するため',
  'learning.concept.tcp.q5.b': '受信側と網を溢れさせないため',
  'learning.concept.tcp.q5.c': 'IP を割り当てるため',
  'learning.concept.tcp.q5.why':
    'ウィンドウが送信速度を受信側のバッファと網の輻輳信号に合わせて調整します。',
  'learning.concept.udp.q4.prompt': 'UDP データグラムが失われると、プロトコルは…',
  'learning.concept.udp.q4.a': '何もしない — 必要ならアプリが対処する',
  'learning.concept.udp.q4.b': '再送する',
  'learning.concept.udp.q4.c': 'リンクをリセットする',
  'learning.concept.udp.q4.why':
    'UDP は信頼性を提供しません。必要なアプリ（または損失を許容するアプリ）が上位で実装します。',
  'learning.concept.udp.q5.prompt': 'DNS が UDP をよく使うのは…',
  'learning.concept.udp.q5.a': '暗号化が要るから',
  'learning.concept.udp.q5.b': '小さな問い合わせ/応答は速く、単純に再試行できるから',
  'learning.concept.udp.q5.c': '厳密な順序が要るから',
  'learning.concept.udp.q5.why':
    '単一の小さなやり取りに TCP の確立コストは見合わず、損失時はクライアントが再試行するだけです。',
  'learning.concept.dns.q4.prompt': 'DNS 応答のキャッシュは…',
  'learning.concept.dns.q4.a': '再参照を高速化し負荷を減らす（TTL を尊重）',
  'learning.concept.dns.q4.b': 'IP アドレスを変える',
  'learning.concept.dns.q4.c': '禁止されている',
  'learning.concept.dns.q4.why':
    'リゾルバはレコードを TTL の間キャッシュし、人気の名前は再問い合わせなしで即解決します。',
  'learning.concept.dns.q5.prompt': 'AAAA レコードが保持するのは…',
  'learning.concept.dns.q5.a': 'IPv4 アドレス',
  'learning.concept.dns.q5.b': 'IPv6 アドレス',
  'learning.concept.dns.q5.c': 'メールサーバ名',
  'learning.concept.dns.q5.why': 'A は IPv4、AAAA は IPv6、MX はメール、CNAME は別名です。',
  'learning.concept.arp.q1.b.why':
    'ホスト名→IP の対応付けは DNS です。ARP はローカルリンク上で既知の IP を MAC に解決します。',
  'learning.concept.arp.q1.c.why':
    'MAC→ポートはスイッチが自分で学習します。ARP は IP を MAC に解決するもので、MAC をポートに対応づけるものではありません。',
  'learning.concept.arp.q2.a.why':
    'ターゲットの MAC はまだ分かりません — それこそ ARP が問い合わせている相手です — だからリクエストはブロードキャストします。',
  'learning.concept.arp.q2.c.why':
    'ゲートウェイはサブネット外宛ての通信でのみ関係します。ARP リクエストは LAN 全体へブロードキャストします。',
  'learning.concept.arp.q3.a.why':
    'ARP はルータを越えられません。インターネット全体ではなく、1 つのブロードキャストドメイン内でのみ働きます。',
  'learning.concept.arp.q3.b.why':
    'ARP はルータ間ではなく LAN 上のホスト間で動作し、セグメント内で IP→MAC を解決します。',
  'learning.concept.arp.q4.b.why':
    'ポート（L4）はアプリを選ぶもので、フレームの宛先ではありません。ARP が補うのは欠けている MAC です。',
  'learning.concept.arp.q4.c.why':
    'ホスト名は先に DNS で解決済みです。フレーム構築にまだ足りないのは MAC です。',
  'learning.concept.arp.q5.a.why':
    'キャッシュはネットワークを遅くするのではなく速くします — パケットごとの ARP 往復を省きます。',
  'learning.concept.arp.q5.c.why':
    'キャッシュは IP アドレスを変えません。しばらくの間 IP→MAC の対応を覚えておくだけです。',
  'learning.concept.tcp.q1.b.why': 'FIN は接続を切断します。確立は SYN → SYN-ACK → ACK です。',
  'learning.concept.tcp.q1.c.why': '中間は SYN-ACK の結合で、ACK は最後です：SYN → SYN-ACK → ACK。',
  'learning.concept.tcp.q2.a.why':
    'TCP は信頼性（再送・順序）のために少しの遅延を引き換えにします。低遅延を選ぶなら UDP です。',
  'learning.concept.tcp.q2.c.why':
    'TCP は暗号化しません — それは上位の TLS です。TCP は信頼性のある順序通りのバイト列を保証します。',
  'learning.concept.tcp.q3.a.why':
    'RST はエラー用です — 拒否されたポートや壊れた接続を即座に打ち切り、FIN 交換を一切踏みません。',
  'learning.concept.tcp.q3.b.why':
    '2度目の SYN は確立しようとするもので切断ではありません。正常な切断は双方向の FIN/ACK です。',
  'learning.concept.tcp.q4.b.why':
    'TCP は損失を単に無視しません — それでは信頼性が壊れます。欠けたセグメントを再送します。',
  'learning.concept.tcp.q4.c.why':
    '1 回の損失は再送のトリガーであって切断ではありません。TCP は本当の障害時のみ切断します。',
  'learning.concept.tcp.q5.a.why':
    '暗号化は TLS の役割です。フロー/輻輳制御は受信側とネットワークに合わせて送信側を調整します。',
  'learning.concept.tcp.q5.c.why':
    'IP アドレスの割り当ては DHCP です。TCP のウィンドウは過負荷を避けるため送信レートを絞ります。',
  'learning.concept.dns.q1.b.why':
    'IP→MAC はローカルリンク上の ARP の役割です。DNS は人間が読む名前を IP アドレスに対応づけます。',
  'learning.concept.dns.q1.c.why':
    'ポートは単なる既知の番号です。DNS は名前を IP アドレスに解決するもので、ポートを名前に対応づけるものではありません。',
  'learning.concept.dns.q2.a.why':
    'MX レコードはホストの IPv4 ではなくメールサーバを指します。名前→IPv4 のレコードは A です。',
  'learning.concept.dns.q2.c.why':
    'CNAME はアドレスではなく別の名前への別名です。IPv4 の対応は A レコードです。',
  'learning.concept.dns.q3.a.why':
    '自分のゾーンからのみ答えるのは権威サーバです。再帰リゾルバはあなたの代わりに答えを追いかけます。',
  'learning.concept.dns.q3.b.why':
    'DNS がキャッシュするのは名前→IP の答えで MAC ではありません。再帰リゾルバは名前が解決するまで他サーバへ問い合わせます。',
  'learning.concept.dns.q4.b.why':
    'キャッシュは既存の答えを再利用します。IP を変えることはなく、TTL が切れるまで提供するだけです。',
  'learning.concept.dns.q4.c.why':
    'キャッシュは禁止どころか推奨されます。TTL はまさにリゾルバが安全にキャッシュできるよう存在します。',
  'learning.concept.dns.q5.a.why':
    'IPv4 アドレスは A レコードに入ります。クアッド A（AAAA）レコードは IPv6 アドレスを保持します。',
  'learning.concept.dns.q5.c.why':
    'メールサーバ名は MX レコードです。AAAA は IPv6 アドレスを保持します。',
  'learning.concept.udp.q1.a.why':
    '再送は TCP の機能です。UDP は送りっぱなしで、再送が必要ならアプリの仕事です。',
  'learning.concept.udp.q1.b.why':
    '順序保証は TCP のものです。UDP のデータグラムは順不同で届くことも、届かないこともあります。',
  'learning.concept.udp.q2.a.why':
    '大きなダウンロードは全バイトが欠けず順序通りである必要があり、それは TCP の信頼性で UDP ではありません。',
  'learning.concept.udp.q2.c.why':
    '銀行取引は確実な配送を要します。ベストエフォートの UDP ではなく TCP が必要です。',
  'learning.concept.udp.q3.b.why':
    'シーケンス/ACK 番号は TCP の信頼性のものです。UDP のヘッダはポート・長さ・チェックサムだけです。',
  'learning.concept.udp.q3.c.why':
    '輻輳ウィンドウは TCP の仕組みです。UDP はコネクションレスで絞るものがありません。',
  'learning.concept.udp.q4.b.why':
    '再送は TCP です。UDP は再送せず、回復が必要ならアプリの仕事です。',
  'learning.concept.udp.q4.c.why':
    'UDP にはリセットする接続がありません。失われたデータグラムはアプリが再送しない限り消えるだけです。',
  'learning.concept.udp.q5.a.why':
    'UDP 自体は暗号化しません。DNS が使うのは小さな問い合わせ/応答が速く再試行も容易だからです。',
  'learning.concept.udp.q5.c.why':
    '小さな DNS のやり取りに順序は不要です。だから軽量な UDP が適し、TCP ではありません。',
  'learning.concept.ethernet.q1.b.why':
    'IP アドレスは L3 です。イーサネットフレームは L2 の MAC で宛先指定します。',
  'learning.concept.ethernet.q1.c.why':
    'ポート番号は L4 です。フレームは次の機器へ届くため L2 の MAC を使います。',
  'learning.concept.ethernet.q2.a.why':
    'スイッチは IP ヘッダ（L3 ルーティング）を読みません。L2 の送信元 MAC から学習します。',
  'learning.concept.ethernet.q2.c.why':
    'OSPF はルータ向けのルーティングプロトコルです。スイッチはフレームの送信元 MAC を学習するだけです。',
  'learning.concept.ethernet.q3.a.why':
    '宛先不明のフレームは破棄ではなくフラッディングされ、ホストに届く可能性を残します。',
  'learning.concept.ethernet.q3.b.why':
    'スイッチはゲートウェイへルーティングしません（L3）。不明ユニキャストは他の全ポートへフラッディングします。',
  'learning.concept.ethernet.q4.b.why':
    'IP アドレスはペイロード内（L3）にあります。フレーム自身の送信元/宛先は MAC アドレスです。',
  'learning.concept.ethernet.q4.c.why':
    'ポート番号は L4 ヘッダにあります。イーサネットフレームは MAC で宛先指定します。',
  'learning.concept.ethernet.q5.a.why':
    'スイッチをつないでも別々のインターネットはできません。1 つのブロードキャストドメインに結合します。',
  'learning.concept.ethernet.q5.c.why':
    'ルーティングテーブルはルータの L3 構造です。スイッチ同士の接続は L2 ドメインを広げるだけです。',
  'learning.concept.dhcp.q1.a.why':
    'SYN/ACK/FIN は TCP のハンドシェイクです。DHCP の 4 段階は Discover・Offer・Request・Ack です。',
  'learning.concept.dhcp.q1.c.why':
    'それらは DHCP の段階名ではありません。やり取りは Discover → Offer → Request → Ack（DORA）です。',
  'learning.concept.dhcp.q2.b.why':
    'ユニキャストにはサーバのアドレスが必要ですが、それこそクライアントが探しているものです（自分の送信元 IP もまだありません）。',
  'learning.concept.dhcp.q2.c.why':
    'Discover はルータ宛マルチキャストではなく LAN 上の L2 ブロードキャストです。クライアントはまだアドレスを持ちません。',
  'learning.concept.dhcp.q3.a.why':
    'MAC は NIC に焼かれていて DHCP が配るものではありません。DHCP はゲートウェイと DNS サーバを提供します。',
  'learning.concept.dhcp.q3.b.why':
    'TCP ポートはアプリが選ぶもので DHCP は割り当てません。DHCP はゲートウェイと DNS を提供します。',
  'learning.concept.icmp.q1.b.why':
    'ping は TCP ではありません — ポートもハンドシェイクもなく、ICMP Echo Request/Reply を使います。',
  'learning.concept.icmp.q1.c.why':
    'ping は UDP も使いません。ICMP Echo Request/Reply の上で直接動きます。',
  'learning.concept.icmp.q2.a.why':
    'ARP はローカルリンクで IP→MAC を解決します。TTL 切れではルータが ICMP Time Exceeded を送ります。',
  'learning.concept.icmp.q2.c.why':
    'TCP RST は接続を中断します。TTL が 0 になるのは L3 の事象で ICMP Time Exceeded を生みます。',
  'learning.concept.icmp.q3.a.why':
    'ICMP はアプリのペイロード用ではありません。制御・エラー・診断メッセージを運びます。',
  'learning.concept.icmp.q3.b.why':
    'ルーティングテーブルはルーティングプロトコル（OSPF/BGP）が交換します。ICMP はエラー/診断メッセージを運びます。',
  'learning.concept.ipv4.q1.a.why':
    'TTL は暗号化しません。各ルータが減らすホップ数で、パケットが無限にループするのを防ぎます。',
  'learning.concept.ipv4.q1.c.why':
    '優先度は DSCP/ToS フィールドです。TTL は無限ループを防ぐホップ上限です。',
  'learning.concept.ipv4.q2.b.why':
    '48 ビットは MAC アドレスです。IPv4 アドレスは 32 ビット（4 オクテット）です。',
  'learning.concept.ipv4.q2.c.why': '128 ビットは IPv6 アドレスです。IPv4 は 32 ビットです。',
  'learning.concept.ipv4.q3.a.why':
    'DF がセットされている場合だけ破棄されます。DF が立っていなければルータは MTU に合わせてフラグメント化します。',
  'learning.concept.ipv4.q3.b.why':
    'ルータは暗号化しません。DF が立っていない大きすぎるパケットはリンク MTU に合わせてフラグメント化されます。',
  'learning.concept.ipv4.q4.b.why':
    'TTL はアドレッシングと無関係なホップ数です。ネットワーク/ホストの境界はマスク/プレフィックス長が決めます。',
  'learning.concept.ipv4.q4.c.why':
    'ポートは L4 です。ネットワークとホストの境界はサブネットマスク/プレフィックス長によります。',
  'learning.concept.ipv4.q5.a.why':
    'ブロードキャストは 255.255.255.255 です。0.0.0.0/0 はあらゆる宛先に一致するデフォルトルートです。',
  'learning.concept.ipv4.q5.c.why':
    '0.0.0.0/0 は完全に有効です — 任意のアドレスに最も大まかに一致するデフォルトルートです。',
  'learning.concept.ipv6.q1.b.why': '32 ビットは IPv4 です。IPv6 アドレスは 128 ビットです。',
  'learning.concept.ipv6.q1.c.why':
    '64 ビットはインターフェース識別子の半分にすぎません。完全な IPv6 アドレスは 128 ビットです。',
  'learning.concept.ipv6.q2.a.why':
    'DHCP はアドレスを配ります。IPv6 は ARP に代わり NDP（近隣探索）で近隣を解決します。',
  'learning.concept.ipv6.q2.c.why':
    'STP は L2 ループを防ぎます。ARP の IPv6 後継は近隣探索（NDP）です。',
  'learning.concept.ipv6.q3.a.why':
    'IPv6 はもちろんルーティングします。なくしたのはブロードキャストで、代わりにマルチキャストを使います。',
  'learning.concept.ipv6.q3.b.why':
    'IPv6 はまさにアドレス（128 ビット）の話です。なくしたのはブロードキャストで、マルチキャストに置き換えました。',
  'learning.concept.nat.q1.b.why':
    'スイッチの MAC 学習は L2 の機能です。NAT の仕事は多数のプライベートホストが 1 つの公開 IP を共有できるようにすることです。',
  'learning.concept.nat.q1.c.why':
    'OSPF はルーティングプロトコルです。NAT はアドレスを書き換え、プライベート網が公開 IP を共有できるようにします。',
  'learning.concept.nat.q2.a.why':
    'デフォルトルートは外向きの通信を送り出します。外から内部サーバへ届かせるにはポートフォワーディング（DNAT）が必要です。',
  'learning.concept.nat.q2.c.why':
    'VLAN トランクはスイッチ間で L2 の VLAN を運びます。内部サーバの公開はポートフォワーディング（DNAT）で行います。',
  'learning.concept.nat.q3.a.why':
    'NAT は暗号化しません。テーブルは応答を正しい内部ホストとポートへ戻すために存在します。',
  'learning.concept.nat.q3.b.why':
    'ルートブリッジ選出は STP（L2）です。NAT のテーブルは戻りの通信を正しい内部ホストに対応づけます。',
  'learning.concept.ospf.q1.b.why':
    'ディスタンスベクタは RIP/EIGRP です。OSPF はリンクステートで、各ルータが完全な地図を作り SPF を実行します。',
  'learning.concept.ospf.q1.c.why':
    'パスベクタは BGP です。OSPF は LSA をフラッディングし最短経路を計算するリンクステート IGP です。',
  'learning.concept.ospf.q2.a.why':
    'ホップ数は RIP の指標です。OSPF は素のホップ数ではなくリンクコスト（多くは帯域ベース）の合計で選びます。',
  'learning.concept.ospf.q2.c.why':
    'AS パス長は BGP のものです。AS 内では OSPF は総リンクコストで選びます。',
  'learning.concept.ospf.q3.a.why':
    'OSPF はタイマーを受け身で待つのではなく、LSA を再フラッディングして即座に変化へ反応します。',
  'learning.concept.ospf.q3.b.why':
    'OSPF は障害を無視できません — LSA を再フラッディングし最短経路ツリーを再計算します。',
  'learning.concept.bgp.q1.b.why':
    'アドレス割り当ては DHCP です。BGP はインターネット全体で自律システム間の到達性をルーティングします。',
  'learning.concept.bgp.q1.c.why':
    '名前解決は DNS です。BGP はインターネットをつなぐ AS 間ルーティングプロトコルです。',
  'learning.concept.bgp.q2.a.why':
    'BGP はホップ数ベースではありません（それは RIP）。ポリシーと AS パス属性で経路を選びます。',
  'learning.concept.bgp.q2.c.why':
    'リンクコストは OSPF の AS 内指標です。BGP は AS 間をポリシーと AS パスで決めます。',
  'learning.concept.bgp.q3.a.why':
    'AS は単一のルータではなく、1 つの管理下にあるネットワーク全体です。',
  'learning.concept.bgp.q3.b.why':
    'サブネットは L3 のアドレスブロックです。AS は独自の番号を持つ多数のネットワークの管理ドメインです。',
  'learning.concept.rip.q1.b.why':
    'リンクコストは OSPF の指標です。RIP はディスタンスベクタで単純にホップ数を数えます。',
  'learning.concept.rip.q1.c.why': 'AS パスは BGP のものです。RIP はホップ数で経路を選びます。',
  'learning.concept.rip.q2.a.why':
    'RIP の上限は 255 よりはるかに低く、使えるのは 15 ホップ、16 は到達不能を意味します（ループ抑止）。',
  'learning.concept.rip.q2.c.why':
    'RIP は意図的に制限されています。最大 15 ホップ、16 で到達不能 — 無制限にはスケールしません。',
  'learning.concept.rip.q3.a.why':
    'RIP は OSPF より収束が遅く（定期更新・無限カウント）、速くはありません。',
  'learning.concept.rip.q3.b.why':
    'RIP は 15 ホップ制限で小規模向けです。大規模にスケールするのは OSPF です。',
  'learning.concept.tls.q1.a.why':
    'ルーティングは IP（L3）の仕事です。TLS は TCP の上に暗号化・完全性・サーバ認証を加えます。',
  'learning.concept.tls.q1.c.why':
    'アドレス割り当ては DHCP です。TLS は暗号化・完全性・認証でセッションを保護します。',
  'learning.concept.tls.q2.a.why':
    'MAC は偽装も容易な L2 のハードウェアアドレスにすぎません。TLS の身元は X.509 証明書で証明します。',
  'learning.concept.tls.q2.b.why':
    'VLAN タグは L2 トラフィックを分けるもので身元とは無関係です。TLS は X.509 証明書を使います。',
  'learning.concept.tls.q3.b.why':
    'TLS は IP の下ではなくトランスポートの上にあり、下に TCP のような信頼できるバイト列を必要とします。',
  'learning.concept.tls.q3.c.why':
    'TLS はイーサネット（L2）を置き換えません。TCP のような信頼できるトランスポートの上に重なります。',
  'learning.concept.http.q1.b.why':
    'パブリッシュ/サブスクライブはメッセージング様式（MQTT など）です。HTTP はクライアント要求→サーバ応答のやり取りです。',
  'learning.concept.http.q1.c.why':
    'HTTP はブロードキャストではありません。クライアントが要求を送り、サーバがそのクライアントへ応答します。',
  'learning.concept.http.q2.a.why':
    'POST はデータを送信/作成しサーバ状態を変えます。安全で読み取り専用なのは GET です。',
  'learning.concept.http.q2.c.why':
    'DELETE はリソースを削除し読み取り専用ではありません。読み取りだけの安全なメソッドは GET です。',
  'learning.concept.http.q3.a.why':
    '成功は 2xx（例: 200）です。404 はリソースが見つからないことを示すクライアントエラーです。',
  'learning.concept.http.q3.b.why':
    'サーバエラーは 5xx（例: 500）です。404 はサーバエラーではなく 4xx のクライアントエラーです。',
  'learning.concept.quic.q1.b.why':
    'QUIC は HOL ブロッキングを避けるため意図的に TCP を使わず、UDP の上で動きます。',
  'learning.concept.quic.q1.c.why':
    'ICMP はデータ転送ではなく診断用です。QUIC は UDP の上に構築されます。',
  'learning.concept.quic.q2.a.why':
    'QUIC は常に暗号化されます（TLS 1.3 を内蔵）。利点は暗号化の省略ではなく接続確立の速さです。',
  'learning.concept.quic.q2.c.why':
    'QUIC はスループットを同等以上に狙います。目玉は接続確立の速さ（1-RTT/0-RTT）です。',
  'learning.concept.quic.q3.a.why':
    '逆です — 独立したストリームにより多数の要求が 1 接続を同時に共有できます。',
  'learning.concept.quic.q3.b.why':
    'QUIC はパケット損失を防げません。損失の影響を抑え、そのストリームだけが止まるようにします。',
  'learning.concept.http2.q1.b.why':
    'HTTP/2 は IPsec を加えません。利点は多数のリクエストを 1 つの TCP 接続で多重化することです。',
  'learning.concept.http2.q1.c.why':
    'HTTP/2 は依然 TCP を使います（UDP は HTTP/3 の QUIC）。1 接続でストリームを多重化します。',
  'learning.concept.http2.q2.a.why':
    'プレーンテキスト行は HTTP/1.1 です。HTTP/2 は効率的なバイナリフレーミング層を使います。',
  'learning.concept.http2.q2.c.why':
    '固定 1500 バイトのセルは ATM/Ethernet の MTU を思わせます。HTTP/2 は可変長のバイナリフレームです。',
  'learning.concept.http2.q3.a.why':
    'gzip は本文を圧縮します。HTTP/2 のヘッダは専用の HPACK で圧縮します。',
  'learning.concept.http2.q3.b.why':
    'HTTP/2 はヘッダ（特に繰り返しの多いもの）を HPACK で圧縮します。',
  'learning.concept.http3.q1.b.why':
    '素の TCP は HTTP/1.1 と HTTP/2 です。HTTP/3 は UDP 上に構築された QUIC の上で動きます。',
  'learning.concept.http3.q1.c.why': 'ICMP は診断用です。HTTP/3 は QUIC（UDP）の上で動きます。',
  'learning.concept.http3.q2.a.why':
    'HTTP/3 はヘッダを小さく保ちます（QPACK）。利点はストリーム間の TCP の HOL ブロッキングの解消です。',
  'learning.concept.http3.q2.c.why':
    'HTTP/3 は QUIC/TLS 1.3 で常に暗号化されます。利点はストリーム間の TCP の HOL ブロッキングがないことです。',
  'learning.concept.http3.q3.a.why':
    'HPACK は HTTP/2 のものです。HTTP/3 は QUIC の順不同配送に耐える QPACK を使います。',
  'learning.concept.http3.q3.b.why':
    'gzip は本文用です。HTTP/3 はヘッダを QPACK（QUIC 向けに適応した HPACK）で圧縮します。',
  'learning.concept.stp.q1.a.why':
    'IP 枯渇は NAT/IPv6 で解決します。STP はスイッチ網の L2 転送ループを防ぎます。',
  'learning.concept.stp.q1.c.why':
    'ルーティングループは L3 の問題（TTL・ルーティングプロトコル）です。STP はスイッチ間の L2 転送ループを止めます。',
  'learning.concept.stp.q2.b.why':
    '指定ルータは OSPF（L3）の役割です。STP の基準点は選出されたルートブリッジです。',
  'learning.concept.stp.q2.c.why':
    'デフォルトゲートウェイはサブネットの出口ルータ（L3）です。STP の起点はルートブリッジです。',
  'learning.concept.stp.q3.a.why':
    'ブロックされたポートも物理的には生きています。BPDU を聞きつつデータ転送だけを止めます。',
  'learning.concept.stp.q3.b.why':
    '逆です — ブロックポートはデータフレームを落としつつ、トポロジ監視のため BPDU は処理します。',
  'learning.concept.vlan.q1.b.why':
    'VLAN は物理ではなく論理です — 新たな配線なしに 1 台のスイッチを別々のブロードキャストドメインに分けます。',
  'learning.concept.vlan.q1.c.why':
    'ルーティングテーブルは L3 ルータの構造です。VLAN は別々の L2 ブロードキャストドメインを作るだけです。',
  'learning.concept.vlan.q2.a.why':
    '1 つの VLAN だけを運ぶのはアクセスポートです。トランクは 802.1Q でタグ付けし複数 VLAN を運びます。',
  'learning.concept.vlan.q2.c.why':
    'トランクは 802.1Q でタグ付けし VLAN を区別します。タグなしのみはアクセスポートの説明です。',
  'learning.concept.vlan.q3.a.why':
    '配線では VLAN をまたげません — それらは別々の L3 ネットワークで、ルータか L3 スイッチが必要です。',
  'learning.concept.vlan.q3.b.why':
    'ルートブリッジは 1 つの L2 ドメイン内の STP の概念です。VLAN 間の移動には L3 ルーティングが必要です。',
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
  'learning.concept.wifi.q1.b.why':
    'CSMA/CD（検出）は有線 Ethernet です。無線は送信中に聞けないため、Wi-Fi は衝突回避の CSMA/CA を使います。',
  'learning.concept.wifi.q1.c.why':
    'トークンパッシングは Token Ring/FDDI です。Wi-Fi は共有の電波上で衝突を避ける CSMA/CA を使います。',
  'learning.concept.wifi.q2.a.why':
    '無線は 1 チャネルで同時に送受信できません。媒体は共有で半二重です。',
  'learning.concept.wifi.q2.c.why':
    '無線は衝突がないわけではありません — だから Wi-Fi は CSMA/CA を要します。電波は共有で半二重です。',
  'learning.concept.wifi.q3.a.why':
    'OSPF はルータのルーティングプロトコルで無関係です。Wi-Fi クライアントはまずアクセスポイントに結合します。',
  'learning.concept.wifi.q3.b.why':
    '公開 IP は不要です（NAT/プライベート IP で動きます）。まずクライアントはアクセスポイントと結合し認証します。',
  'learning.concept.lacp.q1.b.why':
    'ループ防止は STP です。LACP は複数の物理リンクを 1 つの論理リンクに束ねます。',
  'learning.concept.lacp.q1.c.why':
    'VLAN の割り当てはスイッチ設定（802.1Q）です。LACP は複数リンクを 1 つに集約します。',
  'learning.concept.lacp.q2.a.why':
    '集約は L2 の帯域/冗長機能で、新しいサブネット（L3 アドレッシング）ではありません。',
  'learning.concept.lacp.q2.c.why':
    'LACP は暗号化しません。リンクの束ね合わせは合計帯域とリンク冗長を高めます。',
  'learning.concept.lacp.q3.a.why':
    '逆です — 束ねなければ並列リンクはまさに STP がブロックするループになります。LACP の交渉がそれらを 1 つの論理リンクにします。',
  'learning.concept.lacp.q3.b.why':
    'ポートチャネルはルータではなく依然 L2 です。STP は正しい束を 1 つの論理リンクとして扱います。',
  'learning.concept.lldp.q1.b.why':
    'サブネット間のルーティングは L3 です。LLDP は直結の隣接機器とその能力を発見するだけです。',
  'learning.concept.lldp.q1.c.why':
    'LLDP は暗号化しません。機器の識別情報/能力を直結の隣接機器に広告します。',
  'learning.concept.lldp.q2.a.why':
    'インターネット全体には届きません。LLDP はリンク単位で、直結の隣接機器だけを発見し、遠隔の機器は見えません。',
  'learning.concept.lldp.q2.c.why':
    'LLDP は独自の EtherType を持つ L2 プロトコルで TCP では運ばれません。1 つのリンク内に留まります。',
  'learning.concept.lldp.q3.a.why':
    'IP の割り当ては DHCP です。LLDP は物理トポロジを把握し、VoIP 電話や PoE の自動設定を助けます。',
  'learning.concept.lldp.q3.b.why':
    '経路選択はルーティングプロトコルの仕事です。LLDP は隣接機器を発見してトポロジを描き VoIP/PoE を助けます。',
  'learning.concept.ssh.q1.b.why':
    '平文転送は FTP/Telnet です。SSH は暗号化されたリモートシェルと安全なトンネルを提供します。',
  'learning.concept.ssh.q1.c.why':
    'アドレス割り当ては DHCP です。SSH は暗号化されたリモートシェルとトンネリングを提供します。',
  'learning.concept.ssh.q2.a.why': 'ポート 23 は Telnet（非暗号）です。SSH は 22 で待ち受けます。',
  'learning.concept.ssh.q2.c.why': 'ポート 443 は HTTPS です。SSH は 22 で待ち受けます。',
  'learning.concept.ssh.q3.a.why':
    'MAC フィルタリングは偽装も容易な弱い L2 アクセス制御です。SSH の強力な方式は公開鍵認証です。',
  'learning.concept.ssh.q3.b.why':
    'VLAN タグはトラフィックを分けるもので利用者認証ではありません。SSH は公開鍵認証を使います。',
  'learning.concept.ftp.q1.b.why':
    'FTP は単一の UDP データグラムではなく 2 本の接続を持つ TCP ベースで、制御とデータを分けます。',
  'learning.concept.ftp.q1.c.why':
    'ICMP は診断用です。FTP は制御とデータを別チャネルに分け TCP 上で動きます。',
  'learning.concept.ftp.q2.a.why':
    'ポート 80 は HTTP です。FTP の制御接続はポート 21 を使います（データは 20 か交渉されたポート）。',
  'learning.concept.ftp.q2.c.why': 'ポート 53 は DNS です。FTP の制御接続はポート 21 を使います。',
  'learning.concept.ftp.q3.a.why':
    'パッシブモードは暗号化しません（それは FTPS/SFTP）。クライアントが自分のファイアウォール/NAT 越しにデータ接続を開けるようにします。',
  'learning.concept.ftp.q3.b.why':
    'パッシブ FTP は DNS と無関係です。データ接続をクライアント側のファイアウォールや NAT を越えられるようにします。',
  'learning.concept.smtp.q1.b.why':
    '受信は IMAP/POP3 の役割です。メールクライアントが SMTP を使うのは送信（投稿）側だけで、メールの取得には使いません。',
  'learning.concept.smtp.q1.c.why':
    'ホスト名解決は DNS です。SMTP はメールを送信・中継するプロトコルです。',
  'learning.concept.smtp.q2.a.why':
    'ポート 110 は POP3（受信）です。SMTP は 25（サーバ間中継）か 587（投稿）を使います。',
  'learning.concept.smtp.q2.c.why': 'ポート 22 は SSH です。SMTP は 25 か 587 を使います。',
  'learning.concept.smtp.q3.a.why':
    'A レコードはホストの IPv4 を返します。メール配送は MX レコードが指示します。',
  'learning.concept.smtp.q3.b.why':
    'CNAME は別名です。ドメインのメールサーバを示すレコードは MX です。',
  'learning.concept.email.q1.b.why':
    'サーバ間の送信・中継は SMTP です。IMAP と POP3 はクライアントへメールを受信します。',
  'learning.concept.email.q1.c.why':
    'アドレス割り当ては DHCP です。IMAP/POP3 はメールボックスサーバからメールを取得します。',
  'learning.concept.email.q2.a.why':
    '両方とも TLS で動かせます。本質的な違いは IMAP がサーバ側で同期し、POP3 はダウンロードして削除する点です。',
  'learning.concept.email.q2.c.why':
    'POP3 は受信であって送信ではありません（送信は SMTP）。IMAP はサーバ上で同期し、POP3 はダウンロードします。',
  'learning.concept.email.q3.a.why':
    'ICMP はメールではなく診断用です。安全な IMAP/POP3 は TLS で包まれます。',
  'learning.concept.email.q3.b.why':
    'ARP は LAN で IP→MAC を解決します。メール受信は TLS で保護します。',
  'learning.concept.ntp.q1.b.why': 'ホスト名解決は DNS です。NTP は機器の時計を同期します。',
  'learning.concept.ntp.q1.c.why':
    'アドレス割り当ては DHCP です。NTP は機器間で時計を同期し続けます。',
  'learning.concept.ntp.q2.a.why':
    'VLAN は L2 トラフィックを分けます。NTP は時刻源をストラタム（基準時計からの距離）で整理します。',
  'learning.concept.ntp.q2.c.why':
    '自律システムは BGP のルーティングドメインです。NTP はストラタムで時刻源を順位付けします。',
  'learning.concept.ntp.q3.a.why':
    '時刻はケーブル速度と無関係です。ログの相関、証明書の有効性、認証で重要になります。',
  'learning.concept.ntp.q3.b.why':
    'MTU はフレームサイズの上限で時刻と無関係です。正確な時計は証明書・ログ・TLS/Kerberos で重要です。',
  'learning.concept.snmp.q1.b.why':
    'パケットのルーティングはルータの仕事です。SNMP はネットワーク機器を監視・管理します。',
  'learning.concept.snmp.q1.c.why':
    'リンク暗号化は TLS/IPsec/MACsec です。SNMP は機器の監視・管理用です。',
  'learning.concept.snmp.q2.a.why':
    'ルーティングテーブルはルータにあります。SNMP は管理データを MIB ツリーの OID として公開します。',
  'learning.concept.snmp.q2.c.why':
    'MAC テーブルはスイッチの L2 構造です。SNMP は管理対象を MIB の OID として整理します。',
  'learning.concept.snmp.q3.a.why':
    'GET はマネージャが機器を問い合わせる操作です。機器が自発的に送る通知はトラップです。',
  'learning.concept.snmp.q3.b.why':
    'ACK は受領確認にすぎません。機器がイベント駆動で押し出すメッセージは SNMP トラップです。',
  'learning.concept.ipsec.q1.b.why':
    '名前解決は DNS です。IPsec は IP パケットを認証・暗号化し安全な VPN を構築します。',
  'learning.concept.ipsec.q1.c.why':
    'スイッチングは L2 のフレーム転送です。IPsec は IP パケットを認証・暗号化でエンドツーエンドに保護します。',
  'learning.concept.ipsec.q2.a.why':
    'AH は認証と完全性検査を行いますが暗号化はしません。ペイロードを暗号化するのは ESP です。',
  'learning.concept.ipsec.q2.c.why':
    'ARP は IP→MAC を解決し IPsec と無関係です。暗号化を担うのは ESP です。',
  'learning.concept.ipsec.q3.a.why':
    'IPsec は「ポート」を選んで暗号化しません。トンネルモードは元のパケット全体を包んで暗号化します。',
  'learning.concept.ipsec.q3.b.why':
    'トンネルモードはルーティングを止めません — 新しい IP ヘッダを付け、暗号化パケットがゲートウェイ間をルーティングされます。',
  'learning.concept.radius.q1.b.why':
    'ルーティングはネットワーク間でパケットを動かします。802.1X はポートベースのアクセス制御で、ポートを開く前に認証します。',
  'learning.concept.radius.q1.c.why':
    '名前解決は DNS です。802.1X は機器が認証するまでネットワークアクセスを遮ります。',
  'learning.concept.radius.q2.a.why':
    'RADIUS はルーティングプロトコルではありません。認証・認可・アカウンティングの AAA サーバプロトコルです。',
  'learning.concept.radius.q2.c.why':
    'トンネリングはトラフィックを運びます（L2TP/GRE）。RADIUS は AAA（認証・認可・アカウンティング）を扱います。',
  'learning.concept.radius.q3.a.why':
    'サプリカントは接続しようとするクライアントです。資格情報を中継するスイッチ/AP がオーセンティケータです。',
  'learning.concept.radius.q3.b.why':
    'DNS サーバは名前を解決します。資格情報を RADIUS サーバへ渡す機器がオーセンティケータです。',
  'learning.concept.vpn.q1.b.why':
    'VPN は通常わずかなオーバーヘッドを足すもので高速化ではありません。目的は信頼できない網上の安全な暗号化トンネルです。',
  'learning.concept.vpn.q1.c.why':
    '公開 IP の割り当ては VPN の役割ではありません。トラフィックを秘匿する暗号化・認証済みトンネルを作ります。',
  'learning.concept.vpn.q2.a.why':
    'どちらも暗号化します。本質的な違いは、サイト間はゲートウェイ経由で網全体を結び、リモートアクセスは 1 台のクライアントをつなぐ点です。',
  'learning.concept.vpn.q2.c.why':
    'リモートアクセスは Ethernet に限らず任意の IP 経路（多くはインターネット）で動きます。違いは網全体か単一クライアントかです。',
  'learning.concept.vpn.q3.a.why':
    'スプリットトンネルはトラフィックを遮断しません。選んだ宛先だけ VPN を通し、残りは直接送ります。',
  'learning.concept.vpn.q3.b.why':
    '二重暗号化ではありません。スプリットトンネルは一部のトラフィックだけ VPN を通し、残りはそのまま外へ出します。',
  'learning.concept.wireguard.q1.a.why':
    'WireGuard は TCP+TLS のオーバーヘッドを避けます。単一ポートの UDP 上で動き、軽量で NAT 親和的です。',
  'learning.concept.wireguard.q1.c.why':
    'ICMP は診断用です。WireGuard は単一ポートの UDP 上で動きます。',
  'learning.concept.wireguard.q2.a.why':
    'WireGuard はパスワードを使いません。各ピアは公開鍵で識別され、許可 IP の集合に結び付きます。',
  'learning.concept.wireguard.q2.b.why':
    'MAC はルータを越えないローカルな L2 アドレスです。WireGuard は各ピアの公開鍵を許可 IP に固定します。',
  'learning.concept.wireguard.q3.b.why':
    'WireGuard は常に暗号化されます。単純なのは小さなコードと固定の現代暗号によるもので、暗号化を省くからではありません。',
  'learning.concept.wireguard.q3.c.why':
    'WireGuard はクロスプラットフォームです。速さは小さなカーネル実装と暗号スイートのネゴシエーションの不在によります。',
  'learning.concept.l2tp.q1.a.why':
    'L2TP 単体に暗号化はありません — だから IPsec と組み合わせます。単体ではトンネルするだけです。',
  'learning.concept.l2tp.q1.c.why':
    'サブネット間のルーティングはルータ（L3）の仕事です。L2TP は独自の暗号化を持たないトンネリングプロトコルです。',
  'learning.concept.l2tp.q2.b.why':
    'L2TP は HTTP 専用ではありません。LAC と LNS の間で L2 の PPP フレームを IP 網越しにトンネルします。',
  'learning.concept.l2tp.q2.c.why':
    'BGP はルーティングテーブルを交換します。L2TP は L2 の PPP フレームを IP 上で運び、テーブルは運びません。',
  'learning.concept.l2tp.q3.a.why':
    'IPsec は速度ではなくセキュリティのオーバーヘッドを足します。L2TP に欠ける暗号化を補うため組み合わせます。',
  'learning.concept.l2tp.q3.b.why':
    '組み合わせは NAT ではなく機密性のためです — L2TP がトンネルを、IPsec が暗号化/認証を提供します。',
  'learning.concept.pppoe.q1.b.why':
    'ネットワーク間のルーティングは L3 のルータです。PPP は 1 本のポイントツーポイント・リンク上のリンク層カプセル化と認証です。',
  'learning.concept.pppoe.q1.c.why':
    'PPP はインターネット規模の IP を割り当てません。単一のポイントツーポイント・リンクをカプセル化し認証します。',
  'learning.concept.pppoe.q2.a.why':
    'PPPoE は暗号化しません。PPP セッションを Ethernet 内で運び、多数の加入者が 1 つのアクセス網を共有します。',
  'learning.concept.pppoe.q2.c.why':
    'PPPoE は IP アドレッシングを置き換えません。共有の DSL/Ethernet アクセスのため PPP を Ethernet フレームに収めます。',
  'learning.concept.pppoe.q3.a.why':
    'Discovery は暗号化しません。アクセス集約装置（AC）を発見・選択し、セッション ID を確立します。',
  'learning.concept.pppoe.q3.b.why':
    'IP の割り当ては後の PPP セッション（IPCP）で行われます。Discovery はアクセス集約装置（AC）を見つけセッション ID を得るだけです。',
  'learning.concept.mtu.q1.b.why':
    '最小ではなく最大です — 1 フレームでリンクが運べる最大のペイロードです。',
  'learning.concept.mtu.q1.c.why':
    'ルーティング指標は経路を順位付けします。MTU はリンクが許す最大フレームペイロードです。',
  'learning.concept.mtu.q2.a.why':
    'PMTUD は全ホストへ ping しません。DF を立てたパケットを送り ICMP「フラグメント必要」を読みます。',
  'learning.concept.mtu.q2.c.why':
    'DNS は名前を解決し経路サイズではありません。PMTUD は DF パケットと ICMP の応答で探ります。',
  'learning.concept.mtu.q3.a.why':
    'DF（フラグメント禁止）はフラグメント化を禁じます — ルータは破棄して代わりに ICMP メッセージを返します。',
  'learning.concept.mtu.q3.b.why':
    'MTU を超えれば黙って配送はできません。DF が立っているとルータは破棄し ICMP で通知します。',
  'learning.concept.gre.q1.b.why':
    'GRE は暗号化しません（必要なら IPsec と組み合わせます）。パケットを別の IP パケットでカプセル化します。',
  'learning.concept.gre.q1.c.why':
    'MAC スイッチングは L2 転送です。GRE はパケットを外側 IP パケットにカプセル化してトンネルします。',
  'learning.concept.gre.q2.a.why':
    'GRE 単体に暗号化はありません — だから GRE over IPsec があります。単体ではカプセル化のみです。',
  'learning.concept.gre.q2.c.why':
    'アドレス割り当ては DHCP です。GRE は暗号化なしでトラフィックをカプセル化しトンネルするだけです。',
  'learning.concept.gre.q3.a.why':
    'トンネルは網全体を結ぶもので 1 ホストにまとめません。アンダーレイ越しに直結して見えます。',
  'learning.concept.gre.q3.b.why':
    'トンネルの目的は到達性です — 2 つの網はアンダーレイ越しに直結して見えます。',
  'learning.concept.mpls.q1.b.why':
    'MPLS はブロードキャストしません。ホップごとの IP ルックアップの代わりに、定めた経路で短いラベルを交換します。',
  'learning.concept.mpls.q1.c.why':
    'ARP は IP→MAC を解決します。MPLS はラベルを交換して転送し、IP ルックアップを省きます。',
  'learning.concept.mpls.q2.a.why':
    'ブロードキャストドメインは L2 の概念です。MPLS 網を通る経路がラベルスイッチドパス（LSP）です。',
  'learning.concept.mpls.q2.c.why':
    'AS は BGP のルーティングドメインです。MPLS 内のラベル付き経路はラベルスイッチドパス（LSP）です。',
  'learning.concept.mpls.q3.a.why':
    'HTTP は L7 のアプリです。MPLS は低層に位置し、L2 と L3 の間（しばしばレイヤー2.5）です。',
  'learning.concept.mpls.q3.b.why':
    'MPLS はイーサネットのような L2 リンクの上に乗り、その下ではありません — L2 と L3 の間にあります。',
  'learning.concept.isis.q1.b.why':
    'ディスタンスベクタは RIP/EIGRP です。IS-IS は OSPF のようなリンクステート IGP で、ISP コアで一般的です。',
  'learning.concept.isis.q1.c.why':
    'IS-IS はアプリケーションプロトコルではありません。大規模コアで使われるリンクステートの IGP です。',
  'learning.concept.isis.q2.a.why':
    'OSPF 同様、IS-IS はホップ数ではなくリンクコストを使います。違いは IP の中ではなく L2 上で直接動く点です。',
  'learning.concept.isis.q2.c.why':
    'IS-IS は TCP を使いません — リンク層上で直接動きます（OSPF は IP の中で動く）。',
  'learning.concept.isis.q3.a.why':
    'AS パスは BGP のものです。OSPF も IS-IS も総リンクコストで ダイクストラ/SPF を実行します。',
  'learning.concept.isis.q3.b.why':
    'MAC アドレスは L2 転送です。これらリンクステート IGP は最小の総リンクコストで経路を選びます。',
  'learning.concept.eigrp.q1.b.why':
    'EIGRP は純粋なリンクステートではありません（それは OSPF/IS-IS）。DUAL を使う高度なディスタンスベクタです。',
  'learning.concept.eigrp.q1.c.why':
    'EIGRP はアプリではなくルーティングプロトコルです。DUAL アルゴリズムを使う高度なディスタンスベクタです。',
  'learning.concept.eigrp.q2.a.why':
    'フィージブルサクセサは暗号化ではなく事前計算済みのバックアップ経路です。即時の再収束を可能にします。',
  'learning.concept.eigrp.q2.c.why':
    'IP 割り当ては DHCP です。フィージブルサクセサはループのないバックアップで、再計算なしに EIGRP を再収束させます。',
  'learning.concept.eigrp.q3.a.why':
    'ホップ数のみは RIP です。EIGRP は帯域と遅延の複合指標を使います。',
  'learning.concept.eigrp.q3.b.why':
    'AS パスは BGP のものです。EIGRP の複合指標は帯域と遅延に基づきます。',
  'learning.concept.ndp.q1.b.why':
    'AS 間ルーティングは BGP です。NDP は ARP の仕事 — 近隣の IP を MAC に解決する役割を引き継ぎます。',
  'learning.concept.ndp.q1.c.why':
    'NDP は暗号化しません。ARP を置き換え、ICMPv6 メッセージで近隣の IP→MAC を解決します。',
  'learning.concept.ndp.q2.a.why':
    'SLAAC はランダムではありません。ホストはルータ広告（RA）のプレフィックスと自分のインターフェース識別子を組み合わせます。',
  'learning.concept.ndp.q2.c.why':
    'ホストはルータのアドレスをコピーしません。広告されたプレフィックスとインターフェース識別子から自分のアドレスを作ります。',
  'learning.concept.ndp.q3.a.why':
    'DAD は暗号化しません。近隣要請を送り、アドレスが未使用か確認します。',
  'learning.concept.ndp.q3.b.why':
    'DAD はアドレスを圧縮しません。仮アドレスをまず要請して一意性を検証します。',
  'learning.concept.qos.q1.b.why':
    'プリアンブルは受信側のクロック同期用です。DSCP の優先度は IP ヘッダの DS フィールドにあります。',
  'learning.concept.qos.q1.c.why':
    'TCP ペイロードはアプリデータです。DSCP は各ルータが読む IP ヘッダで優先度を示します。',
  'learning.concept.qos.q2.a.why':
    'アイドルなリンクでは優先順位を付けるものがありません。QoS は輻輳し遅延に敏感な通信があるときに効きます。',
  'learning.concept.qos.q2.c.why':
    'ホストが 1 台では競合を管理する必要がありません。QoS は輻輳したリンクで通信が競合するときに価値があります。',
  'learning.concept.qos.q3.a.why':
    'DSCP はセキュリティではなくスケジューリングの話です。ルータは優先キューイングなどのホップごとの動作を適用します。',
  'learning.concept.qos.q3.b.why':
    'マークされたパケットは破棄ではなく優先されます。ルータは優先キューイングなどのホップごとの動作を適用します。',
  'learning.concept.ecmp.q1.b.why':
    '経路が 1 本では分散するものがありません。ECMP は同じ最小コストの経路が複数あるときに使います。',
  'learning.concept.ecmp.q1.c.why':
    'リンク障害はフェイルオーバーの話です。ECMP は生きている等コスト経路に負荷を分散します。',
  'learning.concept.ecmp.q2.a.why':
    'パケットごとのランダムはフローを並べ替えてしまいます。ECMP は 5タプルをハッシュし各フローを 1 経路に固定します。',
  'learning.concept.ecmp.q2.c.why':
    '最小 IP を選ぶだけではありません。ECMP はフローの 5タプルをハッシュし一貫したネクストホップを選びます。',
  'learning.concept.ecmp.q3.a.why':
    'ECMP は暗号化しません。等コスト経路に負荷を分け、合計帯域を増やします。',
  'learning.concept.ecmp.q3.b.why':
    'ECMP は経路を減らすのではなく多く使います。利点は負荷分散と合計帯域の増加です。',
  'learning.concept.vrrp.q1.b.why':
    '名前解決は DNS です。VRRP は 1 つの仮想 IP の背後にある冗長なデフォルトゲートウェイをホストに与えます。',
  'learning.concept.vrrp.q1.c.why':
    'ループ防止は STP です。VRRP は共有の仮想 IP でデフォルトゲートウェイを冗長化します。',
  'learning.concept.vrrp.q2.a.why':
    '仮想 IP に応答するのは一度に 1 台 — マスタだけです。他はバックアップとして待機します。',
  'learning.concept.vrrp.q2.c.why':
    'DNS サーバは無関係です。仮想 IP は選出されたマスタが持ち、バックアップが控えます。',
  'learning.concept.vrrp.q3.a.why':
    'VRRP はサブネット数ではなくゲートウェイ冗長の話です。単一ゲートウェイの単一障害点を取り除きます。',
  'learning.concept.vrrp.q3.b.why':
    'DNS の速度は無関係です。VRRP はデフォルトゲートウェイが単一障害点になる問題を解決します。',
  'learning.concept.multicast.q1.b.why':
    '全員へ送るのはブロードキャストです（しかも越えられません）。マルチキャストは関心のある受信者だけを狙います。',
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
  'learning.concept.acl.q1.b.why':
    'ACL は暗号化しません。パケットのフィールドを順序付きの許可/拒否ルールと照合します。',
  'learning.concept.acl.q1.c.why':
    '圧縮は帯域節約でフィルタリングと無関係です。ACL はパケットフィールドの照合で許可/拒否します。',
  'learning.concept.acl.q2.a.why':
    'ステートフルは「常に遅い」わけではありません。本質は接続を追跡し、戻りの通信を自動許可する点です。',
  'learning.concept.acl.q2.c.why':
    'どちらもポートを見ます。ステートフルファイアウォールはさらに接続状態を追跡し応答を自動的に許可します。',
  'learning.concept.acl.q3.a.why':
    '「permit any any」は全許可で安全の逆です。安全な既定は、明示的に許可しない限り拒否です。',
  'learning.concept.acl.q3.b.why':
    'ルールなしは暗黙の許可や未定義動作になりがちです。安全な設計は明示的なデフォルト拒否です。',
  'learning.concept.tunneling.q1.b.why':
    '暗号化は別の追加機能（IPsec）です。トンネリング自体はパケットを新しい外側ヘッダで包むだけです。',
  'learning.concept.tunneling.q1.c.why':
    'トンネリングは圧縮しません。本来運べない網を越えられるよう、パケットをカプセル化します。',
  'learning.concept.tunneling.q2.a.why':
    '外側ヘッダは経路の間ずっと必要です。入口で付け、出口でだけ外します。',
  'learning.concept.tunneling.q2.c.why':
    '外側ヘッダを付けるのは送信側（入口）です。受信側（出口）がそれを外します。',
  'learning.concept.tunneling.q3.a.why':
    '速度は無関係です。外側ヘッダがバイトを消費するため、内側ペイロードはフラグメント化前の余地が減ります。',
  'learning.concept.tunneling.q3.b.why':
    '暗号化は任意で原因ではありません。余分な外側ヘッダ自体が MTU からバイトを消費します。',
  'learning.concept.sip.q1.a.why':
    '音声は SIP ではなく RTP で流れます。SIP は通話を確立・変更・終了する制御（シグナリング）です。',
  'learning.concept.sip.q1.c.why':
    'アドレス割り当ては DHCP です。SIP は通話の確立/切断を制御し、メディアは RTP に任せます。',
  'learning.concept.sip.q2.a.why':
    'SIP はメディアのサンプルを運びません。音声は RTP で別に流れ、SIP/SDP は交渉するだけです。',
  'learning.concept.sip.q2.b.why':
    '音声も映像も SIP には乗りません。どちらも RTP で流れ、SIP は SDP で交渉します。',
  'learning.concept.sip.q3.b.why':
    'SIP はバイナリのルーティングプロトコルではなく HTTP のようなテキストベースです。INVITE はメソッドとヘッダを持つリクエストです。',
  'learning.concept.sip.q3.c.why':
    'Ethernet フレームは L2 のバイナリフレーミングです。SIP はメソッドとステータスコードを持つ HTTP 風のテキストプロトコルです。',
  'learning.concept.rtp.q1.b.why':
    'ルーティングテーブルはルーティングプロトコルが交換します。RTP はリアルタイムメディアを主に UDP で運びます。',
  'learning.concept.rtp.q1.c.why':
    'メールは SMTP/IMAP です。RTP はリアルタイムの音声/映像を、シーケンス番号とタイムスタンプ付きで UDP 上に運びます。',
  'learning.concept.rtp.q2.a.why':
    'TCP も音声を運べますが、再送が遅すぎて役に立ちません。RTP は UDP の低遅延を選びます。',
  'learning.concept.rtp.q2.c.why':
    'UDP は暗号化されません（暗号化は SRTP）。RTP は確実さより適時性が勝るため UDP を使います。',
  'learning.concept.rtp.q3.a.why':
    'RTCP は暗号化ではありません（それは SRTP）。ジッタ・損失・往復時間などの品質フィードバックを運びます。',
  'learning.concept.rtp.q3.b.why':
    'RTCP はメディアを複製しません。送信側が適応できるよう統計（ジッタ・損失・往復時間）を報告します。',
  'learning.concept.stun.q1.a.why':
    '経路選択はルーティングの仕事です。STUN はホストに自分の公開（NAT 変換後の）IP とポートを教えます。',
  'learning.concept.stun.q1.b.why':
    '名前解決は DNS です。STUN はホストの NAT 変換後の公開アドレスを明らかにし、ピアが到達できるようにします。',
  'learning.concept.stun.q2.b.why':
    'DNS ルートサーバは名前を解決しメディアは運びません。直接経路が失敗すると TURN リレーが転送します。',
  'learning.concept.stun.q2.c.why':
    'BGP は AS 間をルーティングします。遮断する NAT 越しにメディアを中継するのは TURN の役割で BGP ではありません。',
  'learning.concept.stun.q3.a.why':
    '暗号化は SRTP/DTLS です。ICE は候補アドレスを集め、動く経路を見つけるため検査します。',
  'learning.concept.stun.q3.c.why':
    'ICE は番号を割り当てません。ホスト/STUN/TURN の候補を集め、検査して動く組を選びます。',
  'learning.concept.dnssec.q1.b.why':
    'DNSSEC は速度ではなく検証の手間を足します。レコードが本物か検証できるよう署名を付けます。',
  'learning.concept.dnssec.q1.c.why':
    'IP 割り当ては DHCP です。DNSSEC は DNS レコードに署名し、リゾルバが改ざんを検知できるようにします。',
  'learning.concept.dnssec.q2.a.why':
    'DNSSEC は暗号化ではなく認証します。問い合わせの秘匿は DoH/DoT が解く別問題です。',
  'learning.concept.dnssec.q2.c.why':
    'どのゾーンも暗号化しません。DNSSEC は完全性のため署名し、機密性は DoH/DoT が加えます。',
  'learning.concept.dnssec.q3.a.why':
    '無条件の信頼は目的を損ないます。DNSSEC は DS レコードでルートから下へ信頼の連鎖を築きます。',
  'learning.concept.dnssec.q3.b.why':
    'IP 許可リストは DNSSEC の仕組みではありません。信頼はルートから流れ、各ゾーンの鍵は親が署名します。',
  'learning.concept.ssh.name': 'SSH',
  'learning.concept.ssh.q1.prompt': 'SSH が提供するのは…',
  'learning.concept.ssh.q1.a': '暗号化されたリモートシェルとトンネル',
  'learning.concept.ssh.q1.b': '平文のファイル転送',
  'learning.concept.ssh.q1.c': 'IP アドレスの割り当て',
  'learning.concept.ssh.q1.why':
    'SSH は暗号化と認証でリモートログインや任意のトンネルを保護し、Telnet を置き換えます。',
  'learning.concept.ssh.q2.prompt': 'SSH のウェルノウンポートは？',
  'learning.concept.ssh.q2.a': '23',
  'learning.concept.ssh.q2.b': '22',
  'learning.concept.ssh.q2.c': '443',
  'learning.concept.ssh.q2.why': '22 が SSH、23 は安全でない Telnet、443 は HTTPS です。',
  'learning.concept.ssh.q3.prompt': 'パスワードより強い SSH 認証方式は…',
  'learning.concept.ssh.q3.a': 'MAC フィルタリング',
  'learning.concept.ssh.q3.b': 'VLAN タグ',
  'learning.concept.ssh.q3.c': '公開鍵認証',
  'learning.concept.ssh.q3.why':
    '鍵ペアは秘密を回線に流さず認証します。サーバはクライアントの公開鍵を信頼します。',
  'learning.concept.ftp.name': 'FTP',
  'learning.concept.ftp.q1.prompt': 'FTP が使うのは…',
  'learning.concept.ftp.q1.a': '制御用とデータ用の別々の接続',
  'learning.concept.ftp.q1.b': '単一の UDP データグラム',
  'learning.concept.ftp.q1.c': 'ICMP メッセージ',
  'learning.concept.ftp.q1.why':
    'FTP はコマンド用の制御チャネルを保ち、転送には別のデータ接続を開きます。',
  'learning.concept.ftp.q2.prompt': 'FTP の制御接続のポートは…',
  'learning.concept.ftp.q2.a': '80',
  'learning.concept.ftp.q2.b': '21',
  'learning.concept.ftp.q2.c': '53',
  'learning.concept.ftp.q2.why':
    'ポート 21 が FTP コマンドを運び、データは 20（アクティブ）か交渉したポート（パッシブ）を使います。',
  'learning.concept.ftp.q3.prompt': 'パッシブ FTP が導入された理由は…',
  'learning.concept.ftp.q3.a': 'データを暗号化するため',
  'learning.concept.ftp.q3.b': 'DNS を速くするため',
  'learning.concept.ftp.q3.c': 'クライアント側のファイアウォールや NAT を通すため',
  'learning.concept.ftp.q3.why':
    'パッシブモードではクライアントがデータ接続を開くため、アクティブモードの着信を塞ぐ NAT/ファイアウォール を通れます。',
  'learning.concept.smtp.name': 'SMTP',
  'learning.concept.smtp.q1.prompt': 'SMTP の用途は…',
  'learning.concept.smtp.q1.a': 'サーバ間でメールを送信・中継する',
  'learning.concept.smtp.q1.b': 'クライアントへメールを受信する',
  'learning.concept.smtp.q1.c': 'ホスト名を解決する',
  'learning.concept.smtp.q1.why':
    'SMTP はクライアント→サーバ、サーバ→サーバへメールを押し出します。受信は IMAP/POP3 です。',
  'learning.concept.smtp.q2.prompt': 'SMTP がよく使うポートは…',
  'learning.concept.smtp.q2.a': '110',
  'learning.concept.smtp.q2.b': '25（送信は 587）',
  'learning.concept.smtp.q2.c': '22',
  'learning.concept.smtp.q2.why':
    '25 はサーバ間 SMTP、587 は認証付きクライアント送信、110 は POP3 です。',
  'learning.concept.smtp.q3.prompt': 'ドメインのメール配送先を示す DNS レコードは？',
  'learning.concept.smtp.q3.a': 'A',
  'learning.concept.smtp.q3.b': 'CNAME',
  'learning.concept.smtp.q3.c': 'MX',
  'learning.concept.smtp.q3.why': 'MX レコードはドメインのメール交換ホストを示します。',
  'learning.concept.email.name': 'メール（IMAP/POP3）',
  'learning.concept.email.q1.prompt': 'IMAP と POP3 の用途は…',
  'learning.concept.email.q1.a': 'メールボックスサーバからメールを受信する',
  'learning.concept.email.q1.b': 'サーバ間でメールを送る',
  'learning.concept.email.q1.c': 'IP を割り当てる',
  'learning.concept.email.q1.why':
    'これらはメールをクライアントへ取り込みます。送信は SMTP の役割です。',
  'learning.concept.email.q2.prompt': 'IMAP と POP3 の主な違いは…',
  'learning.concept.email.q2.a': 'IMAP は暗号化不可',
  'learning.concept.email.q2.b':
    'IMAP はサーバに残し複数端末で同期、POP3 は基本ダウンロードして削除',
  'learning.concept.email.q2.c': 'POP3 は送信する',
  'learning.concept.email.q2.why':
    'IMAP はサーバ側・複数端末向け、POP3 は従来1 端末へダウンロードします。',
  'learning.concept.email.q3.prompt': 'セキュアな IMAP/POP3 が乗るのは…',
  'learning.concept.email.q3.a': 'ICMP',
  'learning.concept.email.q3.b': 'ARP',
  'learning.concept.email.q3.c': 'TLS',
  'learning.concept.email.q3.why': 'IMAPS/POP3S はセッションを TLS で包み機密性を確保します。',
  'learning.concept.ntp.name': 'NTP',
  'learning.concept.ntp.q1.prompt': 'NTP の用途は…',
  'learning.concept.ntp.q1.a': '機器間で時刻を同期する',
  'learning.concept.ntp.q1.b': 'ホスト名を解決する',
  'learning.concept.ntp.q1.c': 'アドレスを割り当てる',
  'learning.concept.ntp.q1.why': 'NTP は機器の時刻を基準時刻源に合わせ続けます。',
  'learning.concept.ntp.q2.prompt': 'NTP の時刻源の構成は…',
  'learning.concept.ntp.q2.a': 'VLAN',
  'learning.concept.ntp.q2.b': 'ストラタム（0=基準、1=サーバ…）',
  'learning.concept.ntp.q2.c': '自律システム',
  'learning.concept.ntp.q2.why':
    'ストラタム番号は基準時計からの距離で、小さいほど近く権威があります。',
  'learning.concept.ntp.q3.prompt': '正確な時刻が重要なのは…',
  'learning.concept.ntp.q3.a': '速いケーブル',
  'learning.concept.ntp.q3.b': '大きい MTU',
  'learning.concept.ntp.q3.c': 'ログ・証明書・時刻依存の認証（TLS/Kerberos）',
  'learning.concept.ntp.q3.why':
    '証明書の有効期間・ログ突合・時刻ベース認証は、時刻がずれると壊れます。',
  'learning.concept.snmp.name': 'SNMP',
  'learning.concept.snmp.q1.prompt': 'SNMP の用途は…',
  'learning.concept.snmp.q1.a': 'ネットワーク機器の監視と管理',
  'learning.concept.snmp.q1.b': 'パケットのルーティング',
  'learning.concept.snmp.q1.c': 'リンクの暗号化',
  'learning.concept.snmp.q1.why':
    'SNMP は機器の状態（カウンタ・ステータス）を読み書きし、ネットワーク管理に使います。',
  'learning.concept.snmp.q2.prompt': 'SNMP の管理データの構成は…',
  'learning.concept.snmp.q2.a': 'ルーティングテーブル',
  'learning.concept.snmp.q2.b': 'MIB ツリー内の OID',
  'learning.concept.snmp.q2.c': 'MAC テーブル',
  'learning.concept.snmp.q2.why': '各値は MIB 階層内のオブジェクト識別子（OID）を持ちます。',
  'learning.concept.snmp.q3.prompt': '機器がイベント時に自発送信する SNMP 通知は…',
  'learning.concept.snmp.q3.a': 'GET',
  'learning.concept.snmp.q3.b': 'ACK',
  'learning.concept.snmp.q3.c': 'トラップ',
  'learning.concept.snmp.q3.why':
    'トラップ/通知は機器発の警報で、マネージャ発の GET/SET ポーリングとは別です。',
  'learning.concept.ipsec.name': 'IPsec',
  'learning.concept.ipsec.q1.prompt': 'IPsec が提供するのは…',
  'learning.concept.ipsec.q1.a': '認証・暗号化された IP パケット（セキュア VPN）',
  'learning.concept.ipsec.q1.b': '名前解決',
  'learning.concept.ipsec.q1.c': 'スイッチング',
  'learning.concept.ipsec.q1.why':
    'IPsec は IP トラフィック自体を保護します — 機密性・完全性・認証 — 主に VPN で使われます。',
  'learning.concept.ipsec.q2.prompt': 'ペイロードを暗号化する IPsec プロトコルは？',
  'learning.concept.ipsec.q2.a': 'AH',
  'learning.concept.ipsec.q2.b': 'ESP',
  'learning.concept.ipsec.q2.c': 'ARP',
  'learning.concept.ipsec.q2.why':
    'ESP（カプセル化セキュリティペイロード）は暗号化と認証、AH は認証のみです。',
  'learning.concept.ipsec.q3.prompt': 'IPsec のトンネルモードは…',
  'learning.concept.ipsec.q3.a': 'ポートだけ暗号化',
  'learning.concept.ipsec.q3.b': 'ルーティングを無効化',
  'learning.concept.ipsec.q3.c': '元パケット全体を新パケットに包んで暗号化（ゲートウェイ間）',
  'learning.concept.ipsec.q3.why':
    'トンネルモードはパケット全体を包み（VPN ゲートウェイ間）、トランスポートモードはホスト間でペイロードを保護します。',
  'learning.concept.radius.name': 'RADIUS / 802.1X',
  'learning.concept.radius.q1.prompt': '802.1X が提供するのは…',
  'learning.concept.radius.q1.a': 'ポートベースのアクセス制御（接続前に認証）',
  'learning.concept.radius.q1.b': 'ルーティング',
  'learning.concept.radius.q1.c': '名前解決',
  'learning.concept.radius.q1.why':
    '802.1X はクライアントが認証するまでスイッチポートや Wi-Fi を遮断します。',
  'learning.concept.radius.q2.prompt': 'RADIUS は…',
  'learning.concept.radius.q2.a': 'ルーティングプロトコル',
  'learning.concept.radius.q2.b': 'AAA サーバプロトコル（認証・認可・アカウンティング）',
  'learning.concept.radius.q2.c': 'トンネリングプロトコル',
  'learning.concept.radius.q2.why': 'RADIUS は誰がアクセスできるかの判断とログを集中管理します。',
  'learning.concept.radius.q3.prompt': '802.1X で資格情報を中継するスイッチ/AP は…',
  'learning.concept.radius.q3.a': 'サプリカント',
  'learning.concept.radius.q3.b': 'DNS サーバ',
  'learning.concept.radius.q3.c': 'オーセンティケータ',
  'learning.concept.radius.q3.why':
    'サプリカント（クライアント）↔ オーセンティケータ（スイッチ/AP）↔ 認証サーバ（RADIUS）。',
  'learning.concept.isis.name': 'IS-IS',
  'learning.concept.isis.q1.prompt': 'IS-IS は…',
  'learning.concept.isis.q1.a': 'リンクステート IGP（OSPF 同様）、ISP コアで一般的',
  'learning.concept.isis.q1.b': 'ディスタンスベクタ型',
  'learning.concept.isis.q1.c': 'アプリケーションプロトコル',
  'learning.concept.isis.q1.why':
    'IS-IS はリンクステートをフラッディングし SPF を実行、大規模 ISP 網で広く使われます。',
  'learning.concept.isis.q2.prompt': 'OSPF と比べて IS-IS は…',
  'learning.concept.isis.q2.a': 'ホップ数を使う',
  'learning.concept.isis.q2.b': 'リンク層上で直接動く（IP 内ではない）',
  'learning.concept.isis.q2.c': 'TCP を必要とする',
  'learning.concept.isis.q2.why':
    'IS-IS の PDU は L2 上を直接流れます — IP 上で動く OSPF との設計上の違いです。',
  'learning.concept.isis.q3.prompt': 'OSPF と IS-IS の経路選択は…',
  'learning.concept.isis.q3.a': 'AS パス長',
  'learning.concept.isis.q3.b': 'MAC アドレス',
  'learning.concept.isis.q3.c': '総リンクコスト最小（ダイクストラ/SPF）',
  'learning.concept.isis.q3.why':
    'どちらもリンクステートで、SPF により最小コスト経路を計算します。',
  'learning.concept.eigrp.name': 'EIGRP',
  'learning.concept.eigrp.q1.prompt': 'EIGRP は…',
  'learning.concept.eigrp.q1.a': 'DUAL を用いる高度なディスタンスベクタ型',
  'learning.concept.eigrp.q1.b': '純粋なリンクステート型',
  'learning.concept.eigrp.q1.c': 'アプリケーションプロトコル',
  'learning.concept.eigrp.q1.why':
    'EIGRP は高度なディスタンスベクタ型で、DUAL アルゴリズムが高速でループのない収束を実現します。',
  'learning.concept.eigrp.q2.prompt': 'フィージブルサクセサにより EIGRP は…',
  'learning.concept.eigrp.q2.a': 'トラフィックを暗号化する',
  'learning.concept.eigrp.q2.b': '再計算なしで高速に再収束する',
  'learning.concept.eigrp.q2.c': 'IP を割り当てる',
  'learning.concept.eigrp.q2.why':
    '事前計算した予備経路により、主経路の障害時に即座に切り替えられます。',
  'learning.concept.eigrp.q3.prompt': 'EIGRP のメトリックの基礎は…',
  'learning.concept.eigrp.q3.a': 'ホップ数のみ',
  'learning.concept.eigrp.q3.b': 'AS パス',
  'learning.concept.eigrp.q3.c': '帯域と遅延（複合）',
  'learning.concept.eigrp.q3.why':
    'EIGRP は帯域と遅延（任意で負荷/信頼性）を複合します。RIP のホップ数とは異なります。',
  'learning.concept.lacp.name': 'LACP',
  'learning.concept.lacp.q1.prompt': 'LACP の用途は…',
  'learning.concept.lacp.q1.a': '複数リンクを1 つの論理リンクに束ねる',
  'learning.concept.lacp.q1.b': 'ループを防ぐ',
  'learning.concept.lacp.q1.c': 'VLAN を割り当てる',
  'learning.concept.lacp.q1.why':
    'LACP はリンクアグリゲーショングループを交渉し、帯域と冗長性のためにリンクを束ねます。',
  'learning.concept.lacp.q2.prompt': '束ねたポートチャネルが得るのは…',
  'learning.concept.lacp.q2.a': '新しい IP サブネット',
  'learning.concept.lacp.q2.b': '帯域増加とリンク冗長性',
  'learning.concept.lacp.q2.c': '暗号化',
  'learning.concept.lacp.q2.why':
    'トラフィックはメンバリンクにハッシュ分散され、1 本が落ちても他が継続します。',
  'learning.concept.lacp.q3.prompt': 'STP は正しい LACP 束を…',
  'learning.concept.lacp.q3.a': 'ブロックすべき複数ループ',
  'learning.concept.lacp.q3.b': 'ルータ',
  'learning.concept.lacp.q3.c': '単一の論理リンク（ループとしてブロックしない）',
  'learning.concept.lacp.q3.why':
    '束は STP には1 リンクに見えるため、冗長メンバをブロックしません。',
  'learning.concept.lldp.name': 'LLDP',
  'learning.concept.lldp.q1.prompt': 'LLDP により機器は…',
  'learning.concept.lldp.q1.a': '直結の隣接機器とその能力を発見する',
  'learning.concept.lldp.q1.b': 'サブネット間をルーティングする',
  'learning.concept.lldp.q1.c': 'フレームを暗号化する',
  'learning.concept.lldp.q1.why':
    '機器は識別子・ポート・能力を広告し、隣接が局所トポロジを学びます（CDP は Cisco 版）。',
  'learning.concept.lldp.q2.prompt': 'LLDP が動作するのは…',
  'learning.concept.lldp.q2.a': 'インターネット全体',
  'learning.concept.lldp.q2.b': 'リンク単位・単一セグメント内（ルーティングされない）',
  'learning.concept.lldp.q2.c': 'TCP 上',
  'learning.concept.lldp.q2.why':
    'LLDP フレームはリンクローカルで、スイッチやルータに転送されません。',
  'learning.concept.lldp.q3.prompt': 'LLDP がよく使われるのは…',
  'learning.concept.lldp.q3.a': 'IP アドレス割り当て',
  'learning.concept.lldp.q3.b': '経路選択',
  'learning.concept.lldp.q3.c': '物理トポロジ把握や VoIP/PoE 設定の補助',
  'learning.concept.lldp.q3.why':
    'NMS は LLDP から配線図を作り、電話が音声 VLAN や PoE 情報を学ぶのにも役立ちます。',
  'learning.concept.tunneling.name': 'トンネリングとカプセル化',
  'learning.concept.tunneling.q1.prompt': 'トンネリング（カプセル化）の仕組みは…',
  'learning.concept.tunneling.q1.a':
    '元のパケットを新しい外側ヘッダで包み、本来そのままでは運べないネットワークを越えられるようにする',
  'learning.concept.tunneling.q1.b': 'すべてのパケットを端から端まで暗号化する',
  'learning.concept.tunneling.q1.c': 'ペイロードを圧縮して帯域を節約する',
  'learning.concept.tunneling.q1.why':
    'トンネルは元パケットの外側にヘッダ（GRE/IP、VXLAN/UDP、MPLS など）を付け、内側のパケットはペイロードとして中継網を通ります。',
  'learning.concept.tunneling.q2.prompt': 'トンネルの両端では…',
  'learning.concept.tunneling.q2.a': '両端ともすぐに外側ヘッダを捨てる',
  'learning.concept.tunneling.q2.b':
    '入口でカプセル化（外側ヘッダを付与）し、出口でデカプセル化（外側を剥がす）して内側パケットを転送する',
  'learning.concept.tunneling.q2.c': '受信側だけがヘッダを付ける',
  'learning.concept.tunneling.q2.why':
    'カプセル化はトンネル入口で、デカプセル化は出口で行われ、出口は復元した内側パケットを通常どおりルーティングします。',
  'learning.concept.tunneling.q3.prompt': 'トンネリングで実効 MTU が下がるのはなぜ？',
  'learning.concept.tunneling.q3.a': 'ネットワークが遅くなるから',
  'learning.concept.tunneling.q3.b': '内側パケットが暗号化されるから',
  'learning.concept.tunneling.q3.c':
    '外側ヘッダの分だけバイトを消費するため、内側ペイロードを小さくしないとフラグメント化や破棄が起きる',
  'learning.concept.tunneling.q3.why':
    '外側ヘッダはオーバーヘッドです。内側＋外側が経路 MTU を超え DF が立つと破棄されるため、MSS クランプやトンネル MTU の引き下げを行います。',
  'learning.concept.vpn.name': 'VPN',
  'learning.concept.vpn.q1.prompt': 'VPN の主な目的は…',
  'learning.concept.vpn.q1.a':
    '信頼できないネットワーク越しに暗号化トンネルを作り、通信を秘匿・認証する',
  'learning.concept.vpn.q1.b': 'インターネット回線を高速化する',
  'learning.concept.vpn.q1.c': 'ホストにグローバル IP を割り当てる',
  'learning.concept.vpn.q1.why':
    'VPN は通信をカプセル化して暗号化し、公衆網をあたかも専用線のように越えられるようにします。',
  'learning.concept.vpn.q2.prompt': 'サイト間 VPN とリモートアクセス VPN の違いは…',
  'learning.concept.vpn.q2.a': 'サイト間は暗号化が不要',
  'learning.concept.vpn.q2.b':
    'サイト間はゲートウェイ同士でネットワーク全体を接続し、リモートアクセスは 1 台のクライアント端末を社内網に接続する',
  'learning.concept.vpn.q2.c': 'リモートアクセスは Ethernet 上でしか動かない',
  'learning.concept.vpn.q2.why':
    'サイト間はゲートウェイが 2 つのサブネット間をトンネルし、リモートアクセス（クライアント VPN）は 1 ユーザ端末を社内網に参加させます。',
  'learning.concept.vpn.q3.prompt': 'スプリットトンネルとは…',
  'learning.concept.vpn.q3.a': 'すべての通信が遮断される',
  'learning.concept.vpn.q3.b': 'VPN が二重に暗号化する',
  'learning.concept.vpn.q3.c':
    '一部の通信（例: 社内サブネット）だけ VPN を通し、残りは直接インターネットへ出す',
  'learning.concept.vpn.q3.why':
    'スプリットトンネルは選んだ宛先だけ VPN 経由にします。負荷は減りますが、フルトンネルより露出が広がります。',
  'learning.concept.wireguard.name': 'WireGuard',
  'learning.concept.wireguard.q1.prompt': 'WireGuard が動作するトランスポートは…',
  'learning.concept.wireguard.q1.a': 'TCP（TLS ハンドシェイク付き）',
  'learning.concept.wireguard.q1.b': '単一ポートの UDP — 軽量で NAT 越えしやすい',
  'learning.concept.wireguard.q1.c': 'ICMP',
  'learning.concept.wireguard.q1.why':
    'WireGuard は UDP プロトコルで、1 ポートで済むため高速かつ NAT・ファイアウォール越えが容易です。',
  'learning.concept.wireguard.q2.prompt': 'WireGuard がピアを識別する方法は…',
  'learning.concept.wireguard.q2.a': 'ユーザ名とパスワード',
  'learning.concept.wireguard.q2.b': 'MAC アドレス',
  'learning.concept.wireguard.q2.c': '公開鍵（許可 IP のセットに紐づく）',
  'learning.concept.wireguard.q2.why':
    '各ピアは静的な鍵ペアを持ち、公開鍵と AllowedIPs が「どの送信元を誰が送れるか」を定めます（クリプトキー・ルーティング）。',
  'learning.concept.wireguard.q3.prompt': 'WireGuard が IPsec より単純で高速とされる理由は…',
  'learning.concept.wireguard.q3.a':
    'コードベースが小さく、暗号方式が固定（ネゴシエーション不要）で、カーネル内で動く',
  'learning.concept.wireguard.q3.b': '暗号化を一切行わない',
  'learning.concept.wireguard.q3.c': '1 つの OS でしか動かない',
  'learning.concept.wireguard.q3.why':
    '暗号スイートのネゴシエーションがなく（最新の 1 セット）、小さく監査しやすいコードとカーネル内データパスで低オーバーヘッドです。',
  'learning.concept.l2tp.name': 'L2TP',
  'learning.concept.l2tp.q1.prompt': 'L2TP 単体が提供するのは…',
  'learning.concept.l2tp.q1.a': '全通信の強力な暗号化',
  'learning.concept.l2tp.q1.b': '暗号化なし — トンネリングのみのプロトコル',
  'learning.concept.l2tp.q1.c': 'サブネット間のルーティング',
  'learning.concept.l2tp.q1.why':
    'L2TP は通信をカプセル化しますが秘匿性は提供しないため、通常 IPsec と組み合わせます（L2TP/IPsec）。',
  'learning.concept.l2tp.q2.prompt': 'L2TP がトンネルするのは…',
  'learning.concept.l2tp.q2.a': 'IP 網越しの L2（PPP）フレーム（LAC と LNS の間）',
  'learning.concept.l2tp.q2.b': 'HTTP リクエストだけ',
  'learning.concept.l2tp.q2.c': 'BGP のルーティングテーブル',
  'learning.concept.l2tp.q2.why':
    'L2TP はアクセス集約装置（LAC）とネットワークサーバ（LNS）の間で PPP セッションを IP 上で運びます。',
  'learning.concept.l2tp.q3.prompt': 'L2TP が IPsec とよく併用されるのは…',
  'learning.concept.l2tp.q3.a': 'IPsec が速くするから',
  'learning.concept.l2tp.q3.b': 'L2TP が NAT を一切越えられないから',
  'learning.concept.l2tp.q3.c':
    'L2TP がトンネル／カプセル化を担い、IPsec が暗号化と認証を加えるから',
  'learning.concept.l2tp.q3.why':
    'L2TP/IPsec は定番の組み合わせで、L2TP がトンネル、IPsec（ESP）が秘匿性と完全性を担います。',
  'learning.concept.pppoe.name': 'PPP / PPPoE',
  'learning.concept.pppoe.q1.prompt': 'PPP（Point-to-Point Protocol）が提供するのは…',
  'learning.concept.pppoe.q1.a':
    '1 本のポイントツーポイント・リンク上での L2 カプセル化と認証（PAP/CHAP）',
  'learning.concept.pppoe.q1.b': '多数のネットワーク間のルーティング',
  'learning.concept.pppoe.q1.c': 'インターネット全体へのグローバル IP 割り当て',
  'learning.concept.pppoe.q1.why':
    'PPP は 1 本のリンク上で通信をフレーム化し、相手の認証やアドレスのネゴシエーション（IPCP）を行えます。',
  'learning.concept.pppoe.q2.prompt': 'PPPoE が PPP に加える能力は…',
  'learning.concept.pppoe.q2.a': '全パケットの暗号化',
  'learning.concept.pppoe.q2.b':
    'PPP セッションを Ethernet フレーム内で運び、多数の加入者が 1 つの Ethernet/DSL アクセス網を共有できるようにする',
  'learning.concept.pppoe.q2.c': 'IP アドレッシングの置き換え',
  'learning.concept.pppoe.q2.why':
    'PPPoE（PPP over Ethernet）は共有 Ethernet アクセス網上で加入者ごとの PPP セッションを実行します（DSL で一般的）。',
  'learning.concept.pppoe.q3.prompt': 'PPPoE の Discovery 段階（PADI/PADO/PADR/PADS）は…',
  'learning.concept.pppoe.q3.a': 'セッション鍵を暗号化する',
  'learning.concept.pppoe.q3.b': '顧客の IP アドレスを割り当てる',
  'learning.concept.pppoe.q3.c':
    'アクセス集約装置（AC）を発見・選択し、PPP セッション開始前にセッション ID を確立する',
  'learning.concept.pppoe.q3.why':
    'Discovery（PADI→PADO→PADR→PADS）が AC を選びセッション ID を割り当て、その上で PPP セッション段階が動きます。',
  'learning.concept.ndp.name': 'NDP / SLAAC（IPv6）',
  'learning.concept.ndp.q1.prompt': 'IPv6 で NDP は、IPv4 が何のために使っていた役割を引き継ぐ？',
  'learning.concept.ndp.q1.a':
    'ARP — 近隣の IP をリンク層（MAC）アドレスに解決する（ICMPv6 の近隣要請/近隣広告を使う）',
  'learning.concept.ndp.q1.b': '自律システム間のルーティング',
  'learning.concept.ndp.q1.c': '通信の暗号化',
  'learning.concept.ndp.q1.why':
    'NDP は ICMPv6 上で動きます。近隣要請/近隣広告が ARP を、ルータ要請/ルータ広告がルータ発見を担います。',
  'learning.concept.ndp.q2.prompt': 'SLAAC はどうやって DHCP サーバなしでアドレスを得る？',
  'learning.concept.ndp.q2.a': 'ランダムにアドレスを推測する',
  'learning.concept.ndp.q2.b':
    'ルータ広告がプレフィックスを配り、ホストはそのプレフィックス＋インターフェース識別子で自分のアドレスを作る',
  'learning.concept.ndp.q2.c': 'ルータのアドレスをコピーする',
  'learning.concept.ndp.q2.why':
    'ステートレス・アドレス自動設定：RA が /64 プレフィックスを運び、ホストがインターフェース識別子（EUI-64 やランダム）を付けてグローバルアドレスを作ります。',
  'learning.concept.ndp.q3.prompt': '重複アドレス検出（DAD）とは？',
  'learning.concept.ndp.q3.a': 'アドレスを暗号化する仕組み',
  'learning.concept.ndp.q3.b': 'アドレスを圧縮する方法',
  'learning.concept.ndp.q3.c':
    'アドレスを使う前に、そのアドレス宛の近隣要請を送り、他に使っている者がいないか確認する',
  'learning.concept.ndp.q3.why':
    'DAD はアドレス衝突を防ぎます。仮アドレスを近隣要請（NS）で検証し、応答が返れば既に使用中と判断します。',
  'learning.concept.sip.name': 'SIP（VoIP シグナリング）',
  'learning.concept.sip.q1.prompt': 'SIP が担うのは？',
  'learning.concept.sip.q1.a': '実際の音声データの運搬',
  'learning.concept.sip.q1.b':
    'リアルタイムセッション（通話）の確立・変更・切断 — メディアではなくシグナリング',
  'learning.concept.sip.q1.c': 'IP アドレスの割り当て',
  'learning.concept.sip.q1.why':
    'SIP はシグナリングプロトコルで、ユーザを探しセッションを交渉します。メディアは別ストリームで流れます。',
  'learning.concept.sip.q2.prompt': '音声・映像そのものは SIP の中を流れる？',
  'learning.concept.sip.q2.a': 'はい、SIP が音声サンプルを運ぶ',
  'learning.concept.sip.q2.b': '映像だけ運ぶ（音声は運ばない）',
  'learning.concept.sip.q2.c':
    'いいえ — メディアは別途（通常 RTP で）流れる。SIP は（多くは SDP で）それを交渉するだけ',
  'learning.concept.sip.q2.why':
    'SIP は SDP を運んでコーデックやポートを合意し、その後メディア（RTP）はエンドポイント間を直接、シグナリングとは別に流れます。',
  'learning.concept.sip.q3.prompt': 'INVITE のような SIP リクエストが最も似ているのは…',
  'learning.concept.sip.q3.a':
    'HTTP — メソッド・ヘッダ・ステータスコードを持つテキストベースの要求/応答',
  'learning.concept.sip.q3.b': 'バイナリのルーティングプロトコル',
  'learning.concept.sip.q3.c': 'Ethernet フレーム',
  'learning.concept.sip.q3.why':
    'SIP は HTTP/SMTP を手本にしており、読みやすいメソッド（INVITE、BYE）や応答（200 OK、404）で Web 開発者に馴染みやすい設計です。',
  'learning.concept.rtp.name': 'RTP / RTCP',
  'learning.concept.rtp.q1.prompt': 'RTP は何を、どのトランスポートで運ぶ？',
  'learning.concept.rtp.q1.a':
    'リアルタイムの音声/映像メディアを、通常 UDP 上で、シーケンス番号とタイムスタンプ付きで運ぶ',
  'learning.concept.rtp.q1.b': 'ルーティングテーブルを TCP で',
  'learning.concept.rtp.q1.c': 'メールを TLS で',
  'learning.concept.rtp.q1.why':
    'RTP はシーケンス番号とタイムスタンプを付け、受信側が並べ替え・損失検出・正しいタイミングでの再生をできるようにします。',
  'learning.concept.rtp.q2.prompt': 'RTP が TCP ではなく UDP を使うことが多いのはなぜ？',
  'learning.concept.rtp.q2.a': 'TCP は音声を運べないから',
  'learning.concept.rtp.q2.b':
    '信頼性より低遅延が重要だから — 遅れて再送された 1 パケットは無価値で、損失は許容/補間される',
  'learning.concept.rtp.q2.c': 'UDP は暗号化されているから',
  'learning.concept.rtp.q2.why':
    'ライブメディアでは遅すぎるパケットは再生できないため、TCP の再送/順序付けは有害な遅延になります。RTP は代わりに損失を補間します。',
  'learning.concept.rtp.q3.prompt': 'RTP ストリームに加えて RTCP が提供するのは？',
  'learning.concept.rtp.q3.a': 'より強い暗号化',
  'learning.concept.rtp.q3.b': 'メディアのバックアップコピー',
  'learning.concept.rtp.q3.c':
    '制御・品質フィードバック（ジッタ、損失、往復時間）を提供し、送信側が適応できるようにする',
  'learning.concept.rtp.q3.why':
    'RTCP は受信品質を定期的に報告し、エンドポイントがビットレート調整や問題診断をできるようにします（RTP のデータに対する制御）。',
  'learning.concept.stun.name': 'STUN / TURN / ICE',
  'learning.concept.stun.q1.prompt': 'NAT 配下のホストが STUN で分かるのは？',
  'learning.concept.stun.q1.a': 'サーバへの最速経路',
  'learning.concept.stun.q1.b': 'ピアの DNS 名',
  'learning.concept.stun.q1.c':
    '自分の公開（NAT 変換後）IP アドレスとポート。これで NAT 越しにピアから到達できる',
  'learning.concept.stun.q1.why':
    'STUN サーバは見えた送信元 IP:ポートを返し、NAT が作った公開マッピングを明らかにします — ホールパンチングの基礎です。',
  'learning.concept.stun.q2.prompt':
    '直接接続が失敗したとき（例: 対称型 NAT）、メディアを運ぶのは？',
  'learning.concept.stun.q2.a': 'TURN — リレーサーバが両ピア間のトラフィックを中継する',
  'learning.concept.stun.q2.b': 'DNS ルートサーバ',
  'learning.concept.stun.q2.c': 'BGP',
  'learning.concept.stun.q2.why':
    'TURN はフォールバックです。ピア同士が直接届かないとき、リレーが双方のパケットを転送します — 確実ですがコストは高め。',
  'learning.concept.stun.q3.prompt': 'ICE の役割は？',
  'learning.concept.stun.q3.a': '通話を暗号化する',
  'learning.concept.stun.q3.b':
    '候補アドレス（ホスト、STUN 反射、TURN リレー）を集め、接続性チェックで動作するペアを選ぶ',
  'learning.concept.stun.q3.c': '電話番号を割り当てる',
  'learning.concept.stun.q3.why':
    'ICE は STUN と TURN を統括し、両端から候補を集めて検査し、実際に動く最良の経路を見つけます。',
  'learning.concept.dnssec.name': 'DNSSEC',
  'learning.concept.dnssec.q1.prompt': 'DNSSEC が DNS に加えるのは？',
  'learning.concept.dnssec.q1.a': 'リゾルバがレコードの真正性と改ざんのなさを検証できる暗号署名',
  'learning.concept.dnssec.q1.b': 'より速い名前解決',
  'learning.concept.dnssec.q1.c': '自動 IP 割り当て',
  'learning.concept.dnssec.q1.why':
    'DNSSEC はゾーン鍵（DNSKEY）でレコードに署名（RRSIG）し、改ざんや偽造応答（キャッシュ汚染）を検出できるようにします。',
  'learning.concept.dnssec.q2.prompt': 'DNSSEC は DNS 問い合わせを暗号化する？',
  'learning.concept.dnssec.q2.a': 'はい、完全に端から端まで',
  'learning.concept.dnssec.q2.b':
    'いいえ — 完全性のために応答を認証する。機密性は別問題（DoH/DoT が担う）',
  'learning.concept.dnssec.q2.c': 'ルートゾーンだけ',
  'learning.concept.dnssec.q2.why':
    'DNSSEC は応答の真正性を証明しますが平文で送られます。問い合わせの暗号化は DNS over HTTPS/TLS が担います。',
  'learning.concept.dnssec.q3.prompt': 'DNSSEC で信頼はどう確立される？',
  'learning.concept.dnssec.q3.a': 'すべてのリゾルバがすべてのゾーンを既定で信頼する',
  'learning.concept.dnssec.q3.b': 'IP 許可リストで',
  'learning.concept.dnssec.q3.c':
    'ルートから下への信頼の連鎖：各ゾーンの鍵を親が DS レコードで保証する',
  'learning.concept.dnssec.q3.why':
    '親ゾーンが子の鍵をハッシュした DS レコードを公開するため、検証は root→TLD→ドメインと辿り、信頼されたルート鍵に錨を下ろします。',
  'learning.concept.review.title': '復習',
  'learning.concept.review.start': '弱点を復習（{{count}}）',
  'learning.concept.review.mastered': '{{mastered}} / {{total}} 習得',
  'learning.concept.review.empty':
    'まず問題に答えてください — 弱点がここに集まり、間隔をあけて復習できます。',
  'learning.concept.review.deckProgress': '{{mastered}}/{{total}}',
  'learning.concept.review.due': '復習の期限（{{count}}）',
} as const;
