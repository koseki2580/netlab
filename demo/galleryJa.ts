/**
 * Japanese for the gallery's own index: what each category is called and what
 * each lesson offers. The lessons' interiors are still English; this is the
 * layer a learner reads before choosing one, so it is the layer that decides
 * whether they can choose at all.
 *
 * Keyed by the same ids and paths the gallery uses, so a lesson that gains a
 * translation needs no change in `Gallery.tsx`, and one without a translation
 * falls back to its English text rather than disappearing.
 */
export const CATEGORY_LABELS_JA: Readonly<Record<string, string>> = {
  featured: 'ここから始める',
  basic: '基本のかたち',
  routing: 'ルーティング',
  areas: 'ネットワークの中身',
  services: 'サービス',
  simulation: 'シミュレーション',
  editor: '編集ツール',
  integration: '組み込み',
  comprehensive: '総合',
  assessments: '力だめし',
};

export interface DemoCopyJa {
  readonly title: string;
  readonly desc: string;
}

export const DEMO_COPY_JA: Readonly<Record<string, DemoCopyJa>> = {
  '/learning/subnetting': {
    title: 'サブネットの練習',
    desc: 'ネットワークアドレス、ブロードキャスト、マスク、ホスト数、CIDR を繰り返し練習します。答えるとその場で理由つきの解説が出ます。',
  },
  '/learning/protocols': {
    title: 'プロトコルの理解度チェック',
    desc: 'まず土台（階層モデル、アドレス、ポート）から。そのあと各層の42のプロトコル（スイッチング、OSPF/BGP などのルーティング、TCP/UDP、HTTP など）を四択で確認します。',
  },
  '/basic/minimal': {
    title: '最小構成',
    desc: '2台を直接つないだだけの、いちばん簡単な構成です。',
  },
  '/basic/three-tier': {
    title: '3階層のLAN',
    desc: 'クライアント → スイッチ → サーバ。ポートと MAC アドレスの設定を伴う L2 スイッチングを見ます。',
  },
  '/basic/star': {
    title: 'スター型',
    desc: '1台のスイッチを中心に、4台のクライアントと1台のサーバをつないだ構成です。',
  },
  '/learning/routing-decision': {
    title: 'ルーティング判断の練習',
    desc: '宛先と経路表を見て次の転送先を選ぶ、最長一致（ロンゲストマッチ）の練習です。',
  },
  '/learning/visual-routing': {
    title: 'ルーティング判断 — ネットワーク上で',
    desc: '同じ最長一致の練習を、実際の図の上で次のルータをクリックして答えます。',
  },
  '/learning/packet-journey': {
    title: 'パケットの旅',
    desc: '本物のパケットが次にどこへ行くかを1ホップずつ予想します。エンジンが採点し、判断の理由を説明します。',
  },
  '/learning/resilience': {
    title: '障害への強さを試す',
    desc: 'リンクやルータを壊して、その影響を予想します。何が迂回して何が落ちるかをエンジンが示します。',
  },
  '/routing/client-server': {
    title: 'クライアントとサーバ',
    desc: 'プライベート／パブリックの区画、静的経路を持つルータ、パケットの記録まで一通り揃った構成です。',
  },
  '/routing/multi-hop': {
    title: '複数ホップ',
    desc: '3つのサブネットにまたがり、2台のルータを越えてサーバへ届きます。',
  },
  '/routing/dynamic': {
    title: '動的ルーティング',
    desc: 'RIP・OSPF・BGP を切り替えて、ホップ数・SPF コスト・ポリシーによる経路選択の違いを比べます。',
  },
  '/routing/ospf-convergence': {
    title: 'OSPF の収束',
    desc: 'R1 がコストの低い経路を選ぶ様子を見てから、主経路のリンクを落として、計算し直された経路で再送します。',
  },
  '/networking/arp': {
    title: 'ARP の基本',
    desc: '最初のパケットを送り、ARP の要求と応答を確かめ、送信側のキャッシュが埋まっていく様子を見ます。',
  },
  '/networking/vlan': {
    title: 'VLAN による分離',
    desc: '同じ VLAN 内のスイッチングと、ルータを介した VLAN 間ルーティングを比べます。トランクを切って分離も確かめます。',
  },
  '/networking/stp': {
    title: 'スパニングツリー',
    desc: '3台のスイッチがルートブリッジを選び、余分なポートを1つ閉じ、B→C の通信がルート経由で迂回する様子を見ます。',
  },
  '/networking/mtu-fragmentation': {
    title: 'MTU と分割',
    desc: 'トンネルの MTU を小さくして、IPv4 が出口で分割される様子や、DF ビットが立っているときに ICMP が返る様子を見ます。',
  },
  '/networking/link-qos': {
    title: 'リンクごとの QoS',
    desc: '1本のリンクに帯域・伝搬遅延・一定条件の損失・有限のキューを設定して、その影響を見ます。',
  },
  '/networking/dscp': {
    title: 'DSCP による優先制御',
    desc: 'EF とベストエフォートのパケットを DRR のクラスに振り分け、帯域制限のかかったリンクで比べます。',
  },
  '/networking/ecmp': {
    title: 'ECMP（等コスト複数経路）',
    desc: '同じコストの2経路にフローをハッシュで振り分け、どのフローがどちらを通ったかを確認します。',
  },
  '/networking/ipv6': {
    title: 'IPv6 デュアルスタック',
    desc: 'デュアルスタックのルータ越しに ICMPv6 の echo を送り、v4 と v6 の経路表を見比べます。',
  },
  '/networking/ipv6-routing': {
    title: 'IPv6 のルーティング',
    desc: 'OSPFv3 の ECMP と、MP-BGP による IPv6 ユニキャスト経路の交換を比べます。',
  },
  '/networking/dhcpv6': {
    title: 'DHCPv6 と SLAAC',
    desc: 'ルータ広告の M／O フラグを切り替えて、DHCPv6 と SLAAC でアドレスの決まり方がどう変わるかを見ます。',
  },
  '/networking/ha': {
    title: 'ゲートウェイの冗長化とリンク束ね',
    desc: '出口のゲートウェイと LACP のメンバを落としても、VRRP とポートチャネルの振り分けが一定に保たれることを確かめます。',
  },
  '/networking/wireless': {
    title: '無線 LAN（802.11）',
    desc: '電波強度から決まる損失、アソシエーション、WPA2 の4ウェイハンドシェイク、隠れ端末の衝突を見ます。',
  },
  '/networking/tunneling/gre': {
    title: 'GRE トンネル',
    desc: 'IPv4 の上で内側の IP パケットを GRE で包み、トンネルキーの有無による違いを見ます。',
  },
  '/networking/tunneling/mpls-l3vpn': {
    title: 'MPLS L3VPN',
    desc: 'LDP のラベル割り当て、VPNv4 経路の取り込み、2段ラベルの構造を確かめます。',
  },
  '/networking/tunneling/vxlan-evpn': {
    title: 'VXLAN EVPN',
    desc: 'UDP/4789 によるカプセル化、EVPN の Type-2／Type-5 学習、ARP 抑止の動きを見ます。',
  },
  '/networking/observability': {
    title: 'フローの可視化',
    desc: '転送されたフローごとに、ルータの NetFlow とスイッチの sFlow サンプルを確認します。',
  },
  '/networking/udp': {
    title: 'UDP のデータグラム',
    desc: 'ハンドシェイクなしで UDP を1つ送ります。ポートやペイロードを変えたり、大きなデータで分割を起こしたりできます。',
  },
  '/networking/http': {
    title: 'HTTP/1.1',
    desc: 'TCP の上で GET と POST を送り、要求と応答の流れを Connection: close の挙動とあわせて確認します。',
  },
  '/networking/https': {
    title: 'HTTPS（TLS 1.3）',
    desc: 'HTTP のデータが流れる前に行われる TLS 1.3 のハンドシェイクを、順を追って確認します。',
  },
  '/networking/http2': {
    title: 'HTTP/2 の多重化',
    desc: '複数のストリームが交互に流れる様子と、TCP 側で起きる先頭ブロッキングを見ます。',
  },
  '/networking/http3': {
    title: 'HTTP/3（QUIC）',
    desc: 'ストリームごとに損失を起こして、QUIC のストリーム独立性と HTTP/3 のフレームの流れを見ます。',
  },
  '/areas/dmz': {
    title: 'DMZ による区画分け',
    desc: 'プライベート → DMZ → パブリックの3区画を、2台の境界ルータでつないだ典型的な構成です。',
  },
  '/networking/multicast': {
    title: 'マルチキャストと IGMP スヌーピング',
    desc: 'グループへの参加と離脱を切り替えて、IGMP スヌーピングが VLAN 内の転送先をどう絞るかを見ます。',
  },
  '/services/dhcp-dns': {
    title: 'DHCP と DNS',
    desc: 'DHCP で IP を借り、DNS で名前を引き、HTTP を送る前にそれぞれの通信を確認します。',
  },
  '/simulation/step': {
    title: '1ホップずつ進める',
    desc: '転送の判断を1ホップずつ追います。最長一致がどう効いているか、候補となる経路と選ばれた理由が見えます。',
  },
  '/simulation/failure': {
    title: '障害を起こしてみる',
    desc: 'ノードやリンクを落として、パケットが「機器停止」や「経路なし」で落ちる様子を見ます。壊れた箇所は図の上で強調されます。',
  },
  '/simulation/trace-inspector': {
    title: '通信の詳細を見る',
    desc: 'タイムラインのどのホップでも、転送の判断・最長一致の候補・TTL・破棄の理由を開いて確認できます。',
  },
  '/simulation/nat': {
    title: 'NAT / PAT',
    desc: '送信元変換、ポートフォワード、そして境界ルータ上で NAT の表が更新されていく様子を見ます。',
  },
  '/simulation/acl': {
    title: 'ファイアウォールと ACL',
    desc: 'インタフェースの ACL による許可・拒否の判断と、戻りの通信が自動で許可される仕組みを確認します。',
  },
  '/simulation/interface-aware': {
    title: 'インタフェース単位の転送',
    desc: '各ホップでルータのどのインタフェースが選ばれたかを、入口と出口の名前つきで確認します。',
  },
  '/simulation/session': {
    title: 'セッション単位で見る',
    desc: '要求と応答をひとつのセッションとしてまとめ、往路と復路、そして失敗時の状態を追います。',
  },
  '/simulation/data-transfer': {
    title: 'データ転送',
    desc: 'アプリケーションのデータを分割して送り、受け側で組み立て直すまでを、ホップごとに見ます。',
  },
  '/simulation/tcp-handshake': {
    title: 'TCP のハンドシェイク',
    desc: 'SYN、SYN-ACK、ACK、FIN を順に進めながら、接続の状態と TCP ヘッダの値が変わっていく様子を見ます。',
  },
  '/simulation/tcp-congestion': {
    title: 'TCP の輻輳制御',
    desc: 'スロースタート、輻輳回避、高速再送、回復、再送タイマの動きを、決まった損失パターンの上で追います。',
  },
  '/simulation/enterprise': {
    title: '企業ネットワークの入口',
    desc: 'DHCP で起動し、社内 DNS を引き、NAT 越しに閲覧し、ACL の判断まで、ひとつの構成でまとめて確認します。',
  },
  '/topology/controlled': {
    title: '外部から操作するトポロジ',
    desc: 'ノードを動かし、リンクをつなぎ、削除する間も JSON が同期し続けます。URL に保存して復元もできます。',
  },
  '/editor': {
    title: 'トポロジエディタ',
    desc: 'ノードの追加・削除、接続、プロパティの編集、元に戻す／やり直しを画面上で行えます。',
  },
  '/embed': {
    title: '埋め込み',
    desc: '別のページの中に、幅と高さを決めて埋め込んだ例です。シミュレーション表示と静的表示の両方を示します。',
  },
  '/comprehensive/all-in-one': {
    title: '全部入り',
    desc: 'トポロジの編集、1ホップずつの実行、障害の注入、通信の確認を、タブを切り替えながらひと続きで行います。',
  },
};
