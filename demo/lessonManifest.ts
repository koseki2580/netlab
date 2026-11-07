/**
 * Every lesson, once.
 *
 * A lesson used to be registered in five places — its route in `main.tsx`,
 * its card in the gallery, its Japanese copy, the scenario map the command
 * palette reads, and the paths the final test sends learners to — and the
 * five drifted. Each of those is now derived from this list.
 *
 * Order matters: the gallery shows categories in `LESSON_CATEGORIES` order and
 * lessons in the order they appear here.
 */

export type LessonCategoryId =
  | 'basic'
  | 'routing'
  | 'areas'
  | 'services'
  | 'simulation'
  | 'editor'
  | 'integration'
  | 'comprehensive';

export interface LessonCategory {
  readonly id: LessonCategoryId;
  readonly label: string;
  readonly color: string;
}

export const LESSON_CATEGORIES: readonly LessonCategory[] = [
  { id: 'basic', label: 'Basic Topologies', color: '#3b82f6' },
  { id: 'routing', label: 'Routing', color: '#10b981' },
  { id: 'areas', label: 'Network Areas', color: 'var(--netlab-accent-orange)' },
  { id: 'services', label: 'Services', color: '#eab308' },
  { id: 'simulation', label: 'Simulation', color: '#8b5cf6' },
  { id: 'editor', label: 'Interactive Editor', color: '#a855f7' },
  { id: 'integration', label: 'Integration', color: '#06b6d4' },
  { id: 'comprehensive', label: 'Comprehensive', color: '#14b8a6' },
];

interface Bilingual {
  readonly en: string;
  readonly ja: string;
}

export interface Lesson {
  /** The route, and the lesson's id everywhere else. */
  readonly path: string;
  readonly category: LessonCategoryId;
  /** The module, under `demo/`, whose default export is the lesson's page. */
  readonly module: `./${string}`;
  readonly title: Bilingual;
  readonly desc: Bilingual;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags?: readonly string[];
  /** The scenario the lesson runs; the command palette opens it by this id. */
  readonly scenarioId?: string;
  /**
   * `false` when the gallery card does not carry the scenario: its progress
   * and its assessment and compare links stay keyed to the path.
   */
  readonly scenarioOnCard?: false;
  /** Progress id when it differs from the scenario id and the path (drills). */
  readonly progressId?: string;
  readonly sandboxReady?: boolean;
  readonly defaultSandboxTab?: 'packet' | 'node' | 'parameters' | 'traffic';
}

