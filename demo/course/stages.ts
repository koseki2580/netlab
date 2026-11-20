import type { DeviceLevel, ExerciseLevel } from '../exercises/model/types';
import { packetSummary } from '../exercises/packet/packetSource';
import { levelSummary } from '../exercises/store/estimate';
import type { AttemptRecord } from '../exercises/store/types';
import { COURSE_PATH, type LessonPath } from '../lessonManifest';
import { examRoute } from './examAttempt';

/**
 * The learning path: seven stages, each lessons → configuration exercises →
 * packet exercises → exam, the exam opening the next stage.
 *
 * The stages are laid over what exists today: manifest lessons, the device and
 * packet exercise levels, and the tests. Every stage has a test of its own:
 * levels 5, 6, 7 and 8 were written for stages 1, 2, 3 and 7; levels 1 and 2
 * close stages 4 and 5; levels 3 and 4 close stage 6. Where a topic has no
 * lesson yet, it is listed as coming soon.
 *
 * Only passing is gated: every lesson and checkpoint of a locked stage can
 * still be opened. Nothing is stored here; progress is read from the progress
 * record and the exercise attempt store (`stageFacts`).
 */

export interface Localised {
  readonly en: string;
  readonly ja: string;
}

/** One thing a stage asks the learner to pass. */
export type Checkpoint =
  | { readonly kind: 'course' }
  | { readonly kind: 'config'; readonly level: DeviceLevel }
  | { readonly kind: 'packet'; readonly level: ExerciseLevel }
  | { readonly kind: 'exam'; readonly level: number };

export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Stage {
  readonly number: StageNumber;
  readonly title: Localised;
  /** What the stage is about, in one line. */
  readonly topics: Localised;
  /** The beginner course comes first in stage 1; it is a page of its own, not a manifest lesson. */
  readonly withCourse?: true;
  readonly lessons: readonly LessonPath[];
  /** In order: configuration exercises, packet exercises, then the exam. */
  readonly checkpoints: readonly Checkpoint[];
  /** Planned topics that have no lesson yet. */
  readonly comingSoon: readonly Localised[];
}

