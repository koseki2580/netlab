import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AudiencePill } from '../src/components/AudiencePill';
import { ProgressPanel } from '../src/components/progress/ProgressPanel';
import { readUrlParam, useUrlParamSync } from '../src/hooks/useUrlParamSync';
import { scenarioRegistry, scenariosInGroup } from '../src/scenarios';
import {
  NETLAB_DARK_THEME,
  NETLAB_LIGHT_THEME,
  themeToVars,
  type NetlabAudience,
  type NetlabCbSafe,
  type NetlabContrast,
  type NetlabDensity,
  type NetlabPalette,
} from '../src/theme';
import { tutorialRegistry } from '../src/tutorials';
import { scrollToSection } from './hooks/scrollToSection';
import {
  ActiveFilters,
  aggregateTags,
  GalleryEmptyState,
  GalleryFilterControls,
  matchesFilters,
  useGalleryFilters,
  type DemoLike,
} from './galleryFilters';
import { CategoryLanding, type CategoryLandingDemo } from './components/CategoryLanding';
import { LearningMap } from './components/LearningMap';
import { useLearningMap, type LearningTrackInput } from './hooks/useLearningMap';
import { DemoCard } from './components/DemoCard';
import { FeaturedStrip } from './components/FeaturedStrip';
import { SearchBox } from './components/SearchBox';
import { SettingsPopover, type GallerySettings } from './components/SettingsPopover';
import { Sidebar } from './components/Sidebar';

const GITHUB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// GITHUB_ICON is kept for potential future use in Gallery layout
void GITHUB_ICON;

interface DemoCard {
  path: string;
  title: string;
  desc: string;
  scenarioId?: string;
  sandboxReady?: boolean;
  defaultSandboxTab?: 'packet' | 'node' | 'parameters' | 'traffic';
  /** Difficulty and protocol/layer tags for the redesigned gallery. */
  meta?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
  };
}

interface Category {
  id: string;
  label: string;
  color: string;
  demos: DemoCard[];
}

