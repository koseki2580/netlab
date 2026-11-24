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
  /**
   * The concept-check deck (`CONCEPT_DECKS` id) the lesson ends with: the shell
   * offers it after the lesson, and the path counts its reviews per stage.
   */
  readonly conceptDeck?: string;
}

export const LESSONS = [
  // ── Basic Topologies ──
  {
    path: '/learning/bits',
    category: 'basic',
    module: './learning/BitsDrillDemo',
    title: { en: 'Bits and bytes', ja: 'ビットとバイト' },
    desc: {
      en: 'The eight bits of an octet: binary and decimal, masks, and AND — what every address is built from.',
      ja: 'オクテットの 8 ビット：2 進数と 10 進数、マスク、AND。どのアドレスもこれでできています。',
    },
    difficulty: 'beginner',
    tags: ['L3'],
  },
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
    path: '/learning/vlsm',
    category: 'basic',
    module: './learning/VlsmDrillDemo',
    title: { en: 'VLSM: subnets of different sizes', ja: 'VLSM：大きさの違うサブネット' },
    desc: {
      en: 'Carve one block into subnets that each fit their department, with nothing wasted.',
      ja: '1 つのブロックを、部署ごとにちょうど足りる大きさのサブネットに分けます。',
    },
    difficulty: 'intermediate',
    tags: ['L3'],
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
    conceptDeck: 'model',
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
    conceptDeck: 'ethernet',
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
    conceptDeck: 'ethernet',
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
    conceptDeck: 'ipv4',
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
    conceptDeck: 'ipv4',
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
    conceptDeck: 'model',
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
    conceptDeck: 'ipv4',
    difficulty: 'beginner',
    tags: ['L3', 'Static'],
  },
  {
    path: '/networking/icmp',
    category: 'routing',
    module: './networking/IcmpDemo',
    title: { en: 'ICMP and traceroute', ja: 'ICMP と traceroute' },
    desc: {
      en: 'What the network answers back, and why: predict, send and read four ICMP messages.',
      ja: 'ネットワークが何を、なぜ返すのか。4 つの ICMP メッセージを予想し、送り、読み取ります。',
    },
    conceptDeck: 'icmp',
    difficulty: 'intermediate',
    tags: ['L3'],
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
    conceptDeck: 'ipv4',
    difficulty: 'intermediate',
    tags: ['L3'],
  },
  {
    path: '/routing/dynamic',
    category: 'routing',
    module: './routing/DynamicRoutingDemo',
    title: { en: 'Dynamic Routing: RIP, OSPF and BGP', ja: '動的ルーティング（RIP・OSPF・BGP）' },
    desc: {
      en: 'Switch between RIP, OSPF, and BGP to compare hop-count, SPF cost, and policy-based path selection.',
      ja: 'RIP・OSPF・BGP を切り替えて、ホップ数・SPF コスト・ポリシーによる経路選択の違いを比べます。',
    },
    conceptDeck: 'rip',
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
    conceptDeck: 'ospf',
    difficulty: 'advanced',
    tags: ['OSPF'],
    scenarioId: 'ospf-convergence',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/networking/bfd',
    category: 'routing',
    module: './networking/BfdDemo',
    title: { en: 'BFD and failure detection', ja: 'BFD と障害の検出' },
    desc: {
      en: 'How long a router keeps sending into a dead path, with routing timers and with BFD.',
      ja: 'ルータが止まった経路へ送り続けるのはどれくらいか。ルーティングのタイマーと BFD で比べます。',
    },
    conceptDeck: 'bfd',
    difficulty: 'intermediate',
    tags: ['OSPF'],
  },
  {
    path: '/networking/eigrp',
    category: 'routing',
    module: './networking/EigrpDemo',
    title: { en: 'EIGRP and DUAL', ja: 'EIGRP と DUAL' },
    desc: {
      en: 'Successors, feasible successors, and what EIGRP does when its best route fails.',
      ja: 'サクセサとフィージブルサクセサ、そして最良の経路が落ちたとき EIGRP がどう動くか。',
    },
    conceptDeck: 'eigrp',
    difficulty: 'intermediate',
    tags: ['OSPF'],
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
    conceptDeck: 'ospf',
    difficulty: 'advanced',
    tags: ['OSPF'],
  },
  // ── Network Areas ──
  {
    path: '/networking/redistribution',
    category: 'routing',
    module: './networking/RedistributionDemo',
    title: {
      en: 'Route redistribution and administrative distance',
      ja: '経路の再配布とアドミニストレーティブディスタンス',
    },
    desc: {
      en: 'Predict which source a router trusts for one prefix, then watch two border routers redistribute between RIP and OSPF.',
      ja: '1 つのプレフィックスでルータがどの情報源を信じるかを予想し、2 台の境界ルータが RIP と OSPF の間で再配布する様子を見ます。',
    },
    conceptDeck: 'redistribution',
    difficulty: 'advanced',
    tags: ['OSPF'],
  },
  {
    path: '/networking/isis',
    category: 'routing',
    module: './networking/IsisDemo',
    title: {
      en: 'IS-IS: levels, areas and the attached bit',
      ja: 'IS-IS：レベル・エリア・attached ビット',
    },
    desc: {
      en: 'Read NETs, see which routers become neighbours, and follow SPF on the Level 1 and Level 2 databases.',
      ja: 'NET を読み、どのルータがネイバーになるかを確かめ、レベル 1 とレベル 2 のデータベースで SPF をたどります。',
    },
    conceptDeck: 'isis',
    difficulty: 'advanced',
    tags: ['OSPF'],
  },
  {
    path: '/networking/bgp-policy',
    category: 'routing',
    module: './networking/BgpPolicyDemo',
    title: { en: 'BGP best path and communities', ja: 'BGP の最適経路選択とコミュニティ' },
    desc: {
      en: 'Step through how a router picks one of several BGP paths, change one attribute, then tag a route with communities and see where it goes.',
      ja: '複数の BGP 経路からルータが 1 本を選ぶ手順をたどり、属性を 1 つ変え、経路にコミュニティを付けて届く範囲を確かめます。',
    },
    conceptDeck: 'bgp',
    difficulty: 'advanced',
    tags: ['BGP'],
  },
  {
    path: '/networking/route-reflector',
    category: 'routing',
    module: './networking/RouteReflectorDemo',
    title: { en: 'iBGP scaling and route reflectors', ja: 'iBGP のスケールとルートリフレクタ' },
    desc: {
      en: 'How many iBGP sessions an AS needs, and how a route reaches a router it has no session with.',
      ja: 'AS に要る iBGP セッションの数と、セッションのないルータへ経路が届く仕組み。',
    },
    conceptDeck: 'routereflector',
    difficulty: 'advanced',
    tags: ['BGP'],
  },
  {
    path: '/networking/rpki',
    category: 'routing',
    module: './networking/RpkiDemo',
    title: { en: 'RPKI route origin validation', ja: 'RPKI による経路オリジン検証' },
    desc: {
      en: 'How a router checks which AS may originate a BGP prefix, and what that changes for forwarding.',
      ja: 'BGP のプレフィックスをどの AS が送り出してよいかをルータが確かめる仕組みと、それで転送がどう変わるか。',
    },
    conceptDeck: 'rpki',
    difficulty: 'advanced',
    tags: ['BGP'],
  },
  {
    path: '/networking/arp',
    category: 'areas',
    module: './networking/ArpDemo',
    title: { en: 'ARP Basics', ja: 'ARP の基本' },
    desc: {
      en: 'Send the first packet, inspect the ARP request/reply, and watch the sender cache fill in.',
      ja: '最初のパケットを送り、ARP の要求と応答を確かめ、送信側のキャッシュが埋まっていく様子を見ます。',
    },
    conceptDeck: 'arp',
    difficulty: 'beginner',
    tags: ['L2', 'ARP'],
    scenarioId: 'basic-arp',
    sandboxReady: true,
    defaultSandboxTab: 'packet',
  },
  {
    path: '/networking/mac-learning',
    category: 'areas',
    module: './networking/MacLearningDemo',
    title: { en: 'MAC learning', ja: 'MAC アドレス学習' },
    desc: {
      en: 'Frame by frame, predict which ports an Ethernet switch sends each frame out of, then move a host and let time pass.',
      ja: 'イーサネットスイッチが各フレームをどのポートから出すかを 1 つずつ予想し、ホストの移動や時間の経過も試します。',
    },
    conceptDeck: 'maclearning',
    difficulty: 'beginner',
    tags: ['L2', '802.1Q'],
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
    conceptDeck: 'vlan',
    difficulty: 'intermediate',
    tags: ['802.1Q'],
  },
  {
    path: '/networking/physical-layer',
    category: 'areas',
    module: './networking/PhysicalLayerDemo',
    title: { en: 'The physical layer in practice', ja: '実際の物理層' },
    desc: {
      en: 'Duplex mismatch, PoE power budgets and LLDP neighbour discovery.',
      ja: 'デュプレックス不一致、PoE の電力予算、LLDP による隣接機器の発見。',
    },
    conceptDeck: 'physical',
    difficulty: 'beginner',
    tags: ['L1–L2'],
  },
  {
    path: '/networking/optical',
    category: 'areas',
    module: './networking/OpticalDemo',
    title: { en: 'Optical link budgets and DWDM', ja: '光リンクバジェットと DWDM' },
    desc: {
      en: 'Add up a fibre link’s losses to see whether it comes up, then fit DWDM channels into the C-band.',
      ja: '光ファイバリンクの損失を足し合わせて上がるかを確かめ、C バンドに DWDM のチャネルを並べます。',
    },
    conceptDeck: 'optical',
    difficulty: 'intermediate',
    tags: ['L1', 'DWDM'],
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
    conceptDeck: 'stp',
    difficulty: 'advanced',
    tags: ['STP'],
    scenarioId: 'stp-loop',
    scenarioOnCard: false,
  },
  {
    path: '/networking/rstp',
    category: 'areas',
    module: './networking/RstpDemo',
    title: { en: 'RSTP and MSTP', ja: 'RSTP と MSTP' },
    desc: {
      en: 'Alternate ports that take over at once, and one spanning tree per group of VLANs.',
      ja: 'すぐ代われる代替ポートと、VLAN のまとまりごとのスパニングツリー。',
    },
    conceptDeck: 'stp',
    difficulty: 'intermediate',
    tags: ['L2'],
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
    conceptDeck: 'mtu',
    difficulty: 'advanced',
    tags: ['L3', 'ICMP'],
    scenarioId: 'fragmented-echo',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/networking/plpmtud',
    category: 'areas',
    module: './networking/PlpmtudDemo',
    title: { en: 'PLPMTUD: probing for the path MTU', ja: 'PLPMTUD：プローブで経路 MTU を探す' },
    desc: {
      en: 'Finding how big a packet the path carries when the ICMP that classic PMTUD waits for never arrives.',
      ja: '従来の PMTUD が待つ ICMP が届かないとき、経路が運べるパケットの大きさをどう見つけるか。',
    },
    conceptDeck: 'plpmtud',
    difficulty: 'advanced',
    tags: ['L4', 'ICMP'],
  },
  {
    path: '/networking/pppoe',
    category: 'areas',
    module: './networking/PppoeDemo',
    title: { en: 'PPPoE, MTU 1492 and MSS clamping', ja: 'PPPoE と MTU 1492、MSS クランプ' },
    desc: {
      en: 'Open a PPPoE session step by step, then follow a web page download across the smaller link and compare it with IPoE.',
      ja: 'PPPoE のセッションを順に開き、小さくなったリンクを通る Web ページのダウンロードを追い、IPoE と比べます。',
    },
    conceptDeck: 'pppoe',
    difficulty: 'advanced',
    tags: ['MTU'],
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
    conceptDeck: 'qos',
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
    conceptDeck: 'qos',
    difficulty: 'advanced',
    tags: ['QoS', 'DSCP'],
  },
  {
    path: '/networking/qos-queuing',
    category: 'areas',
    module: './networking/QosQueuingDemo',
    title: { en: 'QoS queuing', ja: 'QoS のキューイング' },
    desc: {
      en: 'Police or shape a contract with a token bucket, then serve voice and a bulk transfer on a congested link.',
      ja: 'トークンバケットで契約帯域をポリシング・シェーピングし、混雑したリンクで音声と大量転送をさばきます。',
    },
    conceptDeck: 'qos',
    difficulty: 'intermediate',
    tags: ['QoS'],
  },
  {
    path: '/networking/net-ops',
    category: 'areas',
    module: './networking/NetOpsDemo',
    title: { en: 'Syslog, SNMP and NTP', ja: 'syslog・SNMP・NTP' },
    desc: {
      en: 'Read one incident from four devices’ logs, and see how monitoring learns of a short outage.',
      ja: '4 台の機器のログから 1 つの障害を読み解き、短い停止に監視がどう気づくかを見ます。',
    },
    conceptDeck: 'snmp',
    difficulty: 'intermediate',
    tags: ['Operations'],
  },
  {
    path: '/networking/time-sync',
    category: 'areas',
    module: './networking/TimeSyncDemo',
    title: { en: 'Time sync: NTP and PTP', ja: '時刻同期：NTP と PTP' },
    desc: {
      en: 'Four timestamps, one offset: work out what NTP computes, then send it over an uneven path and through a switch with PTP.',
      ja: '4 つのタイムスタンプから 1 つのオフセットへ。NTP の計算を予想し、偏った経路とスイッチ越しの PTP で試します。',
    },
    conceptDeck: 'timesync',
    difficulty: 'advanced',
    tags: ['NTP', 'PTP'],
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
    conceptDeck: 'ecmp',
    difficulty: 'advanced',
    tags: ['Routing', 'ECMP'],
  },
  {
    path: '/networking/spine-leaf',
    category: 'areas',
    module: './networking/SpineLeafDemo',
    title: { en: 'Spine-leaf fabrics', ja: 'スパイン・リーフ構成' },
    desc: {
      en: 'Every leaf linked to every spine: count the paths, the hops, and what a failed spine costs.',
      ja: 'どのリーフもすべてのスパインとつながる構成。経路の数、通るスイッチ、スパインの故障で失うものを数えます。',
    },
    conceptDeck: 'spineleaf',
    difficulty: 'intermediate',
    tags: ['ECMP'],
  },
  {
    path: '/networking/lossless-dc',
    category: 'areas',
    module: './networking/LosslessDcDemo',
    title: { en: 'Lossless Ethernet for RoCEv2', ja: 'RoCEv2 のためのロスレス Ethernet' },
    desc: {
      en: 'Many servers answer one at once: what a data-centre switch does with the burst.',
      ja: '多数のサーバが一斉に 1 台へ応答したとき、データセンターのスイッチはそのバーストをどう扱うか。',
    },
    conceptDeck: 'lossless',
    difficulty: 'advanced',
    tags: ['Data center'],
  },
  {
    path: '/networking/load-balancer',
    category: 'areas',
    module: './networking/LoadBalancerDemo',
    title: { en: 'Load balancers', ja: 'ロードバランサ' },
    desc: {
      en: 'One VIP, many servers: round robin, least connections and source hash, with health checks.',
      ja: '1 つの VIP に多数のサーバ。ラウンドロビン、最小接続、送信元ハッシュとヘルスチェック。',
    },
    conceptDeck: 'loadbalancer',
    difficulty: 'intermediate',
    tags: ['L4'],
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
    conceptDeck: 'ipv6',
    difficulty: 'advanced',
    tags: ['IPv6', 'ICMPv6'],
  },
  {
    path: '/networking/ipv6-addressing',
    category: 'areas',
    module: './networking/Ipv6AddressingDemo',
    title: { en: 'IPv6 addresses and prefixes', ja: 'IPv6 アドレスとプレフィックス' },
    desc: {
      en: 'How an IPv6 address is written, what its first bits say about it, and how a delegated prefix is cut into LANs.',
      ja: 'IPv6 アドレスの書き方、先頭のビットが表すもの、委任されたプレフィックスを LAN に切り分ける方法。',
    },
    conceptDeck: 'ipv6addr',
    difficulty: 'intermediate',
    tags: ['IPv6'],
  },
  {
    path: '/networking/ipv6-nd',
    category: 'areas',
    module: './networking/Ipv6NdDemo',
    title: { en: 'IPv6 Neighbor Discovery', ja: 'IPv6 の近隣探索' },
    desc: {
      en: 'Follow a neighbour-cache entry over time, build an address from a Router Advertisement, and check that nobody else has it.',
      ja: '近隣キャッシュのエントリを時間を追って見ていき、ルータ広告からアドレスを作り、ほかに使っている人がいないかを確かめます。',
    },
    conceptDeck: 'ndp',
    difficulty: 'advanced',
    tags: ['IPv6'],
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
    conceptDeck: 'ipv6',
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
    conceptDeck: 'ndp',
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
    conceptDeck: 'vrrp',
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
    conceptDeck: 'wifi',
    difficulty: 'advanced',
    tags: ['Wi-Fi', 'WPA2', 'CSMA/CA'],
  },
  {
    path: '/networking/modern-wifi',
    category: 'areas',
    module: './networking/ModernWifiDemo',
    title: { en: 'Modern Wi-Fi: Wi-Fi 6/7 and WPA3', ja: '最新の Wi-Fi：Wi-Fi 6/7 と WPA3' },
    desc: {
      en: 'Thirty phones on one access point, the channels each band offers, and what WPA3 changes for weak passwords.',
      ja: '1 台のアクセスポイントに 30 台のスマートフォン、各帯域で取れるチャネル、弱いパスワードに対して WPA3 が変えること。',
    },
    conceptDeck: 'wifi',
    difficulty: 'advanced',
    tags: ['Wi-Fi'],
  },
  {
    path: '/networking/wifi-roaming',
    category: 'areas',
    module: './networking/WifiRoamingDemo',
    title: { en: 'Wi-Fi roaming and controllers', ja: 'Wi-Fi のローミングとコントローラ' },
    desc: {
      en: 'A voice call walks past three access points: where the phone roams, how long each roam takes, and where its packets travel.',
      ja: '音声通話をしながら 3 台のアクセスポイントの前を歩きます。どこでローミングし、どれだけかかり、パケットがどこを通るか。',
    },
    conceptDeck: 'roaming',
    difficulty: 'advanced',
    tags: ['Wi-Fi'],
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
    conceptDeck: 'gre',
    difficulty: 'advanced',
    tags: ['GRE', 'Overlay'],
  },
  {
    path: '/networking/vpn-tunnel',
    category: 'areas',
    module: './networking/VpnTunnelDemo',
    title: { en: 'Site-to-site VPN: IPsec and WireGuard', ja: '拠点間 VPN：IPsec と WireGuard' },
    desc: {
      en: 'Join two offices over the internet: what an observer can read, what each wrapping costs in bytes, and which traffic enters the tunnel.',
      ja: '2 つのオフィスをインターネット越しにつなぎます。途中で何が読めるか、包み方ごとに何バイト増えるか、どの通信がトンネルに入るか。',
    },
    conceptDeck: 'ipsec',
    difficulty: 'advanced',
    tags: ['GRE'],
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
    conceptDeck: 'mpls',
    difficulty: 'advanced',
    tags: ['MPLS', 'L3VPN'],
  },
  {
    path: '/networking/segment-routing',
    category: 'areas',
    module: './networking/SegmentRoutingDemo',
    title: { en: 'Segment routing', ja: 'セグメントルーティング' },
    desc: {
      en: 'The path written into the packet as a stack of labels, with no per-path state in the core.',
      ja: '通る道をラベルの積み重ねとしてパケットに書き込み、途中のルータは経路ごとの状態を持ちません。',
    },
    conceptDeck: 'segrouting',
    difficulty: 'advanced',
    tags: ['MPLS'],
  },
  {
    path: '/networking/mpls-te',
    category: 'areas',
    module: './networking/MplsTeDemo',
    title: { en: 'MPLS traffic engineering', ja: 'MPLS トラフィックエンジニアリング' },
    desc: {
      en: 'Ask for paths with a bandwidth: how RSVP-TE places them, and how fast reroute protects them.',
      ja: '帯域を指定して経路を要求すると、RSVP-TE がどう配置し、高速迂回がどう守るか。',
    },
    conceptDeck: 'mplste',
    difficulty: 'advanced',
    tags: ['MPLS'],
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
    conceptDeck: 'vxlan',
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
    conceptDeck: 'udp',
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
    conceptDeck: 'http',
    difficulty: 'intermediate',
    tags: ['L7', 'HTTP'],
  },
  {
    path: '/networking/websocket',
    category: 'areas',
    module: './networking/WebSocketDemo',
    title: {
      en: 'Polling, long polling and WebSocket',
      ja: 'ポーリング、ロングポーリング、WebSocket',
    },
    desc: {
      en: 'Get news from a server to a browser three ways and count what each costs, then decide which requests may be resent after a dropped connection.',
      ja: 'サーバーからブラウザへ知らせを届ける 3 つの方法のコストを数え、接続が切れたあと送り直してよいリクエストを見分けます。',
    },
    conceptDeck: 'websocket',
    difficulty: 'intermediate',
    tags: ['HTTP'],
  },
  {
    path: '/networking/http-cache',
    category: 'areas',
    module: './networking/HttpCacheDemo',
    title: { en: 'HTTP caching', ja: 'HTTP のキャッシュ' },
    desc: {
      en: 'Follow Cache-Control, freshness and revalidation through a browser cache and a CDN over time.',
      ja: 'Cache-Control、新鮮さ、再検証を、ブラウザのキャッシュと CDN で時間を追って確かめます。',
    },
    conceptDeck: 'httpcache',
    difficulty: 'intermediate',
    tags: ['HTTP/2'],
  },
  {
    path: '/networking/email',
    category: 'areas',
    module: './networking/EmailDemo',
    title: { en: 'Email delivery and authentication', ja: 'メールの配送と送信元認証' },
    desc: {
      en: 'Follow a message from the MX lookup through the SMTP dialogue, then predict how the receiver judges four messages from the same domain.',
      ja: 'MX の検索から SMTP のやりとりまでメールを追い、同じドメインを名乗る 4 通を受信側がどう判定するか予想します。',
    },
    conceptDeck: 'email',
    difficulty: 'intermediate',
    tags: ['DNS'],
  },
  {
    path: '/networking/voip',
    category: 'areas',
    module: './networking/VoipDemo',
    title: { en: 'Voice over IP: SIP, RTP and jitter', ja: 'VoIP：SIP・RTP とジッタ' },
    desc: {
      en: 'How SIP and SDP set up a call, what RTP costs per call, and how a jitter buffer trades delay for loss.',
      ja: 'SIP と SDP が通話を張るしくみ、1 通話の RTP の帯域、ジッタバッファが遅延と損失をどう引き換えるか。',
    },
    conceptDeck: 'sip',
    difficulty: 'intermediate',
    tags: ['QoS'],
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
    conceptDeck: 'tls',
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
    conceptDeck: 'http2',
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
    conceptDeck: 'http3',
    difficulty: 'advanced',
    tags: ['HTTP/3', 'QUIC'],
  },
  {
    path: '/networking/quic-migration',
    category: 'areas',
    module: './networking/QuicMigrationDemo',
    title: { en: 'QUIC connection migration and 0-RTT', ja: 'QUIC の接続移行と 0-RTT' },
    desc: {
      en: 'A phone changes networks in the middle of two downloads; then count the round trips before the first byte.',
      ja: 'ダウンロード中にスマートフォンのネットワークが変わったら？ そして最初の 1 バイトまでの往復を数えます。',
    },
    conceptDeck: 'quic',
    difficulty: 'advanced',
    tags: ['QUIC'],
  },
  {
    path: '/networking/mobile-core',
    category: 'areas',
    module: './networking/MobileCoreDemo',
    title: { en: '5G core: the user plane', ja: '5G コア：ユーザプレーン' },
    desc: {
      en: "Count the tunnel headers on a phone's packets between base station and core, then hand the phone to another base station.",
      ja: 'スマートフォンのパケットが基地局とコアの間で包まれるヘッダを数え、別の基地局へハンドオーバーします。',
    },
    conceptDeck: 'mobilecore',
    difficulty: 'advanced',
    tags: ['5G', 'GTP-U'],
  },
  {
    path: '/networking/mptcp',
    category: 'areas',
    module: './networking/MptcpDemo',
    title: { en: 'Multipath TCP', ja: 'Multipath TCP（MPTCP）' },
    desc: {
      en: 'One connection over Wi-Fi and LTE at once: the scheduler, a lost path, and sharing a bottleneck fairly.',
      ja: 'Wi-Fi と LTE を同時に使う 1 つの接続。スケジューラ、経路が切れたとき、ボトルネックの公平な分け合い。',
    },
    conceptDeck: 'mptcp',
    difficulty: 'advanced',
    tags: ['TCP'],
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
    conceptDeck: 'acl',
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
    conceptDeck: 'multicast',
    difficulty: 'advanced',
    tags: ['IGMP'],
  },
  // ── Services ──
  {
    path: '/networking/pim',
    category: 'areas',
    module: './networking/PimDemo',
    title: { en: 'PIM multicast routing', ja: 'PIM によるマルチキャストルーティング' },
    desc: {
      en: 'Build PIM sparse-mode trees across routers: the shared tree through the RP, the switch to the source tree, the RPF check and SSM.',
      ja: 'ルータをまたいで PIM スパースモードのツリーを作ります。RP を通る共有ツリー、送信元ツリーへの切り替え、RPF チェック、SSM。',
    },
    conceptDeck: 'pim',
    difficulty: 'advanced',
    tags: ['IGMP'],
  },
  {
    path: '/tools/terminal',
    category: 'services',
    module: './tools/TerminalDemo',
    title: { en: 'Terminal and simulated servers', ja: '端末と模擬サーバ' },
    desc: {
      en: 'Run ping, traceroute, dig, curl and dhclient on a device; DNS, web and DHCP servers answer inside the page.',
      ja: '機器で ping・traceroute・dig・curl・dhclient を打つと、ページの中の DNS・Web・DHCP サーバが答えます。',
    },
    conceptDeck: 'commands',
    difficulty: 'beginner',
    tags: ['L3', 'L7'],
  },
  {
    path: '/services/dhcp-dns',
    category: 'services',
    module: './services/DhcpDnsDemo',
    title: { en: 'DHCP & DNS', ja: 'DHCP と DNS' },
    desc: {
      en: 'Lease an IP with DHCP, resolve a hostname with DNS, and inspect each service trace before HTTP.',
      ja: 'DHCP で IP を借り、DNS で名前を引き、HTTP を送る前にそれぞれの通信を確認します。',
    },
    conceptDeck: 'dhcp',
    difficulty: 'intermediate',
    tags: ['DHCP', 'DNS'],
  },
  {
    path: '/networking/dhcp-relay',
    category: 'services',
    module: './networking/DhcpRelayDemo',
    title: { en: 'DHCP relay (ip helper-address)', ja: 'DHCP リレー（ip helper-address）' },
    desc: {
      en: 'One DHCP server, many VLANs: follow a DHCP broadcast through a router and see what the server reads to choose an address.',
      ja: '1 台の DHCP サーバーで複数の VLAN をまかないます。DHCP のブロードキャストがルータをどう越えるかを追い、サーバーが何を見てアドレスを選ぶか。',
    },
    conceptDeck: 'dhcp',
    difficulty: 'intermediate',
    tags: ['DHCP'],
  },
  {
    path: '/networking/dhcp-lease',
    category: 'services',
    module: './networking/DhcpLeaseDemo',
    title: { en: 'DHCP lease lifecycle', ja: 'DHCP リースのライフサイクル' },
    desc: {
      en: "A client's only DHCP server dies mid-lease: follow what the client sends, and when.",
      ja: 'クライアントの唯一の DHCP サーバがリースの途中で止まります。クライアントが何をいつ送るかを追います。',
    },
    conceptDeck: 'dhcplease',
    difficulty: 'intermediate',
    tags: ['DHCP'],
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
    conceptDeck: 'dns',
    difficulty: 'intermediate',
    tags: ['DNS'],
  },
  // ── Simulation ──
  {
    path: '/networking/dnssec',
    category: 'services',
    module: './networking/DnssecDemo',
    title: { en: 'DNSSEC validation', ja: 'DNSSEC の検証' },
    desc: {
      en: 'Follow the chain of trust from the root to an answer, and predict the validator’s verdict in four cases.',
      ja: 'ルートから答えまでの信頼の連鎖をたどり、4 つの場面でリゾルバの判定を予想します。',
    },
    conceptDeck: 'dnssec',
    difficulty: 'advanced',
    tags: ['DNS'],
  },
  {
    path: '/simulation/step',
    category: 'simulation',
    module: './simulation/StepSimDemo',
    title: { en: 'Step-by-Step', ja: '1ホップずつ進める' },
    desc: {
      en: 'Trace packet routing decisions hop by hop. See LPM in action — match scores, route candidates, and why each next hop was chosen.',
      ja: '転送の判断を1ホップずつ追います。最長一致がどう効いているか、候補となる経路と選ばれた理由が見えます。',
    },
    conceptDeck: 'ipv4',
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
    conceptDeck: 'ipv4',
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
    conceptDeck: 'nat',
    difficulty: 'advanced',
    tags: ['SNAT', 'DNAT'],
    scenarioId: 'nat-basics',
    sandboxReady: true,
    defaultSandboxTab: 'node',
  },
  {
    path: '/networking/cgnat',
    category: 'simulation',
    module: './networking/CgnatDemo',
    title: { en: 'Carrier-grade NAT', ja: 'キャリアグレード NAT' },
    desc: {
      en: 'Many subscribers behind one public IPv4 address: how its ports are shared out, and what happens when one runs short.',
      ja: '1 つのグローバル IPv4 アドレスの後ろに多くの加入者がいます。ポートをどう分け合い、足りなくなると何が起きるか。',
    },
    conceptDeck: 'cgnat',
    difficulty: 'advanced',
    tags: ['SNAT'],
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
    conceptDeck: 'acl',
    difficulty: 'advanced',
    tags: ['ACL', 'Firewall'],
  },
  {
    path: '/networking/access-security',
    category: 'simulation',
    module: './networking/AccessSecurityDemo',
    title: { en: 'Protecting access ports', ja: 'アクセスポートを守る' },
    desc: {
      en: 'What an access switch lets through a wall socket: 802.1X with RADIUS, port security, DHCP snooping and dynamic ARP inspection.',
      ja: '壁のポートからスイッチが何を通すか。RADIUS と組む 802.1X、ポートセキュリティ、DHCP スヌーピング、ダイナミック ARP インスペクション。',
    },
    conceptDeck: 'portsecurity',
    difficulty: 'intermediate',
    tags: ['ACL'],
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
    conceptDeck: 'ipv4',
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
    conceptDeck: 'tcp',
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
    conceptDeck: 'tcp',
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
    conceptDeck: 'tcp',
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
    conceptDeck: 'tcp',
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
    conceptDeck: 'tcp',
    difficulty: 'advanced',
    tags: ['L4', 'TCP'],
  },
  {
    path: '/networking/tcp-options',
    category: 'simulation',
    module: './networking/TcpOptionsDemo',
    title: { en: 'TCP window scaling and SACK', ja: 'TCP のウィンドウスケールと SACK' },
    desc: {
      en: 'Work out how fast one TCP connection can go to a distant server, then repair several losses in one window with and without SACK.',
      ja: '遠くのサーバーへの TCP 接続 1 本がどこまで速くなれるかを計算し、1 つのウィンドウでの複数の損失を SACK あり・なしで直します。',
    },
    conceptDeck: 'tcpoptions',
    difficulty: 'advanced',
    tags: ['TCP'],
  },
  {
    path: '/networking/tcp-cubic',
    category: 'simulation',
    module: './networking/TcpCubicDemo',
    title: { en: 'CUBIC and RACK-TLP', ja: 'CUBIC と RACK-TLP' },
    desc: {
      en: 'Lose one packet on a fast, long path and see how Reno and CUBIC grow back, then lose the end of a response and see how the sender finds out.',
      ja: '速くて遠い経路でパケットを 1 つ失い、Reno と CUBIC がどう戻るかを見て、次に応答の最後を失わせ、送り手がどう気づくかを確かめます。',
    },
    conceptDeck: 'cubic',
    difficulty: 'advanced',
    tags: ['TCP'],
  },
  {
    path: '/networking/vpc',
    category: 'simulation',
    module: './networking/VpcDemo',
    title: { en: 'Cloud networks (VPC)', ja: 'クラウドのネットワーク（VPC）' },
    desc: {
      en: 'Subnets, gateways and a security group, as the devices that do their jobs.',
      ja: 'サブネット、ゲートウェイ、セキュリティグループを、その仕事をする機器として見ます。',
    },
    conceptDeck: 'vpc',
    difficulty: 'intermediate',
    tags: ['L3', 'L4'],
  },
  {
    path: '/networking/sd-wan',
    category: 'simulation',
    module: './networking/SdwanDemo',
    title: { en: 'SD-WAN', ja: 'SD-WAN' },
    desc: {
      en: 'Each kind of traffic on the cheapest link that meets its needs, moved as the links change.',
      ja: '通信の種類ごとに、条件を満たすいちばん安い回線へ。回線の状態が変われば移します。',
    },
    conceptDeck: 'sdwan',
    difficulty: 'intermediate',
    tags: ['WAN'],
  },
  {
    path: '/networking/ztna',
    category: 'simulation',
    module: './networking/ZtnaDemo',
    title: { en: 'From VPN to zero-trust access', ja: 'VPN からゼロトラストアクセスへ' },
    desc: {
      en: 'A remote worker reaches company apps through a VPN or through an access proxy that checks identity and device.',
      ja: '在宅の利用者が社内アプリへ入るのは VPN か、本人と端末を確かめるアクセスプロキシか。',
    },
    conceptDeck: 'ztna',
    difficulty: 'advanced',
    tags: ['ACL'],
  },
  {
    path: '/networking/netconf',
    category: 'simulation',
    module: './networking/NetconfDemo',
    title: { en: 'NETCONF and YANG', ja: 'NETCONF と YANG' },
    desc: {
      en: 'Push one interface change to three routers with a data model and with a CLI script, and see what each leaves behind.',
      ja: '同じインターフェースの変更を、データモデルと CLI スクリプトで 3 台のルータに送り、それぞれ何が残るかを見ます。',
    },
    conceptDeck: 'netconf',
    difficulty: 'intermediate',
    tags: ['Operations'],
  },
  {
    path: '/networking/telemetry',
    category: 'simulation',
    module: './networking/TelemetryDemo',
    title: { en: 'Streaming telemetry', ja: 'ストリーミングテレメトリ' },
    desc: {
      en: 'A five-minute poll and a ten-second stream of the same link: what each one sees.',
      ja: '同じ回線を 5 分ごとの問い合わせと 10 秒ごとのストリームで見ると、それぞれ何が見えるか。',
    },
    conceptDeck: 'telemetry',
    difficulty: 'intermediate',
    tags: ['Operations'],
  },
  {
    path: '/networking/l4s',
    category: 'simulation',
    module: './networking/L4sDemo',
    title: { en: 'L4S', ja: 'L4S' },
    desc: {
      en: 'One bottleneck, three senders: told it is full by a drop, or early by an ECN mark.',
      ja: '1 つのボトルネックと 3 つの送り手。混雑は、パケットが捨てられて伝わるか、早めの ECN の印で伝わるか。',
    },
    conceptDeck: 'l4s',
    difficulty: 'advanced',
    tags: ['TCP'],
  },
  {
    path: '/networking/ech',
    category: 'simulation',
    module: './networking/EchDemo',
    title: { en: 'Encrypted Client Hello (ECH)', ja: 'Encrypted Client Hello（ECH）' },
    desc: {
      en: 'What someone on the path can read in TLS’s first message, with and without ECH.',
      ja: 'TLS の最初のメッセージから、途中で見ている人に何が読めるか。ECH のありとなしで比べます。',
    },
    conceptDeck: 'ech',
    difficulty: 'advanced',
    tags: ['TLS'],
  },
  {
    path: '/networking/post-quantum',
    category: 'simulation',
    module: './networking/PqKexDemo',
    title: { en: 'Post-quantum key exchange', ja: '耐量子の鍵交換' },
    desc: {
      en: 'X25519, ML-KEM and the hybrid browsers send: what each protects against, and its cost in bytes.',
      ja: 'X25519、ML-KEM、ブラウザが送るハイブリッド。それぞれが何から守り、何バイト増えるか。',
    },
    conceptDeck: 'pqkex',
    difficulty: 'advanced',
    tags: ['TLS'],
  },
  {
    path: '/networking/encrypted-dns',
    category: 'simulation',
    module: './networking/EncryptedDnsDemo',
    title: { en: 'Encrypted DNS', ja: 'DNS の暗号化' },
    desc: {
      en: 'DNS, DoT, DoH and DoQ: what the local network can read, change and block.',
      ja: 'DNS、DoT、DoH、DoQ。手元のネットワークが何を読め、書き換え、止められるか。',
    },
    conceptDeck: 'encdns',
    difficulty: 'intermediate',
    tags: ['DNS'],
  },
  {
    path: '/networking/happy-eyeballs',
    category: 'simulation',
    module: './networking/HappyEyeballsDemo',
    title: { en: 'Happy Eyeballs and NAT64', ja: 'Happy Eyeballs と NAT64' },
    desc: {
      en: 'Two address families, one connection: which one a client uses, and how IPv6-only networks still reach IPv4.',
      ja: '2 つのアドレスファミリーと 1 本の接続。クライアントはどちらを使い、IPv6 だけの網はどう IPv4 に届くか。',
    },
    conceptDeck: 'happyeyeballs',
    difficulty: 'intermediate',
    tags: ['IPv6'],
  },
  {
    path: '/networking/anycast',
    category: 'simulation',
    module: './networking/AnycastDemo',
    title: { en: 'Anycast and CDNs', ja: 'エニーキャストと CDN' },
    desc: {
      en: 'One address announced from many places: which copy a user reaches, and what happens when one goes away.',
      ja: '多くの場所から広告される 1 つのアドレス。利用者はどの拠点に届き、1 つが消えるとどうなるか。',
    },
    conceptDeck: 'anycast',
    difficulty: 'advanced',
    tags: ['BGP'],
  },
  {
    path: '/networking/nat-traversal',
    category: 'simulation',
    module: './networking/NatTraversalDemo',
    title: { en: 'NAT traversal: STUN, TURN and ICE', ja: 'NAT 越え：STUN、TURN、ICE' },
    desc: {
      en: 'Two peers behind different NATs want a direct call: will their packets get through, and which path does ICE choose?',
      ja: '別々の NAT の内側にいる 2 つのピアが直接通話したい。パケットは届く？ ICE はどの経路を選ぶ？',
    },
    conceptDeck: 'stun',
    difficulty: 'advanced',
    tags: ['NAT'],
  },
  {
    path: '/networking/masque',
    category: 'simulation',
    module: './networking/MasqueDemo',
    title: { en: 'MASQUE', ja: 'MASQUE' },
    desc: {
      en: 'UDP through HTTP/3 proxies: who learns your address, the site and what you read.',
      ja: 'HTTP/3 のプロキシ越しの UDP。あなたのアドレス、サイト、中身を、誰が知るか。',
    },
    conceptDeck: 'masque',
    difficulty: 'advanced',
    tags: ['QUIC'],
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
    conceptDeck: 'nat',
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