export const STAGES: readonly Stage[] = [
  {
    number: 1,
    title: { en: 'Getting ready', ja: '準備' },
    topics: {
      en: 'Addresses, the parts of a network, and how to read a "/number"',
      ja: 'アドレス、ネットワークの部品、「/数字」の読み方',
    },
    withCourse: true,
    lessons: ['/learning/bits', '/learning/subnetting', '/learning/protocols', '/basic/minimal'],
    checkpoints: [{ kind: 'course' }, { kind: 'exam', level: 5 }],
    comingSoon: [],
  },
  {
    number: 2,
    title: { en: 'LAN', ja: 'LAN' },
    topics: {
      en: 'Ethernet, MAC addresses, switches, VLANs, ARP, and the physical layer',
      ja: 'イーサネット、MAC アドレス、スイッチ、VLAN、ARP、物理層',
    },
    lessons: [
      '/basic/three-tier',
      '/basic/star',
      '/networking/arp',
      '/networking/vlan',
      '/networking/physical-layer',
    ],
    checkpoints: [
      { kind: 'config', level: 1 },
      { kind: 'packet', level: 1 },
      { kind: 'exam', level: 6 },
    ],
    comingSoon: [],
  },
  {
    number: 3,
    title: { en: 'IP', ja: 'IP' },
    topics: {
      en: 'Addressing, static routing, the hop-by-hop path and packet size',
      ja: 'アドレス設計、静的ルーティング、1 ホップずつの経路、パケットの大きさ',
    },
    lessons: [
      '/learning/vlsm',
      '/routing/client-server',
      '/networking/icmp',
      '/learning/routing-decision',
      '/learning/visual-routing',
      '/routing/multi-hop',
      '/simulation/step',
      '/simulation/trace-inspector',
      '/learning/packet-journey',
      '/networking/mtu-fragmentation',
      '/simulation/interface-aware',
    ],
    checkpoints: [
      { kind: 'config', level: 2 },
      { kind: 'packet', level: 2 },
      { kind: 'packet', level: 3 },
      { kind: 'exam', level: 7 },
    ],
    comingSoon: [],
  },
  {
    number: 4,
    title: { en: 'Transport and services', ja: 'トランスポートとサービス' },
    topics: {
      en: 'UDP and TCP, DNS and DNSSEC, DHCP and relays, HTTP and NAT',
      ja: 'UDP と TCP、DNS と DNSSEC、DHCP とリレー、HTTP、NAT',
    },
    lessons: [
      '/networking/udp',
      '/simulation/tcp-handshake',
      '/simulation/tcp-flow-control',
      '/services/dhcp-dns',
      '/networking/dhcp-relay',
      '/services/dns-resolution',
      '/networking/dnssec',
      '/networking/http',
      '/simulation/nat',
      '/simulation/session',
      '/simulation/data-transfer',
      '/tools/terminal',
    ],
    checkpoints: [{ kind: 'exam', level: 1 }],
    comingSoon: [],
  },
  {
    number: 5,
    title: { en: 'Enterprise', ja: '企業ネットワーク' },
    topics: {
      en: 'Spanning tree, OSPF and BFD, ACLs, redundancy, QoS, logs and time, IPv6, and wireless up to Wi-Fi 7 and WPA3',
      ja: 'スパニングツリー、OSPF と BFD、ACL、冗長化、QoS、ログと時刻、IPv6、無線（Wi-Fi 7 と WPA3 まで）',
    },
    lessons: [
      '/networking/stp',
      '/networking/rstp',
      '/routing/dynamic',
      '/routing/ospf-convergence',
      '/networking/bfd',
      '/routing/ospf-areas',
      '/simulation/acl',
      '/areas/dmz',
      '/simulation/failure',
      '/learning/resilience',
      '/networking/ha',
      '/networking/link-qos',
      '/networking/dscp',
      '/networking/qos-queuing',
      '/networking/net-ops',
      '/networking/ipv6',
      '/networking/ipv6-routing',
      '/networking/dhcpv6',
      '/networking/wireless',
      '/networking/modern-wifi',
      '/simulation/enterprise',
    ],
    checkpoints: [
      { kind: 'config', level: 3 },
      { kind: 'packet', level: 4 },
      { kind: 'exam', level: 2 },
    ],
    comingSoon: [],
  },
  {
    number: 6,
    title: { en: 'Providers and data centres', ja: '事業者とデータセンター' },
    topics: {
      en: 'IS-IS, BGP policy and RPKI, multipath and spine-leaf, load balancers, tunnels and site-to-site VPNs, MPLS and segment routing, VXLAN/EVPN and multicast',
      ja: 'IS-IS、BGP のポリシーと RPKI、複数経路とスパイン・リーフ、ロードバランサ、トンネルと拠点間 VPN、MPLS とセグメントルーティング、VXLAN/EVPN、マルチキャスト',
    },
    lessons: [
      '/networking/isis',
      '/networking/bgp-policy',
      '/networking/rpki',
      '/networking/ecmp',
      '/networking/spine-leaf',
      '/networking/load-balancer',
      '/networking/tunneling/gre',
      '/networking/vpn-tunnel',
      '/networking/tunneling/mpls-l3vpn',
      '/networking/segment-routing',
      '/networking/tunneling/vxlan-evpn',
      '/networking/multicast',
      '/networking/observability',
    ],
    // Level 4 ("Expert") goes deeper into the enterprise and provider topics
    // than the stage 7 lessons; it is a second test of stage 6.
    checkpoints: [
      // Reading packets in a GRE or VXLAN tunnel and across an MPLS core (REQ-353).
      { kind: 'packet', level: 5 },
      { kind: 'exam', level: 3 },
      { kind: 'exam', level: 4 },
    ],
    comingSoon: [],
  },
  {
    number: 7,
    title: { en: 'Modern and cloud', ja: '最新とクラウド' },
    topics: {
      en: 'TLS 1.3, ECH and post-quantum keys, HTTP/2, HTTP/3 and QUIC migration, congestion control and L4S, MASQUE, encrypted DNS, Happy Eyeballs and NAT64, anycast and CDNs, cloud networks, SD-WAN, NETCONF/YANG and telemetry',
      ja: 'TLS 1.3、ECH と耐量子の鍵、HTTP/2、HTTP/3 と QUIC の接続移行、輻輳制御と L4S、MASQUE、DNS の暗号化、Happy Eyeballs と NAT64、エニーキャストと CDN、クラウド、SD-WAN、NETCONF/YANG、テレメトリ',
    },
    lessons: [
      '/networking/https',
      '/networking/ech',
      '/networking/post-quantum',
      '/networking/encrypted-dns',
      '/networking/happy-eyeballs',
      '/networking/anycast',
      '/networking/http2',
      '/networking/http3',
      '/networking/quic-migration',
      '/networking/masque',
      '/simulation/tcp-congestion',
      '/networking/l4s',
      '/networking/vpc',
      '/networking/sd-wan',
      '/networking/netconf',
      '/networking/telemetry',
    ],
    checkpoints: [{ kind: 'exam', level: 8 }],
    comingSoon: [],
  },
];

/** Tools rather than lessons: not on the path. */
export const OFF_PATH: readonly LessonPath[] = [
  '/topology/controlled',
  '/editor',
  '/embed',
  '/comprehensive/all-in-one',
];

/** The test levels, in the order of the stages they belong to. */
export function examLevelsInStageOrder(stages: readonly Stage[] = STAGES): number[] {
  return stages.flatMap((stage) =>
    stage.checkpoints.flatMap((checkpoint) =>
      checkpoint.kind === 'exam' ? [checkpoint.level] : [],
    ),
  );
}