const CATEGORIES: Category[] = [
  {
    id: 'basic',
    label: 'Basic Topologies',
    color: '#3b82f6',
    demos: [
      {
        path: '/basic/minimal',
        title: 'Minimal',
        desc: 'Two nodes directly connected. The simplest possible setup.',
        meta: { difficulty: 'beginner', tags: ['L1–L2'] },
      },
      {
        path: '/basic/three-tier',
        title: 'Three-Tier LAN',
        desc: 'Client → Switch → Server. L2 switching with port and MAC configuration.',
        meta: { difficulty: 'beginner', tags: ['L2', 'MAC'] },
      },
      {
        path: '/basic/star',
        title: 'Star Topology',
        desc: 'One central switch connecting four clients and a server.',
        meta: { difficulty: 'beginner', tags: ['L2'] },
      },
    ],
  },
  {
    id: 'routing',
    label: 'Routing',
    color: '#10b981',
    demos: [
      {
        path: '/routing/client-server',
        title: 'Client–Server',
        desc: 'Full stack: private/public areas, router with static routes, live packet log.',
        meta: { difficulty: 'beginner', tags: ['L3', 'Static'] },
      },
      {
        path: '/routing/multi-hop',
        title: 'Multi-Hop',
        desc: 'Traffic traverses two routers across three subnets before reaching the server.',
        meta: { difficulty: 'intermediate', tags: ['L3'] },
      },
      {
        path: '/routing/dynamic',
        title: 'Dynamic Routing',
        desc: 'Switch between RIP, OSPF, and BGP to compare hop-count, SPF cost, and policy-based path selection.',
        meta: { difficulty: 'intermediate', tags: ['RIP', 'OSPF', 'BGP'] },
      },
      {
        path: '/routing/ospf-convergence',
        title: 'OSPF Convergence',
        desc: 'Watch R1 prefer the low-cost path, then remove the primary link and resend traffic on the recomputed route.',
        scenarioId: 'ospf-convergence',
        sandboxReady: true,
        defaultSandboxTab: 'node',
        meta: { difficulty: 'advanced', tags: ['OSPF'] },
      },
    ],
  },
  {
    id: 'areas',
    label: 'Network Areas',
    color: '#f59e0b',
    demos: [
      {
        path: '/networking/arp',
        title: 'ARP Basics',
        desc: 'Send the first packet, inspect the ARP request/reply, and watch the sender cache fill in.',
        scenarioId: 'basic-arp',
        sandboxReady: true,
        defaultSandboxTab: 'packet',
        meta: { difficulty: 'beginner', tags: ['L2', 'ARP'] },
      },
      {
        path: '/networking/vlan',
        title: 'VLAN Segmentation',
        desc: 'Compare same-VLAN switching against router-on-a-stick inter-VLAN routing, then break the trunk to observe isolation.',
        meta: { difficulty: 'intermediate', tags: ['802.1Q'] },
      },
      {
        path: '/networking/stp',
        title: 'Spanning Tree',
        desc: 'Watch a triangle of switches elect a root bridge, block one redundant port, and reroute B→C traffic through the root.',
        meta: { difficulty: 'advanced', tags: ['STP'] },
      },
      {
        path: '/networking/mtu-fragmentation',
        title: 'MTU & Fragmentation',
        desc: 'Shrink a routed tunnel MTU to watch IPv4 fragment on egress or return ICMP Fragmentation Needed when DF is set.',
        scenarioId: 'fragmented-echo',
        sandboxReady: true,
        defaultSandboxTab: 'node',
        meta: { difficulty: 'advanced', tags: ['L3', 'ICMP'] },
      },
      {
        path: '/networking/link-qos',
        title: 'Per-Link QoS',
        desc: 'Constrain one routed link with bandwidth, propagation delay, seeded loss, and a finite drop-tail queue.',
        sandboxReady: true,
        defaultSandboxTab: 'node',
        meta: { difficulty: 'advanced', tags: ['QoS', 'Loss'] },
      },
      {
        path: '/networking/dscp',
        title: 'DSCP Shaping',
        desc: 'Classify EF and best-effort packets into DRR traffic classes on a shaped link.',
        meta: { difficulty: 'advanced', tags: ['QoS', 'DSCP'] },
      },
      {
        path: '/networking/ecmp',
        title: 'ECMP Multipath',
        desc: 'Hash equal-cost routed flows across two spine paths and inspect the selected bucket per flow.',
        meta: { difficulty: 'advanced', tags: ['Routing', 'ECMP'] },
      },
      {
        path: '/networking/ipv6',
        title: 'IPv6 Dual-Stack',
        desc: 'Send ICMPv6 echo across a dual-stack router and compare v4/v6 route-table entries.',
        meta: { difficulty: 'advanced', tags: ['IPv6', 'ICMPv6'] },
      },
      {
        path: '/networking/ipv6-routing',
        title: 'IPv6 Routing Ecosystem',
        desc: 'Compare OSPFv3 ECMP with MP-BGP IPv6 unicast route exchange.',
        meta: { difficulty: 'advanced', tags: ['IPv6', 'OSPFv3', 'BGP'] },
      },
      {
        path: '/networking/dhcpv6',
        title: 'DHCPv6 And SLAAC',
        desc: 'Toggle Router Advertisement M/O flags and inspect DHCPv6 versus SLAAC address behavior.',
        meta: { difficulty: 'advanced', tags: ['IPv6', 'DHCPv6', 'SLAAC'] },
      },
      {
        path: '/networking/ha',
        title: 'Gateway HA And Link Aggregation',
        desc: 'Fail a first-hop gateway and a LACP member while VRRP and port-channel hashing stay deterministic.',
        meta: { difficulty: 'advanced', tags: ['VRRP', 'HSRP', 'LACP'] },
      },
      {
        path: '/networking/wireless',
        title: 'Wireless 802.11',
        desc: 'Inspect RSSI-derived loss, association, WPA2 four-way messages, and hidden-node collision behavior.',
        meta: { difficulty: 'advanced', tags: ['Wi-Fi', 'WPA2', 'CSMA/CA'] },
      },
      {
        path: '/networking/tunneling/gre',
        title: 'GRE Tunnel',
        desc: 'Wrap an inner IP packet in GRE over an IPv4 underlay and toggle the tunnel key.',
        meta: { difficulty: 'advanced', tags: ['GRE', 'Overlay'] },
      },
      {
        path: '/networking/tunneling/mpls-l3vpn',
        title: 'MPLS L3VPN',
        desc: 'Inspect LDP label mappings, a VPNv4 route import, and a two-label L3VPN stack.',
        meta: { difficulty: 'advanced', tags: ['MPLS', 'L3VPN'] },
      },
      {
        path: '/networking/tunneling/vxlan-evpn',
        title: 'VXLAN EVPN',
        desc: 'Inspect VXLAN UDP/4789 encapsulation, EVPN Type-2/Type-5 learning, and ARP suppression.',
        meta: { difficulty: 'advanced', tags: ['VXLAN', 'EVPN'] },
      },
      {
        path: '/networking/observability',
        title: 'Flow Observability',
        desc: 'Inspect router NetFlow updates and deterministic switch sFlow samples for each forwarded flow.',
        meta: { difficulty: 'advanced', tags: ['NetFlow', 'sFlow'] },
      },
      {
        path: '/networking/udp',
        title: 'UDP Datagram',
        desc: 'Fire a stateless UDP datagram with no handshake. Adjust the port and payload, or send a large payload to trigger fragmentation.',
        meta: { difficulty: 'beginner', tags: ['L4', 'UDP'] },
      },
      {
        path: '/networking/http',
        title: 'HTTP/1.1',
        desc: 'Send GET and POST requests over TCP. Inspect the HTTP request/response lifecycle with Connection: close semantics.',
        meta: { difficulty: 'intermediate', tags: ['L7', 'HTTP'] },
      },
      {
        path: '/networking/https',
        title: 'HTTPS TLS 1.3',
        desc: 'Inspect a deterministic TLS 1.3 handshake before HTTP/1.1 application data.',
        meta: { difficulty: 'advanced', tags: ['TLS', 'HTTPS'] },
      },
      {
        path: '/networking/http2',
        title: 'HTTP/2 Multiplexing',
        desc: 'Inspect interleaved HTTP/2 streams and TCP transport head-of-line blocking.',
        meta: { difficulty: 'advanced', tags: ['HTTP/2', 'HOL'] },
      },
      {
        path: '/networking/http3',
        title: 'HTTP/3 over QUIC',
        desc: 'Inspect QUIC stream isolation and HTTP/3 frame flow under per-stream loss.',
        meta: { difficulty: 'advanced', tags: ['HTTP/3', 'QUIC'] },
      },
      {
        path: '/areas/dmz',
        title: 'DMZ Segmentation',
        desc: 'Classic three-zone topology: Private → DMZ → Public with two border routers.',
        meta: { difficulty: 'intermediate', tags: ['L3'] },
      },
      {
        path: '/networking/multicast',
        title: 'Multicast Snooping',
        desc: 'Join and leave multicast groups to see IGMP snooping restrict L2 forwarding within a VLAN.',
        meta: { difficulty: 'advanced', tags: ['IGMP'] },
      },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    color: '#eab308',
    demos: [
      {
        path: '/services/dhcp-dns',
        title: 'DHCP & DNS',
        desc: 'Lease an IP with DHCP, resolve a hostname with DNS, and inspect each service trace before HTTP.',
        meta: { difficulty: 'intermediate', tags: ['DHCP', 'DNS'] },
      },
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation',
    color: '#8b5cf6',
    demos: [
      {
        path: '/simulation/step',
        title: 'Step-by-Step',
        desc: 'Trace packet routing decisions hop by hop. See LPM in action — match scores, route candidates, and why each next hop was chosen.',
        meta: { difficulty: 'intermediate', tags: ['L3'] },
      },
      {
        path: '/simulation/failure',
        title: 'Failure Injection',
        desc: 'Toggle nodes and links down. Watch packets drop with node-down or no-route reasons. Failed components are highlighted on the canvas.',
        meta: { difficulty: 'intermediate', tags: ['Drop'] },
      },
      {
        path: '/simulation/trace-inspector',
        title: 'Trace Inspector',
        desc: 'Click any hop in the timeline to inspect routing decisions, LPM candidates, TTL values, and drop reasons.',
        meta: { difficulty: 'intermediate', tags: ['Trace'] },
      },
      {
        path: '/simulation/nat',
        title: 'NAT / PAT',
        desc: 'Watch SNAT, DNAT port forwarding, and the live NAT table update on an edge router.',
        scenarioId: 'nat-basics',
        sandboxReady: true,
        defaultSandboxTab: 'node',
        meta: { difficulty: 'advanced', tags: ['SNAT', 'DNAT'] },
      },
      {
        path: '/simulation/acl',
        title: 'Firewalls & ACLs',
        desc: 'Inspect interface ACL permit/deny decisions and stateful return-traffic auto-permit on a firewall router.',
        meta: { difficulty: 'advanced', tags: ['ACL', 'Firewall'] },
      },
      {
        path: '/simulation/interface-aware',
        title: 'Interface-Aware Forwarding',
        desc: 'See which router interface is selected at each hop, with ingress and egress interface names shown in the inspector.',
        meta: { difficulty: 'intermediate', tags: ['L3'] },
      },
      {
        path: '/simulation/session',
        title: 'Session Inspector',
        desc: 'Group request and response traffic into one session lifecycle, with request/response paths and failure-aware status.',
        meta: { difficulty: 'intermediate', tags: ['Session'] },
      },
      {
        path: '/simulation/data-transfer',
        title: 'Data Transfer',
        desc: 'Application-level data transfer with chunking, reassembly, and per-hop forwarding visualization.',
        meta: { difficulty: 'advanced', tags: ['L7'] },
      },
      {
        path: '/simulation/tcp-handshake',
        title: 'TCP Handshake',
        desc: 'Step through SYN, SYN-ACK, ACK, and FIN exchanges while watching connection state and TCP header fields evolve.',
        scenarioId: 'tcp-handshake',
        sandboxReady: true,
        defaultSandboxTab: 'packet',
        meta: { difficulty: 'intermediate', tags: ['L4', 'TCP'] },
      },
      {
        path: '/simulation/tcp-congestion',
        title: 'TCP Congestion Control',
        desc: 'Watch slow start, congestion avoidance, fast retransmit, recovery, and RTO on a deterministic loss trace.',
        meta: { difficulty: 'advanced', tags: ['L4', 'TCP'] },
      },
      {
        path: '/simulation/enterprise',
        title: 'Enterprise Edge',
        desc: 'Boot a corporate client with DHCP, resolve internal DNS, browse through NAT, and inspect ACL decisions in one topology.',
        meta: { difficulty: 'advanced', tags: ['Edge'] },
      },
    ],
  },
  {
    id: 'editor',
    label: 'Interactive Editor',
    color: '#a855f7',
    demos: [
      {
        path: '/topology/controlled',
        title: 'Controlled Topology',
        desc: 'Drag nodes, connect links, and delete edges while a live JSON snapshot stays in sync and can be encoded/restored from the URL.',
        meta: { difficulty: 'intermediate', tags: ['Editor'] },
      },
      {
        path: '/editor',
        title: 'Topology Editor',
        desc: 'Visually add/remove nodes, connect them, edit properties, and undo/redo changes.',
        meta: { difficulty: 'intermediate', tags: ['Editor'] },
      },
    ],
  },
  {
    id: 'integration',
    label: 'Integration',
    color: '#06b6d4',
    demos: [
      {
        path: '/embed',
        title: 'Embed',
        desc: 'NetlabApp embedded inside a host page with fixed width/height. Shows both simulation and static modes.',
        meta: { difficulty: 'beginner', tags: ['Embed'] },
      },
    ],
  },
  {
    id: 'comprehensive',
    label: 'Comprehensive',
    color: '#14b8a6',
    demos: [
      {
        path: '/comprehensive/all-in-one',
        title: 'All-in-One',
        desc: 'Edit topology, run step simulation, inject failures, and inspect packet traces in a single tabbed workflow.',
        sandboxReady: true,
        defaultSandboxTab: 'traffic',
        meta: { difficulty: 'advanced', tags: ['All-in-one'] },
      },
    ],
  },
];

export { CATEGORIES };
export type { Category, DemoCard };

/**
 * Concept tracks for the learning map (C2) — derived from the gallery
 * categories, not authored by hand. Each category is a track; each demo a step
 * keyed by `scenarioId ?? path` so it lines up with the progress provider.
 */
const LEARNING_TRACKS: LearningTrackInput[] = CATEGORIES.map((category) => ({
  id: category.id,
  name: category.label,
  steps: category.demos.map((demo) => ({
    id: demo.scenarioId ?? demo.path,
    label: demo.title,
    path: demo.path,
    ...(demo.meta?.difficulty ? { difficulty: demo.meta.difficulty } : {}),
  })),
}));

type GalleryThemeMode = 'light' | 'dark';
type GalleryLocale = 'en' | 'ja';

interface GalleryProps {
  initialQuery?: string;
  initialThemeMode?: GalleryThemeMode;
  initialActiveSectionId?: string;
  initialLocale?: GalleryLocale;
  /** Audience fallback when neither URL `?audience=` nor localStorage is set. */
  initialAudience?: NetlabAudience;
}

const GALLERY_LOCALE_KEY = 'netlab-locale';
const GALLERY_PALETTE_KEY = 'netlab-palette';
const GALLERY_DENSITY_KEY = 'netlab-density';
const GALLERY_AUDIENCE_KEY = 'netlab-audience';
const GALLERY_CBSAFE_KEY = 'nl_a11y_cbsafe';
const GALLERY_CONTRAST_KEY = 'nl_a11y_contrast';

const PALETTE_VALUES: readonly NetlabPalette[] = ['studio', 'academic'];
const DENSITY_VALUES: readonly NetlabDensity[] = ['compact', 'standard', 'relaxed'];
const AUDIENCE_VALUES: readonly NetlabAudience[] = ['learner', 'pro'];
const CBSAFE_VALUES: readonly NetlabCbSafe[] = ['off', 'on'];
const CONTRAST_VALUES: readonly NetlabContrast[] = ['normal', 'more'];

function isPalette(value: string | null): value is NetlabPalette {
  return value !== null && (PALETTE_VALUES as readonly string[]).includes(value);
}
function isDensity(value: string | null): value is NetlabDensity {
  return value !== null && (DENSITY_VALUES as readonly string[]).includes(value);
}
function isAudience(value: string | null): value is NetlabAudience {
  return value !== null && (AUDIENCE_VALUES as readonly string[]).includes(value);
}
function isCbsafe(value: string | null): value is NetlabCbSafe {
  return value !== null && (CBSAFE_VALUES as readonly string[]).includes(value);
}
function isContrast(value: string | null): value is NetlabContrast {
  return value !== null && (CONTRAST_VALUES as readonly string[]).includes(value);
}

function readStoredAxis<T extends string>(
  key: string,
  guard: (v: string | null) => v is T,
  fallback: T,
): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return guard(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistAxis(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is optional for embedded/private contexts.
  }
}

const GALLERY_COPY: Record<
  GalleryLocale,
  {
    themeEyebrow: Record<GalleryThemeMode, string>;
    title: string;
    body: string;
    localeLabel: string;
    demos: string;
    guidedIntros: string;
    assessments: string;
    sandboxReady: string;
    filteredFrom: string;
  }
> = {
  en: {
    themeEyebrow: {
      light: 'Light-mode demo index',
      dark: 'Dark-mode demo index',
    },
    title: 'Demo gallery',
    body: 'Browse packet-level intros, protocol drills, and full-stack topologies without the flat single-surface look. Each track now has its own visual layer so you can scan by category before opening a demo.',
    localeLabel: 'Language',
    demos: 'demos',
    guidedIntros: 'guided intros',
    assessments: 'assessments',
    sandboxReady: 'sandbox-ready',
    filteredFrom: 'filtered from',
  },
  ja: {
    themeEyebrow: {
      light: 'ライトモードのデモ一覧',
      dark: 'ダークモードのデモ一覧',
    },
    title: 'デモギャラリー',
    body: 'パケット単位のイントロ、プロトコル演習、フルスタックのトポロジをカテゴリごとに見渡せます。デモを開く前に、学びたい領域をすばやく絞り込めます。',
    localeLabel: '言語',
    demos: '件のデモ',
    guidedIntros: '件のガイド',
    assessments: '件のアセスメント',
    sandboxReady: '件がサンドボックス対応',
    filteredFrom: '全件数',
  },
};

function isGalleryLocale(value: string | null): value is GalleryLocale {
  return value === 'en' || value === 'ja';
}

function readStoredGalleryLocale(): GalleryLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const value = window.localStorage.getItem(GALLERY_LOCALE_KEY);
    return isGalleryLocale(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

const SANDBOX_DEMO_ORDER = new Map(
  [
    '/networking/mtu-fragmentation',
    '/simulation/tcp-handshake',
    '/routing/ospf-convergence',
    '/simulation/nat',
  ].map((path, index) => [path, index]),
);
// SANDBOX_DEMO_ORDER is preserved for downstream consumers and future use.
void SANDBOX_DEMO_ORDER;

const SANDBOX_INTROS = [
  {
    id: 'sandbox-intro-mtu',
    title: 'Start here: Sandbox intro',
    desc: 'Guided onboarding on the MTU demo: open the Node tab, lower an MTU, launch traffic, compare baseline and what-if, then continue exploring freely.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
    badge: 'Start Here',
  },
  {
    id: 'sandbox-intro-tcp',
    title: 'TCP handshake intro',
    desc: 'Start a TCP handshake, edit the SYN into a reset, and observe why the connection never establishes.',
    href: '?sandbox=1&sandboxTab=packet&intro=sandbox-intro-tcp#/simulation/tcp-handshake',
    badge: 'Packet Edit',
  },
  {
    id: 'sandbox-intro-ospf',
    title: 'OSPF convergence intro',
    desc: 'Disable a primary routed link, observe the backup path, add a static route, and confirm traffic converges.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-ospf#/routing/ospf-convergence',
    badge: 'Routing Edit',
  },
  {
    id: 'sandbox-intro-nat',
    title: 'NAT intro',
    desc: 'Add a DNAT rule on the edge router, launch outside traffic, inspect translation, then remove the rule and retry.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat',
    badge: 'NAT Edit',
  },
] as const;

function getSandboxHref(demo: DemoCard): string | null {
  if (!demo.sandboxReady) {
    return null;
  }

  const params = new URLSearchParams({ sandbox: '1' });
  if (demo.defaultSandboxTab) {
    params.set('sandboxTab', demo.defaultSandboxTab);
  }
  return `?${params.toString()}#${demo.path}`;
}

function getAssessmentHref(demo: DemoCard): string | null {
  if (!demo.scenarioId) {
    return null;
  }
  const scenario = scenarioRegistry.get(demo.scenarioId);
  if (!scenario?.assessmentRubric) {
    return null;
  }

  const params = new URLSearchParams({
    assessment: demo.scenarioId,
    sandbox: '1',
    sandboxTab: 'assessment',
  });
  return `?${params.toString()}#${demo.path}`;
}

function getCompareHref(demo: DemoCard): string | null {
  if (!demo.scenarioId) return null;
  const group = scenarioRegistry.get(demo.scenarioId)?.topologyGroup;
  if (!group) return null;
  const sibling = scenariosInGroup(group).find(
    (scenario) => scenario.metadata.id !== demo.scenarioId,
  );
  return sibling ? `/compare/${demo.scenarioId}/${sibling.metadata.id}` : null;
}

function normalizeSearchText(parts: (string | undefined)[]): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(' ')
    .toLowerCase();
}

function getDemoSearchText(category: Category, demo: DemoCard): string {
  return normalizeSearchText([
    category.label,
    demo.title,
    demo.desc,
    demo.scenarioId,
    demo.meta?.difficulty,
    ...(demo.meta?.tags ?? []),
  ]);
}

function getIntroSearchText(intro: (typeof SANDBOX_INTROS)[number]): string {
  return normalizeSearchText([intro.title, intro.desc, intro.badge, intro.href]);
}

const CARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
  gap: 16,
};

const SECTION_BLURBS: Record<string, string> = {
  assessments: 'Goal-driven sandbox checks and rubric-backed practice',
  basic: 'Foundational link, switch, and host behavior',
  routing: 'Path selection, route control, and convergence',
  areas: 'Segmentation, services, and protocol-specific network domains',
  services: 'Addressing and name-resolution workflows',
  simulation: 'Trace, failure, and stateful packet analysis tools',
  editor: 'Topology editing and controlled-state workflows',
  integration: 'Embedding and host-page integration examples',
  comprehensive: 'End-to-end workflows that combine multiple tools',
};

function getSectionBlurb(sectionId: string): string {
  return SECTION_BLURBS[sectionId] ?? 'Focused demos in this track';
}

/**
 * Category ids that render the new track landing (hero + recommended order)
 * instead of the legacy card grid. Other categories keep the card grid.
 */
const TRACK_LANDING_IDS = new Set(['routing']);

function demoToLandingDemo(demo: DemoCard): CategoryLandingDemo {
  const layerTag = demo.meta?.tags?.find((t) => /^L\d/.test(t));
  const out: CategoryLandingDemo = {
    id: demo.scenarioId ?? demo.path,
    title: demo.title,
    desc: demo.desc,
    path: demo.path,
  };
  if (demo.meta?.difficulty) out.difficulty = demo.meta.difficulty;
  if (demo.sandboxReady) out.sandboxReady = true;
  if (layerTag) out.layer = layerTag;
  return out;
}

function getSectionSurfaceStyle(accent: string): React.CSSProperties {
  return {
    padding: '24px',
    borderRadius: 'var(--netlab-radius-lg)',
    border: `1px solid color-mix(in srgb, ${accent} 18%, var(--netlab-learning-surface-border))`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, var(--netlab-bg-surface)) 0%, var(--netlab-bg-surface) 100%)`,
    boxShadow: 'var(--netlab-learning-shadow)',
  };
}

function getStatChipStyle(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 'var(--netlab-radius-pill)',
    background: `color-mix(in srgb, ${accent} 10%, var(--netlab-bg-surface))`,
    border: `1px solid color-mix(in srgb, ${accent} 16%, var(--netlab-border))`,
    color: 'var(--netlab-text-primary)',
    fontSize: 11,
    fontWeight: 700,
  };
}

function ThemeModeToggle({
  themeMode,
  onChange,
}: {
  themeMode: GalleryThemeMode;
  onChange: (themeMode: GalleryThemeMode) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        Theme
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--netlab-radius-pill)',
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-bg-primary))',
          border: '1px solid var(--netlab-border)',
        }}
      >
        {(['light', 'dark'] as const).map((mode) => {
          const isActive = themeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(mode)}
              style={{
                border: 'none',
                borderRadius: 'var(--netlab-radius-pill)',
                padding: '7px 12px',
                background: isActive
                  ? 'color-mix(in srgb, var(--netlab-accent-blue) 14%, var(--netlab-bg-surface))'
                  : 'transparent',
                color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocaleToggle({
  locale,
  label,
  onChange,
}: {
  locale: GalleryLocale;
  label: string;
  onChange: (locale: GalleryLocale) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--netlab-radius-pill)',
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-bg-primary))',
          border: '1px solid var(--netlab-border)',
        }}
      >
        {(['en', 'ja'] as const).map((option) => {
          const isActive = locale === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              data-testid={option === 'ja' ? 'gallery-locale-toggle-ja' : undefined}
              onClick={() => onChange(option)}
              style={{
                border: 'none',
                borderRadius: 'var(--netlab-radius-pill)',
                padding: '7px 12px',
                background: isActive
                  ? 'color-mix(in srgb, var(--netlab-accent-green) 14%, var(--netlab-bg-surface))'
                  : 'transparent',
                color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {option === 'en' ? 'en' : '日本語'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({
  dot,
  title,
  blurb,
  count,
}: {
  dot: string;
  title: string;
  blurb: string;
  count: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          marginTop: 4,
          borderRadius: '50%',
          background: dot,
          boxShadow: `0 0 0 6px color-mix(in srgb, ${dot} 14%, white)`,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--netlab-text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
          {blurb}
        </div>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--netlab-text-secondary)',
          background: 'rgba(255, 255, 255, 0.72)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 'var(--netlab-radius-pill)',
          padding: '6px 10px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {count} demos
      </span>
    </div>
  );
}

export default function Gallery({
  initialQuery = '',
  initialThemeMode = 'light',
  initialActiveSectionId = 'featured',
  initialLocale,
  initialAudience = 'pro',
}: GalleryProps) {
  const {
    filters,
    debouncedQ,
    setQuery,
    toggleDifficulty,
    toggleTag,
    setSandboxOnly,
    clearAll,
    isEmpty: filtersEmpty,
  } = useGalleryFilters(initialQuery);
  const query = filters.q;
  const navigate = useNavigate();
  const learningMap = useLearningMap(LEARNING_TRACKS);
  const [themeMode, setThemeMode] = useState<GalleryThemeMode>(() => {
    const fromUrl = readUrlParam('theme');
    if (fromUrl === 'dark' || fromUrl === 'light') return fromUrl;
    return readStoredAxis<GalleryThemeMode>(
      'netlab-theme-mode',
      (v): v is GalleryThemeMode => v === 'dark' || v === 'light',
      initialThemeMode,
    );
  });
  const [palette, setPalette] = useState<NetlabPalette>(() => {
    const fromUrl = readUrlParam('palette');
    if (isPalette(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_PALETTE_KEY, isPalette, 'studio');
  });
  const [density, setDensity] = useState<NetlabDensity>(() => {
    const fromUrl = readUrlParam('density');
    if (isDensity(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_DENSITY_KEY, isDensity, 'standard');
  });
  const [audience, setAudience] = useState<NetlabAudience>(() => {
    const fromUrl = readUrlParam('audience');
    if (isAudience(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_AUDIENCE_KEY, isAudience, initialAudience);
  });
  const [colorBlindSafe, setColorBlindSafe] = useState<NetlabCbSafe>(() =>
    readStoredAxis(GALLERY_CBSAFE_KEY, isCbsafe, 'off'),
  );
  const [contrast, setContrast] = useState<NetlabContrast>(() =>
    readStoredAxis(GALLERY_CONTRAST_KEY, isContrast, 'normal'),
  );
  const [activeSectionId, setActiveSectionId] = useState(initialActiveSectionId);
  const [locale, setLocale] = useState<GalleryLocale>(
    () => initialLocale ?? readStoredGalleryLocale(),
  );
  const mainRef = useRef<HTMLElement | null>(null);
  const normalizedQuery = debouncedQ.trim().toLowerCase();
  const activeTheme = themeMode === 'dark' ? NETLAB_DARK_THEME : NETLAB_LIGHT_THEME;
  const copy = GALLERY_COPY[locale];

  // Two-way bind theme axes to URL params for shareable links.
  useUrlParamSync('theme', themeMode, { defaultValue: 'light' });
  useUrlParamSync('palette', palette, { defaultValue: 'studio' });
  useUrlParamSync('density', density, { defaultValue: 'standard' });
  useUrlParamSync('audience', audience, { defaultValue: 'pro' });

  // Persist axes to localStorage so demo visitors keep their prefs.
  useEffect(() => {
    persistAxis('netlab-theme-mode', themeMode);
  }, [themeMode]);
  useEffect(() => {
    persistAxis(GALLERY_PALETTE_KEY, palette);
  }, [palette]);
  useEffect(() => {
    persistAxis(GALLERY_DENSITY_KEY, density);
  }, [density]);
  useEffect(() => {
    persistAxis(GALLERY_AUDIENCE_KEY, audience);
  }, [audience]);
  useEffect(() => {
    persistAxis(GALLERY_CBSAFE_KEY, colorBlindSafe);
  }, [colorBlindSafe]);
  useEffect(() => {
    persistAxis(GALLERY_CONTRAST_KEY, contrast);
  }, [contrast]);

  const settings: GallerySettings = {
    themeMode,
    palette,
    density,
    audience,
    colorBlindSafe,
    contrast,
  };
  const handleSettingsChange = (next: GallerySettings) => {
    if (next.themeMode !== themeMode) setThemeMode(next.themeMode);
    if (next.palette !== palette) setPalette(next.palette);
    if (next.density !== density) setDensity(next.density);
    if (next.audience !== audience) setAudience(next.audience);
    if (next.colorBlindSafe !== colorBlindSafe) setColorBlindSafe(next.colorBlindSafe);
    if (next.contrast !== contrast) setContrast(next.contrast);
  };

  const filteredCategories = useMemo(() => {
    if (filtersEmpty) {
      return CATEGORIES;
    }

    return CATEGORIES.map((category) => ({
      ...category,
      demos: category.demos.filter((demo) =>
        matchesFilters(
          { ...demo, searchText: getDemoSearchText(category, demo) } as DemoLike,
          filters,
          debouncedQ,
        ),
      ),
    })).filter((category) => category.demos.length > 0);
  }, [filtersEmpty, filters, debouncedQ]);

  // Tag chips are aggregated over the full catalog so they stay stable
  // regardless of the currently applied filters.
  const allTags = useMemo(
    () => aggregateTags(CATEGORIES.flatMap((category) => category.demos as DemoLike[])),
    [],
  );

  const allDemos = filteredCategories.flatMap((cat) => cat.demos);
  const assessmentDemos = allDemos.filter((demo) => getAssessmentHref(demo) !== null);
  const sandboxDemos = allDemos.filter((demo) => demo.sandboxReady).length;
  const filteredIntros = useMemo(() => {
    if (!normalizedQuery) {
      return SANDBOX_INTROS;
    }

    return SANDBOX_INTROS.filter((intro) => getIntroSearchText(intro).includes(normalizedQuery));
  }, [normalizedQuery]);

  // Q9 — the guided-intro hero strip is learner-only; pro reaches tracks directly.
  const showHeroStrip = audience === 'learner' && filteredIntros.length > 0;
  const browseItems = useMemo(() => {
    const items: { id: string; label: string; color: string; count: number }[] = [];
    if (showHeroStrip) {
      items.push({
        id: 'featured',
        label: 'Start here',
        color: 'var(--netlab-accent-yellow)',
        count: filteredIntros.length,
      });
    }
    if (assessmentDemos.length > 0) {
      items.push({
        id: 'assessments',
        label: 'Assessments',
        color: 'var(--netlab-accent-green)',
        count: assessmentDemos.length,
      });
    }
    filteredCategories.forEach((category) => {
      items.push({
        id: category.id,
        label: category.label,
        color: category.color,
        count: category.demos.length,
      });
    });
    return items;
  }, [assessmentDemos.length, filteredCategories, filteredIntros.length, showHeroStrip]);

  const visibleSectionIds = browseItems.map((item) => item.id);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(GALLERY_LOCALE_KEY, locale);
    } catch {
      // Storage is optional for embedded/private contexts.
    }
  }, [locale]);

  useEffect(() => {
    if (visibleSectionIds.length === 0) {
      return;
    }
    if (!visibleSectionIds.includes(activeSectionId)) {
      const nextVisibleSectionId = visibleSectionIds[0];
      if (nextVisibleSectionId) {
        setActiveSectionId(nextVisibleSectionId);
      }
    }
  }, [activeSectionId, visibleSectionIds]);

  useEffect(() => {
    const container = mainRef.current;
    if (!container || visibleSectionIds.length === 0) {
      return;
    }

    const usesOwnScrollContainer = container.scrollHeight > container.clientHeight + 1;

    const updateActiveSection = () => {
      const sections = Array.from(
        container.querySelectorAll<HTMLElement>('[data-gallery-section]'),
      );
      if (sections.length === 0) {
        return;
      }

      const firstSection = sections[0];
      if (!firstSection) {
        return;
      }

      const activationThreshold = usesOwnScrollContainer
        ? container.getBoundingClientRect().top + container.clientHeight * 0.4
        : window.innerHeight * 0.4;
      const passedSections = sections.filter((section) => {
        const sectionId = section.dataset.gallerySection;
        return Boolean(sectionId) && section.getBoundingClientRect().top <= activationThreshold;
      });
      const nextSection = passedSections[passedSections.length - 1] ?? firstSection;
      const nextSectionId = nextSection.dataset.gallerySection ?? activeSectionId;

      setActiveSectionId((current) => (current === nextSectionId ? current : nextSectionId));
    };

    updateActiveSection();
    if (usesOwnScrollContainer) {
      container.addEventListener('scroll', updateActiveSection, { passive: true });
    } else {
      window.addEventListener('scroll', updateActiveSection, { passive: true });
    }
    window.addEventListener('resize', updateActiveSection);

    return () => {
      if (usesOwnScrollContainer) {
        container.removeEventListener('scroll', updateActiveSection);
      } else {
        window.removeEventListener('scroll', updateActiveSection);
      }
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [activeSectionId, visibleSectionIds]);

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const section = mainRef.current?.querySelector<HTMLElement>(
      `[data-gallery-section="${sectionId}"]`,
    );
    // Container-bound scroll (Q5): never bubbles to a host page / iframe.
    scrollToSection(mainRef.current, section ?? null);
  };

  const totalDemoCount = CATEGORIES.reduce((count, category) => count + category.demos.length, 0);
  const noMatches = !filtersEmpty && allDemos.length === 0;

  return (
    <div
      data-netlab-palette={palette}
      data-netlab-density={density}
      data-netlab-audience={audience}
      data-cbsafe={colorBlindSafe}
      data-contrast={contrast}
      style={{
        ...themeToVars(activeTheme, { palette, density, colorBlindSafe, contrast }),
        minHeight: '100vh',
        background: 'var(--netlab-learning-surface-bg)',
        fontFamily: 'monospace',
        color: 'var(--netlab-text-primary)',
        display: 'grid',
        gridTemplateColumns: '248px minmax(0, 1fr)',
      }}
    >
      <Sidebar
        browseItems={browseItems}
        activeSectionId={activeSectionId}
        onSelectSection={handleSelectSection}
      />

      <main
        ref={mainRef}
        data-netlab-gallery-main
        style={{
          // position: relative anchors section offsetTop for container scroll (Q5).
          position: 'relative',
          padding: '24px',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 18%, var(--netlab-bg-primary)) 0%, color-mix(in srgb, var(--netlab-bg-primary) 92%, transparent) 100%)',
        }}
      >
        <div
          data-netlab-search-bar
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            marginBottom: 18,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            flexWrap: 'wrap',
            borderRadius: 'var(--netlab-radius-md)',
            border: '1px solid var(--netlab-learning-surface-border)',
            background: 'var(--netlab-learning-glass-bg)',
            backdropFilter: 'var(--netlab-learning-glass-blur)',
            WebkitBackdropFilter: 'var(--netlab-learning-glass-blur)',
            boxShadow: 'var(--netlab-learning-shadow)',
          }}
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            resultCount={allDemos.length}
            totalCount={totalDemoCount}
          />
        </div>
        <div
          style={{
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            borderRadius: 'var(--netlab-radius-lg)',
            border: '1px solid var(--netlab-learning-surface-border)',
            background: 'var(--netlab-learning-hero-bg)',
            boxShadow: 'var(--netlab-learning-shadow)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 'var(--netlab-radius-pill)',
                background:
                  'color-mix(in srgb, var(--netlab-bg-surface) 80%, var(--netlab-bg-primary))',
                border: '1px solid var(--netlab-border)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.6,
                color: 'var(--netlab-text-secondary)',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {copy.themeEyebrow[themeMode]}
            </div>
            <h1
              data-testid="gallery-heading"
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--netlab-text-primary)',
                margin: 0,
              }}
            >
              {copy.title}
            </h1>
            <p
              style={{
                marginTop: 8,
                color: 'var(--netlab-text-secondary)',
                fontSize: 13,
                lineHeight: 1.65,
                maxWidth: 620,
              }}
            >
              {copy.body}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <span style={getStatChipStyle('var(--netlab-accent-blue)')}>
                {allDemos.length} {copy.demos}
              </span>
              <span style={getStatChipStyle('var(--netlab-accent-yellow)')}>
                {filteredIntros.length} {copy.guidedIntros}
              </span>
              <span style={getStatChipStyle('var(--netlab-accent-green)')}>
                {assessmentDemos.length} {copy.assessments}
              </span>
              <span style={getStatChipStyle('var(--netlab-accent-cyan)')}>
                {sandboxDemos} {copy.sandboxReady}
              </span>
              {!filtersEmpty && (
                <span style={getStatChipStyle('var(--netlab-accent-orange)')}>
                  {copy.filteredFrom} {totalDemoCount}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  color: 'var(--netlab-text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Audience
              </span>
              <AudiencePill variant="learning" value={audience} onChange={setAudience} />
            </div>
            <ThemeModeToggle themeMode={themeMode} onChange={setThemeMode} />
            <SettingsPopover settings={settings} onChange={handleSettingsChange} />
            <LocaleToggle locale={locale} label={copy.localeLabel} onChange={setLocale} />
          </div>
        </div>

        <div
          data-netlab-gallery-filters
          style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <GalleryFilterControls
            filters={filters}
            tags={allTags}
            onToggleDifficulty={toggleDifficulty}
            onToggleTag={toggleTag}
            onSetSandboxOnly={setSandboxOnly}
          />
          {!filtersEmpty && (
            <ActiveFilters
              filters={filters}
              onToggleDifficulty={toggleDifficulty}
              onToggleTag={toggleTag}
              onSetSandboxOnly={setSandboxOnly}
              onClearAll={clearAll}
            />
          )}
        </div>

        <div style={{ padding: '28px 0 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <LearningMap
            map={learningMap}
            compact={audience === 'pro'}
            onOpen={(_id, path) => navigate(path)}
            onResume={(_id, path) => navigate(path)}
          />
          <ProgressPanel />

          {showHeroStrip && (
            <div data-gallery-section="featured">
              <FeaturedStrip intros={filteredIntros} />
            </div>
          )}

          {assessmentDemos.length > 0 && (
            <section
              id="assessments"
              data-gallery-section="assessments"
              style={getSectionSurfaceStyle('var(--netlab-accent-green)')}
            >
              <SectionHeader
                dot="var(--netlab-accent-green)"
                title="Assessments"
                blurb={getSectionBlurb('assessments')}
                count={assessmentDemos.length}
              />
              <div style={CARD_GRID}>
                {assessmentDemos.map((demo) => {
                  const cat = CATEGORIES.find((c) => c.demos.some((d) => d.path === demo.path))!;
                  const tutorial = demo.scenarioId
                    ? tutorialRegistry.findByScenarioId(demo.scenarioId)
                    : undefined;
                  return (
                    <DemoCard
                      key={demo.path}
                      demo={demo}
                      category={cat}
                      audience={audience}
                      progressTargetId={demo.scenarioId ?? demo.path}
                      tutorialHref={
                        tutorial
                          ? `?tutorial=${encodeURIComponent(tutorial.id)}#${demo.path}`
                          : null
                      }
                      sandboxHref={getSandboxHref(demo)}
                      assessmentHref={getAssessmentHref(demo)}
                      compareHref={getCompareHref(demo)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {filteredCategories.map((cat) => {
            if (TRACK_LANDING_IDS.has(cat.id)) {
              return (
                <CategoryLanding
                  key={cat.id}
                  trackId={cat.id}
                  title={cat.label}
                  blurb={getSectionBlurb(cat.id)}
                  accent={cat.color}
                  demos={cat.demos.map(demoToLandingDemo)}
                />
              );
            }
            return (
              <section
                key={cat.id}
                id={cat.id}
                data-gallery-section={cat.id}
                style={getSectionSurfaceStyle(cat.color)}
              >
                <SectionHeader
                  dot={cat.color}
                  title={cat.label}
                  blurb={getSectionBlurb(cat.id)}
                  count={cat.demos.length}
                />
                <div style={CARD_GRID}>
                  {cat.demos.map((demo) => {
                    const tutorial = demo.scenarioId
                      ? tutorialRegistry.findByScenarioId(demo.scenarioId)
                      : undefined;
                    return (
                      <DemoCard
                        key={demo.path}
                        demo={demo}
                        category={cat}
                        audience={audience}
                        progressTargetId={demo.scenarioId ?? demo.path}
                        tutorialHref={
                          tutorial
                            ? `?tutorial=${encodeURIComponent(tutorial.id)}#${demo.path}`
                            : null
                        }
                        sandboxHref={getSandboxHref(demo)}
                        assessmentHref={getAssessmentHref(demo)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          {noMatches && <GalleryEmptyState onClear={clearAll} />}
        </div>
      </main>
    </div>
  );
}

// Keep Link in scope — it is used transitively by DemoCard (which imports it),
// but if the bundler tree-shakes it away this import ensures the module is
// loaded in test environments where DemoCard renders Link.
void Link;