export const LESSONS = [
  // ── Basic Topologies ──
  {
    path: '/learning/subnetting',
    category: 'basic',
    module: './learning/SubnetDrillDemo',
    title: { en: 'Subnetting Practice', ja: 'サブネットの練習' },
    desc: {
      en: 'Drill network/broadcast/mask/host-count and CIDR with instant, explained feedback.',
      ja: 'ネットワークアドレス、ブロードキャスト、マスク、ホスト数、CIDR を繰り返し練習します。答えるとその場で理由つきの解説が出ます。',
    },
    difficulty: 'beginner',
    tags: ['CIDR', 'Drill'],
    progressId: 'subnet-drill',
  },
  {
    path: '/learning/protocols',
    category: 'basic',
    module: './learning/ConceptCheckDemo',
    title: { en: 'Protocol Concept Checks', ja: 'プロトコルの理解度チェック' },
    desc: {
      en: 'Foundations first (layered model, addressing, ports), then 42 protocols across every layer — switching, routing (OSPF/BGP/IS-IS/EIGRP), transport, email, security, VPN and more. 156 explained questions, bilingual.',
      ja: 'まず土台（階層モデル、アドレス、ポート）から。そのあと各層の42のプロトコル（スイッチング、OSPF/BGP などのルーティング、TCP/UDP、HTTP など）を四択で確認します。',
    },
    difficulty: 'beginner',
    tags: ['Quiz', 'Protocols'],
  },
  {
    path: '/basic/minimal',
    category: 'basic',
    module: './basic/MinimalDemo',
    title: { en: 'Minimal', ja: '最小構成' },
    desc: {
      en: 'Two nodes directly connected. The simplest possible setup.',
      ja: '2台を直接つないだだけの、いちばん簡単な構成です。',
    },
    difficulty: 'beginner',
    tags: ['L1–L2'],
  },
  {
    path: '/basic/three-tier',
    category: 'basic',
    module: './basic/ThreeTierDemo',
    title: { en: 'Three-Tier LAN', ja: '3階層のLAN' },
    desc: {
      en: 'Client → Switch → Server. L2 switching with port and MAC configuration.',
      ja: 'クライアント → スイッチ → サーバ。ポートと MAC アドレスの設定を伴う L2 スイッチングを見ます。',
    },
    difficulty: 'beginner',
    tags: ['L2', 'MAC'],
  },
  {
    path: '/basic/star',
    category: 'basic',
    module: './basic/StarDemo',
    title: { en: 'Star Topology', ja: 'スター型' },
    desc: {
      en: 'One central switch connecting four clients and a server.',
      ja: '1台のスイッチを中心に、4台のクライアントと1台のサーバをつないだ構成です。',
    },
    difficulty: 'beginner',
    tags: ['L2'],
  },
  // ── Routing ──
  {
    path: '/learning/routing-decision',
    category: 'routing',
    module: './learning/RoutingDrillDemo',
    title: { en: 'Routing Decision', ja: 'ルーティング判断の練習' },
    desc: {
      en: 'Drill longest-prefix match: given a destination and a routing table, pick the next-hop.',
      ja: '宛先と経路表を見て次の転送先を選ぶ、最長一致（ロンゲストマッチ）の練習です。',
    },
    difficulty: 'beginner',
    tags: ['LPM', 'Drill'],
    progressId: 'routing-drill',
  },
  {
    path: '/learning/visual-routing',
    category: 'routing',
    module: './learning/VisualRoutingDrillDemo',
    title: { en: 'Routing Decision — on the network', ja: 'ルーティング判断 — ネットワーク上で' },
    desc: {
      en: 'Same longest-prefix drill, answered by clicking the next-hop router on the live canvas.',
      ja: '同じ最長一致の練習を、実際の図の上で次のルータをクリックして答えます。',
    },
    difficulty: 'beginner',
    tags: ['LPM', 'Drill', 'Canvas'],
    progressId: 'visual-routing-drill',
  },
  {
    path: '/learning/packet-journey',
    category: 'routing',
    module: './learning/PacketJourneyDemo',
    title: { en: 'Packet Journey', ja: 'パケットの旅' },
    desc: {
      en: 'Predict each hop of a real packet — the live engine grades you and explains its decisions.',
      ja: '本物のパケットが次にどこへ行くかを1ホップずつ予想します。エンジンが採点し、判断の理由を説明します。',
    },
    difficulty: 'intermediate',
    tags: ['LPM', 'Drill', 'Engine'],
    progressId: 'packet-journey-drill',
  },
  {
    path: '/learning/resilience',
    category: 'routing',
    module: './learning/ResilienceLabDemo',
    title: { en: 'Resilience Lab', ja: '障害への強さを試す' },
    desc: {
      en: 'Break a link or router and predict the fallout — the live engine shows what reroutes and what dies.',
      ja: 'リンクやルータを壊して、その影響を予想します。何が迂回して何が落ちるかをエンジンが示します。',
    },
    difficulty: 'intermediate',
    tags: ['Failure', 'Drill', 'Engine'],
    progressId: 'resilience-lab-drill',
  },
  {
    path: '/routing/client-server',
    category: 'routing',
    module: './routing/ClientServerDemo',
    title: { en: 'Client–Server', ja: 'クライアントとサーバ' },
    desc: {
      en: 'Full stack: two networks, a router with static routes between them, live packet log.',
      ja: '2 つのネットワーク、その間のルータ、パケットの記録まで一通り揃った構成です。',
    },
    difficulty: 'beginner',
    tags: ['L3', 'Static'],
  },
  {
    path: '/routing/multi-hop',
    category: 'routing',
    module: './routing/MultiHopDemo',
    title: { en: 'Multi-Hop', ja: '複数ホップ' },
    desc: {
      en: 'Traffic traverses two routers across three subnets before reaching the server.',
      ja: '3つのサブネットにまたがり、2台のルータを越えてサーバへ届きます。',
    },
    difficulty: 'intermediate',
    tags: ['L3'],
  },
  {
    path: '/routing/dynamic',
    category: 'routing',
    module: './routing/DynamicRoutingDemo',
    title: { en: 'Dynamic Routing', ja: '動的ルーティング' },
    desc: {
      en: 'Switch between RIP, OSPF, and BGP to compare hop-count, SPF cost, and policy-based path selection.',
      ja: 'RIP・OSPF・BGP を切り替えて、ホップ数・SPF コスト・ポリシーによる経路選択の違いを比べます。',
    },
    difficulty: 'intermediate',
    tags: ['RIP', 'OSPF', 'BGP'],
  },
  {
    path: '/routing/ospf-convergence',
    category: 'routing',
    module: './routing/OspfConvergenceDemo',
    title: { en: 'OSPF Convergence', ja: 'OSPF の収束' },
    desc: {
      en: 'Watch R1 prefer the low-cost path, then remove the primary link and resend traffic on the recomputed route.',
      ja: 'R1 がコストの低い経路を選ぶ様子を見てから、主経路のリンクを落として、計算し直された経路で再送します。',
    },
    difficulty: 'advanced',
    tags: ['OSPF'],
    scenarioId: 'ospf-convergence',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/routing/ospf-areas',
    category: 'routing',
    module: './routing/OspfAreasDemo',
    title: { en: 'OSPF Areas and DR/BDR', ja: 'OSPF のエリアと DR/BDR' },
    desc: {
      en: 'Read each router’s link-state database by area, see ABRs summarise, and watch the DR election refuse to be pushed aside.',
      ja: 'ルータごとのリンクステートデータベースをエリア別に読み、ABR の集約を確かめ、DR が後から来たルータに譲らない選出を試します。',
    },
    difficulty: 'advanced',
    tags: ['OSPF'],
  },
  // ── Network Areas ──
  {
    path: '/networking/arp',
    category: 'areas',
    module: './networking/ArpDemo',
    title: { en: 'ARP Basics', ja: 'ARP の基本' },
    desc: {
      en: 'Send the first packet, inspect the ARP request/reply, and watch the sender cache fill in.',
      ja: '最初のパケットを送り、ARP の要求と応答を確かめ、送信側のキャッシュが埋まっていく様子を見ます。',
    },
    difficulty: 'beginner',
    tags: ['L2', 'ARP'],
    scenarioId: 'basic-arp',
    sandboxReady: true,
    defaultSandboxTab: 'packet',
  },
  {
    path: '/networking/vlan',
    category: 'areas',
    module: './networking/VlanDemo',
    title: { en: 'VLAN Segmentation', ja: 'VLAN による分離' },
    desc: {
      en: 'Compare same-VLAN switching against router-on-a-stick inter-VLAN routing, then break the trunk to observe isolation.',
      ja: '同じ VLAN 内のスイッチングと、ルータを介した VLAN 間ルーティングを比べます。トランクを切って分離も確かめます。',
    },
    difficulty: 'intermediate',
    tags: ['802.1Q'],
  },
  {
    path: '/networking/stp',
    category: 'areas',
    module: './networking/StpLoopDemo',
    title: { en: 'Spanning Tree', ja: 'スパニングツリー' },
    desc: {
      en: 'Watch a triangle of switches elect a root bridge, block one redundant port, and reroute B→C traffic through the root.',
      ja: '3台のスイッチがルートブリッジを選び、余分なポートを1つ閉じ、B→C の通信がルート経由で迂回する様子を見ます。',
    },
    difficulty: 'advanced',
    tags: ['STP'],
    scenarioId: 'stp-loop',
    scenarioOnCard: false,
  },
  {
    path: '/networking/mtu-fragmentation',
    category: 'areas',
    module: './networking/MtuFragmentationDemo',
    title: { en: 'MTU & Fragmentation', ja: 'MTU と分割' },
    desc: {
      en: 'Shrink a routed tunnel MTU to watch IPv4 fragment on egress or return ICMP Fragmentation Needed when DF is set.',
      ja: 'トンネルの MTU を小さくして、IPv4 が出口で分割される様子や、DF ビットが立っているときに ICMP が返る様子を見ます。',
    },
    difficulty: 'advanced',
    tags: ['L3', 'ICMP'],
    scenarioId: 'fragmented-echo',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/networking/link-qos',
    category: 'areas',
    module: './networking/LinkQosDemo',
    title: { en: 'Per-Link QoS', ja: 'リンクごとの QoS' },
    desc: {
      en: 'Constrain one routed link with bandwidth, propagation delay, seeded loss, and a finite drop-tail queue.',
      ja: '1本のリンクに帯域・伝搬遅延・一定条件の損失・有限のキューを設定して、その影響を見ます。',
    },
    difficulty: 'advanced',
    tags: ['QoS', 'Loss'],
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/networking/dscp',
    category: 'areas',
    module: './networking/DscpDemo',
    title: { en: 'DSCP Shaping', ja: 'DSCP による優先制御' },
    desc: {
      en: 'Classify EF and best-effort packets into DRR traffic classes on a shaped link.',
      ja: 'EF とベストエフォートのパケットを DRR のクラスに振り分け、帯域制限のかかったリンクで比べます。',
    },
    difficulty: 'advanced',
    tags: ['QoS', 'DSCP'],
  },
  {
    path: '/networking/ecmp',
    category: 'areas',
    module: './networking/EcmpDemo',
    title: { en: 'ECMP Multipath', ja: 'ECMP（等コスト複数経路）' },
    desc: {
      en: 'Hash equal-cost routed flows across two spine paths and inspect the selected bucket per flow.',
      ja: '同じコストの2経路にフローをハッシュで振り分け、どのフローがどちらを通ったかを確認します。',
    },
    difficulty: 'advanced',
    tags: ['Routing', 'ECMP'],
  },
  {
    path: '/networking/ipv6',
    category: 'areas',
    module: './networking/Ipv6Demo',
    title: { en: 'IPv6 Dual-Stack', ja: 'IPv6 デュアルスタック' },
    desc: {
      en: 'Send ICMPv6 echo across a dual-stack router and compare v4/v6 route-table entries.',
      ja: 'デュアルスタックのルータ越しに ICMPv6 の echo を送り、v4 と v6 の経路表を見比べます。',
    },
    difficulty: 'advanced',
    tags: ['IPv6', 'ICMPv6'],
  },
  {
    path: '/networking/ipv6-routing',
    category: 'areas',
    module: './networking/Ipv6RoutingDemo',
    title: { en: 'IPv6 Routing Ecosystem', ja: 'IPv6 のルーティング' },
    desc: {
      en: 'Compare OSPFv3 ECMP with MP-BGP IPv6 unicast route exchange.',
      ja: 'OSPFv3 の ECMP と、MP-BGP による IPv6 ユニキャスト経路の交換を比べます。',
    },
    difficulty: 'advanced',
    tags: ['IPv6', 'OSPFv3', 'BGP'],
  },
  {
    path: '/networking/dhcpv6',
    category: 'areas',
    module: './networking/Dhcpv6SlaacDemo',
    title: { en: 'DHCPv6 And SLAAC', ja: 'DHCPv6 と SLAAC' },
    desc: {
      en: 'Toggle Router Advertisement M/O flags and inspect DHCPv6 versus SLAAC address behavior.',
      ja: 'ルータ広告の M／O フラグを切り替えて、DHCPv6 と SLAAC でアドレスの決まり方がどう変わるかを見ます。',
    },
    difficulty: 'advanced',
    tags: ['IPv6', 'DHCPv6', 'SLAAC'],
  },
  {
    path: '/networking/ha',
    category: 'areas',
    module: './networking/HighAvailabilityDemo',
    title: { en: 'Gateway HA And Link Aggregation', ja: 'ゲートウェイの冗長化とリンク束ね' },
    desc: {
      en: 'Fail a first-hop gateway and a LACP member while VRRP and port-channel hashing stay deterministic.',
      ja: '出口のゲートウェイと LACP のメンバを落としても、VRRP とポートチャネルの振り分けが一定に保たれることを確かめます。',
    },
    difficulty: 'advanced',
    tags: ['VRRP', 'HSRP', 'LACP'],
  },
  {
    path: '/networking/wireless',
    category: 'areas',
    module: './networking/WirelessDemo',
    title: { en: 'Wireless 802.11', ja: '無線 LAN（802.11）' },
    desc: {
      en: 'Inspect RSSI-derived loss, association, WPA2 four-way messages, and hidden-node collision behavior.',
      ja: '電波強度から決まる損失、アソシエーション、WPA2 の4ウェイハンドシェイク、隠れ端末の衝突を見ます。',
    },
    difficulty: 'advanced',
    tags: ['Wi-Fi', 'WPA2', 'CSMA/CA'],
  },
  {
    path: '/networking/tunneling/gre',
    category: 'areas',
    module: './networking/GreDemo',
    title: { en: 'GRE Tunnel', ja: 'GRE トンネル' },
    desc: {
      en: 'Wrap an inner IP packet in GRE over an IPv4 underlay and toggle the tunnel key.',
      ja: 'IPv4 の上で内側の IP パケットを GRE で包み、トンネルキーの有無による違いを見ます。',
    },
    difficulty: 'advanced',
    tags: ['GRE', 'Overlay'],
  },
  {
    path: '/networking/tunneling/mpls-l3vpn',
    category: 'areas',
    module: './networking/MplsL3vpnDemo',
    title: { en: 'MPLS L3VPN', ja: 'MPLS L3VPN' },
    desc: {
      en: 'Inspect LDP label mappings, a VPNv4 route import, and a two-label L3VPN stack.',
      ja: 'LDP のラベル割り当て、VPNv4 経路の取り込み、2段ラベルの構造を確かめます。',
    },
    difficulty: 'advanced',
    tags: ['MPLS', 'L3VPN'],
  },
  {
    path: '/networking/tunneling/vxlan-evpn',
    category: 'areas',
    module: './networking/VxlanEvpnDemo',
    title: { en: 'VXLAN EVPN', ja: 'VXLAN EVPN' },
    desc: {
      en: 'Inspect VXLAN UDP/4789 encapsulation, EVPN Type-2/Type-5 learning, and ARP suppression.',
      ja: 'UDP/4789 によるカプセル化、EVPN の Type-2／Type-5 学習、ARP 抑止の動きを見ます。',
    },
    difficulty: 'advanced',
    tags: ['VXLAN', 'EVPN'],
  },
  {
    path: '/networking/observability',
    category: 'areas',
    module: './networking/ObservabilityDemo',
    title: { en: 'Flow Observability', ja: 'フローの可視化' },
    desc: {
      en: 'Inspect router NetFlow updates and deterministic switch sFlow samples for each forwarded flow.',
      ja: '転送されたフローごとに、ルータの NetFlow とスイッチの sFlow サンプルを確認します。',
    },
    difficulty: 'advanced',
    tags: ['NetFlow', 'sFlow'],
  },
  {
    path: '/networking/udp',
    category: 'areas',
    module: './networking/UdpDemo',
    title: { en: 'UDP Datagram', ja: 'UDP のデータグラム' },
    desc: {
      en: 'Fire a stateless UDP datagram with no handshake. Adjust the port and payload, or send a large payload to see the packet size limit (MTU).',
      ja: 'ハンドシェイクなしで UDP を1つ送ります。ポートやペイロードを変えたり、大きなデータを送ってパケットの大きさの上限（MTU）を確かめたりできます。',
    },
    difficulty: 'beginner',
    tags: ['L4', 'UDP'],
  },
  {
    path: '/networking/http',
    category: 'areas',
    module: './networking/HttpDemo',
    title: { en: 'HTTP/1.1', ja: 'HTTP/1.1' },
    desc: {
      en: 'Send GET and POST requests over TCP. Inspect the HTTP request/response lifecycle with Connection: close semantics.',
      ja: 'TCP の上で GET と POST を送り、要求と応答の流れを Connection: close の挙動とあわせて確認します。',
    },
    difficulty: 'intermediate',
    tags: ['L7', 'HTTP'],
  },
  {
    path: '/networking/https',
    category: 'areas',
    module: './networking/HttpsDemo',
    title: { en: 'HTTPS TLS 1.3', ja: 'HTTPS（TLS 1.3）' },
    desc: {
      en: 'Inspect a deterministic TLS 1.3 handshake before HTTP/1.1 application data.',
      ja: 'HTTP のデータが流れる前に行われる TLS 1.3 のハンドシェイクを、順を追って確認します。',
    },
    difficulty: 'advanced',
    tags: ['TLS', 'HTTPS'],
  },
  {
    path: '/networking/http2',
    category: 'areas',
    module: './networking/Http2Demo',
    title: { en: 'HTTP/2 Multiplexing', ja: 'HTTP/2 の多重化' },
    desc: {
      en: 'Inspect interleaved HTTP/2 streams and TCP transport head-of-line blocking.',
      ja: '複数のストリームが交互に流れる様子と、TCP 側で起きる先頭ブロッキングを見ます。',
    },
    difficulty: 'advanced',
    tags: ['HTTP/2', 'HOL'],
  },
  {
    path: '/networking/http3',
    category: 'areas',
    module: './networking/Http3Demo',
    title: { en: 'HTTP/3 over QUIC', ja: 'HTTP/3（QUIC）' },
    desc: {
      en: 'Inspect QUIC stream isolation and HTTP/3 frame flow under per-stream loss.',
      ja: 'ストリームごとに損失を起こして、QUIC のストリーム独立性と HTTP/3 のフレームの流れを見ます。',
    },
    difficulty: 'advanced',
    tags: ['HTTP/3', 'QUIC'],
  },
  {
    path: '/areas/dmz',
    category: 'areas',
    module: './areas/DmzDemo',
    title: { en: 'DMZ Segmentation', ja: 'DMZ による区画分け' },
    desc: {
      en: 'Classic three-zone topology: Private → DMZ → Public with two border routers.',
      ja: 'プライベート → DMZ → パブリックの3区画を、2台の境界ルータでつないだ典型的な構成です。',
    },
    difficulty: 'intermediate',
    tags: ['L3'],
  },
  {
    path: '/networking/multicast',
    category: 'areas',
    module: './networking/MulticastDemo',
    title: { en: 'Multicast Snooping', ja: 'マルチキャストと IGMP スヌーピング' },
    desc: {
      en: 'Join and leave multicast groups to see IGMP snooping restrict L2 forwarding within a VLAN.',
      ja: 'グループへの参加と離脱を切り替えて、IGMP スヌーピングが VLAN 内の転送先をどう絞るかを見ます。',
    },
    difficulty: 'advanced',
    tags: ['IGMP'],
  },
  // ── Services ──
  {
    path: '/services/dhcp-dns',
    category: 'services',
    module: './services/DhcpDnsDemo',
    title: { en: 'DHCP & DNS', ja: 'DHCP と DNS' },
    desc: {
      en: 'Lease an IP with DHCP, resolve a hostname with DNS, and inspect each service trace before HTTP.',
      ja: 'DHCP で IP を借り、DNS で名前を引き、HTTP を送る前にそれぞれの通信を確認します。',
    },
    difficulty: 'intermediate',
    tags: ['DHCP', 'DNS'],
  },
  {
    path: '/services/dns-resolution',
    category: 'services',
    module: './services/DnsResolutionDemo',
    title: { en: 'DNS Resolution and Caching', ja: 'DNS の名前解決とキャッシュ' },
    desc: {
      en: 'Follow a resolver from the root to the authoritative server, then see the second lookup answered from its cache, and an unknown name.',
      ja: 'リゾルバがルートから権威サーバーまでたどる様子を追い、2 回目がキャッシュから答えられること、存在しない名前の扱いを確かめます。',
    },
    difficulty: 'intermediate',
    tags: ['DNS'],
  },
  // ── Simulation ──
  {
    path: '/simulation/step',
    category: 'simulation',
    module: './simulation/StepSimDemo',
    title: { en: 'Step-by-Step', ja: '1ホップずつ進める' },
    desc: {
      en: 'Trace packet routing decisions hop by hop. See LPM in action — match scores, route candidates, and why each next hop was chosen.',
      ja: '転送の判断を1ホップずつ追います。最長一致がどう効いているか、候補となる経路と選ばれた理由が見えます。',
    },
    difficulty: 'intermediate',
    tags: ['L3'],
  },
  {
    path: '/simulation/failure',
    category: 'simulation',
    module: './simulation/FailureSimDemo',
    title: { en: 'Failure Injection', ja: '障害を起こしてみる' },
    desc: {
      en: 'Toggle nodes and links down. Watch packets drop with node-down or no-route reasons. Failed components are highlighted on the canvas.',
      ja: 'ノードやリンクを落として、パケットが「機器停止」や「経路なし」で落ちる様子を見ます。壊れた箇所は図の上で強調されます。',
    },
    difficulty: 'intermediate',
    tags: ['Drop'],
  },
  {
    path: '/simulation/trace-inspector',
    category: 'simulation',
    module: './simulation/TraceInspectorDemo',
    title: { en: 'Trace Inspector', ja: '通信の詳細を見る' },
    desc: {
      en: 'Click any hop in the timeline to inspect routing decisions, LPM candidates, TTL values, and drop reasons.',
      ja: 'タイムラインのどのホップでも、転送の判断・最長一致の候補・TTL・破棄の理由を開いて確認できます。',
    },
    difficulty: 'intermediate',
    tags: ['Trace'],
  },
  {
    path: '/simulation/nat',
    category: 'simulation',
    module: './simulation/NatDemo',
    title: { en: 'NAT / PAT', ja: 'NAT / PAT' },
    desc: {
      en: 'Watch SNAT, DNAT port forwarding, and the live NAT table update on an edge router.',
      ja: '送信元変換、ポートフォワード、そして境界ルータ上で NAT の表が更新されていく様子を見ます。',
    },
    difficulty: 'advanced',
    tags: ['SNAT', 'DNAT'],
    scenarioId: 'nat-basics',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/simulation/acl',
    category: 'simulation',
    module: './simulation/AclDemo',
    title: { en: 'Firewalls & ACLs', ja: 'ファイアウォールと ACL' },
    desc: {
      en: 'Inspect interface ACL permit/deny decisions and stateful return-traffic auto-permit on a firewall router.',
      ja: 'インタフェースの ACL による許可・拒否の判断と、戻りの通信が自動で許可される仕組みを確認します。',
    },
    difficulty: 'advanced',
    tags: ['ACL', 'Firewall'],
  },
  {
    path: '/simulation/interface-aware',
    category: 'simulation',
    module: './simulation/InterfaceAwareDemo',
    title: { en: 'Interface-Aware Forwarding', ja: 'インタフェース単位の転送' },
    desc: {
      en: 'See which router interface is selected at each hop, with ingress and egress interface names shown in the inspector.',
      ja: '各ホップでルータのどのインタフェースが選ばれたかを、入口と出口の名前つきで確認します。',
    },
    difficulty: 'intermediate',
    tags: ['L3'],
  },
  {
    path: '/simulation/session',
    category: 'simulation',
    module: './simulation/SessionDemo',
    title: { en: 'Session Inspector', ja: 'セッション単位で見る' },
    desc: {
      en: 'Group request and response traffic into one session lifecycle, with request/response paths and failure-aware status.',
      ja: '要求と応答をひとつのセッションとしてまとめ、往路と復路、そして失敗時の状態を追います。',
    },
    difficulty: 'intermediate',
    tags: ['Session'],
  },
  {
    path: '/simulation/data-transfer',
    category: 'simulation',
    module: './simulation/DataTransferDemo',
    title: { en: 'Data Transfer', ja: 'データ転送' },
    desc: {
      en: 'Application-level data transfer with chunking, reassembly, and per-hop forwarding visualization.',
      ja: 'アプリケーションのデータを分割して送り、受け側で組み立て直すまでを、ホップごとに見ます。',
    },
    difficulty: 'advanced',
    tags: ['L7'],
  },
  {
    path: '/simulation/tcp-handshake',
    category: 'simulation',
    module: './simulation/TcpHandshakeDemo',
    title: { en: 'TCP Handshake', ja: 'TCP のハンドシェイク' },
    desc: {
      en: 'Step through SYN, SYN-ACK, ACK, and FIN exchanges while watching connection state and TCP header fields evolve.',
      ja: 'SYN、SYN-ACK、ACK、FIN を順に進めながら、接続の状態と TCP ヘッダの値が変わっていく様子を見ます。',
    },
    difficulty: 'intermediate',
    tags: ['L4', 'TCP'],
    scenarioId: 'tcp-handshake',
    sandboxReady: true,
    defaultSandboxTab: 'packet',
  },
  {
    path: '/simulation/tcp-flow-control',
    category: 'simulation',
    module: './simulation/TcpFlowControlDemo',
    title: { en: 'TCP Flow Control', ja: 'TCP のフロー制御' },
    desc: {
      en: 'Slow the receiving application and watch the window close, the sender stop, and a window update restart it. See what the handshake options settle.',
      ja: '受信側のアプリを遅くして、ウィンドウが閉じ、送信側が止まり、ウィンドウ更新でまた動き出す様子を見ます。ハンドシェイクのオプションで決まることも確かめます。',
    },
    difficulty: 'intermediate',
    tags: ['L4', 'TCP'],
  },
  {
    path: '/simulation/tcp-congestion',
    category: 'simulation',
    module: './simulation/TcpCongestionDemo',
    title: { en: 'TCP Congestion Control', ja: 'TCP の輻輳制御' },
    desc: {
      en: 'Watch slow start, congestion avoidance, fast retransmit, recovery, and RTO on a deterministic loss trace.',
      ja: 'スロースタート、輻輳回避、高速再送、回復、再送タイマの動きを、決まった損失パターンの上で追います。',
    },
    difficulty: 'advanced',
    tags: ['L4', 'TCP'],
  },
  {
    path: '/simulation/enterprise',
    category: 'simulation',
    module: './enterprise/EnterpriseDemo',
    title: { en: 'Enterprise Edge', ja: '企業ネットワークの入口' },
    desc: {
      en: 'Boot a corporate client with DHCP, resolve internal DNS, browse through NAT, and inspect ACL decisions in one topology.',
      ja: 'DHCP で起動し、社内 DNS を引き、NAT 越しに閲覧し、ACL の判断まで、ひとつの構成でまとめて確認します。',
    },
    difficulty: 'advanced',
    tags: ['Edge'],
  },
  // ── Interactive Editor ──
  {
    path: '/topology/controlled',
    category: 'editor',
    module: './topology/ControlledTopologyDemo',
    title: { en: 'Controlled Topology', ja: '外部から操作するトポロジ' },
    desc: {
      en: 'Drag nodes, connect links, and delete edges while a live JSON snapshot stays in sync and can be encoded/restored from the URL.',
      ja: 'ノードを動かし、リンクをつなぎ、削除する間も JSON が同期し続けます。URL に保存して復元もできます。',
    },
    difficulty: 'intermediate',
    tags: ['Editor'],
  },
  {
    path: '/editor',
    category: 'editor',
    module: './editor/EditorDemo',
    title: { en: 'Topology Editor', ja: 'トポロジエディタ' },
    desc: {
      en: 'Visually add/remove nodes, connect them, edit properties, and undo/redo changes.',
      ja: 'ノードの追加・削除、接続、プロパティの編集、元に戻す／やり直しを画面上で行えます。',
    },
    difficulty: 'intermediate',
    tags: ['Editor'],
  },
  // ── Integration ──
  {
    path: '/embed',
    category: 'integration',
    module: './embed/EmbedDemo',
    title: { en: 'Embed', ja: '埋め込み' },
    desc: {
      en: 'NetlabApp embedded inside a host page with fixed width/height. Shows both simulation and static modes.',
      ja: '別のページの中に、幅と高さを決めて埋め込んだ例です。シミュレーション表示と静的表示の両方を示します。',
    },
    difficulty: 'beginner',
    tags: ['Embed'],
  },
  // ── Comprehensive ──
  {
    path: '/comprehensive/all-in-one',
    category: 'comprehensive',
    module: './comprehensive/AllInOneDemo',
    title: { en: 'All-in-One', ja: '全部入り' },
    desc: {
      en: 'Edit topology, run step simulation, inject failures, and inspect packet traces in a single tabbed workflow.',
      ja: 'トポロジの編集、1ホップずつの実行、障害の注入、通信の確認を、タブを切り替えながらひと続きで行います。',
    },
    difficulty: 'advanced',
    tags: ['All-in-one'],
    sandboxReady: true,
    defaultSandboxTab: 'traffic',
  },
] as const satisfies readonly Lesson[];

/** A lesson's route. A path that is no lesson does not compile. */
export type LessonPath = (typeof LESSONS)[number]['path'];

/** The route of a lesson, checked against the manifest when it is compiled. */
export function lessonPath(path: LessonPath): LessonPath {
  return path;
}

/** The beginner course: a page of its own rather than a lesson. */
export const COURSE_PATH = '/course';

/** Scenario id → the route of the lesson that runs it. */
export const SCENARIO_ROUTES: Readonly<Record<string, string>> = Object.fromEntries(
  LESSONS.flatMap((lesson: Lesson) =>
    lesson.scenarioId ? [[lesson.scenarioId, lesson.path] as const] : [],
  ),
);