/** What the learner has passed, as plain data. */
export interface StageFacts {
  /** Every step of the beginner course recorded complete. */
  readonly courseDone: boolean;
  /** Device exercise levels whose summary is "cleared". */
  readonly configCleared: readonly number[];
  /** Packet exercise levels whose summary is "cleared". */
  readonly packetCleared: readonly number[];
  /** Exam levels whose pass is recorded. */
  readonly examsPassed: readonly number[];
}

export const NO_PROGRESS: StageFacts = {
  courseDone: false,
  configCleared: [],
  packetCleared: [],
  examsPassed: [],
};

export function checkpointPassed(checkpoint: Checkpoint, facts: StageFacts): boolean {
  switch (checkpoint.kind) {
    case 'course':
      return facts.courseDone;
    case 'config':
      return facts.configCleared.includes(checkpoint.level);
    case 'packet':
      return facts.packetCleared.includes(checkpoint.level);
    case 'exam':
      return facts.examsPassed.includes(checkpoint.level);
  }
}

export interface StageStatus {
  readonly number: StageNumber;
  readonly passed: boolean;
  readonly unlocked: boolean;
  readonly checkpoints: readonly { readonly checkpoint: Checkpoint; readonly passed: boolean }[];
}

/**
 * Each stage, passed or not and open or not. A stage is passed only when every
 * one of its checkpoints is: its test and its exercise levels alike (REQ-112,
 * REQ-198). A test passed earlier stays passed as its checkpoint, but no longer
 * stands in for the exercises. A stage is open when it is the first or the
 * one before is passed.
 */
export function stageStatuses(facts: StageFacts, stages: readonly Stage[] = STAGES): StageStatus[] {
  const passed = stages.map((stage) =>
    stage.checkpoints.every((checkpoint) => checkpointPassed(checkpoint, facts)),
  );
  return stages.map((stage, index) => ({
    number: stage.number,
    passed: passed[index]!,
    unlocked: index === 0 || passed[index - 1]!,
    checkpoints: stage.checkpoints.map((checkpoint) => ({
      checkpoint,
      passed: checkpointPassed(checkpoint, facts),
    })),
  }));
}

/** The first checkpoint not passed in the first stage not passed; null when every stage is passed. */
export function nextThing(
  facts: StageFacts,
  stages: readonly Stage[] = STAGES,
): { readonly stage: StageNumber; readonly checkpoint: Checkpoint } | null {
  const statuses = stageStatuses(facts, stages);
  const index = statuses.findIndex((status) => !status.passed);
  if (index === -1) return null;
  const open = statuses[index]!.checkpoints.find((entry) => !entry.passed);
  return open ? { stage: stages[index]!.number, checkpoint: open.checkpoint } : null;
}

/** Where a checkpoint is done. */
export function checkpointPath(checkpoint: Checkpoint): string {
  switch (checkpoint.kind) {
    case 'course':
      return COURSE_PATH;
    case 'config':
      return `/exercises/level/${checkpoint.level}`;
    case 'packet':
      return `/exercises/packet/level/${checkpoint.level}`;
    case 'exam':
      return examRoute(checkpoint.level);
  }
}

const LEVELS: readonly ExerciseLevel[] = [1, 2, 3, 4, 5];

/**
 * What the learner has passed, read from where it is already kept: completions
 * in the progress record (each course step, `course:exam`, `course:exam:<n>`)
 * and the level summaries of the exercise attempt store.
 */
export function stageFacts({
  isCompleted,
  courseStepIds,
  deviceAttempts,
  packetAttempts,
  examLevels,
}: {
  readonly isCompleted: (id: string) => boolean;
  readonly courseStepIds: readonly string[];
  readonly deviceAttempts: readonly AttemptRecord[];
  readonly packetAttempts: readonly AttemptRecord[];
  readonly examLevels: readonly number[];
}): StageFacts {
  return {
    courseDone: courseStepIds.length > 0 && courseStepIds.every((id) => isCompleted(id)),
    configCleared: LEVELS.filter(
      (level) => levelSummary(deviceAttempts, level).status === 'cleared',
    ),
    packetCleared: LEVELS.filter(
      (level) => packetSummary(packetAttempts, level).status === 'cleared',
    ),
    examsPassed: examLevels.filter((level) =>
      isCompleted(level === 1 ? 'course:exam' : `course:exam:${level}`),
    ),
  };
}

/**
 * A test's name, by the stage it belongs to (REQ-198): "Stage 4 test". A stage
 * with two tests numbers them. The old level names read as going back to the start.
 */
export function examStageName(level: number, stages: readonly Stage[] = STAGES): Localised {
  for (const stage of stages) {
    const levels = stage.checkpoints.flatMap((checkpoint) =>
      checkpoint.kind === 'exam' ? [checkpoint.level] : [],
    );
    const index = levels.indexOf(level);
    if (index === -1) continue;
    const part = levels.length > 1 ? ` ${index + 1}` : '';
    return {
      en: `Stage ${stage.number} test${part}`,
      ja: `Level ${stage.number} のテスト${part}`,
    };
  }
  return { en: `Test ${level}`, ja: `テスト ${level}` };
}
