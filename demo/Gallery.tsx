import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressPanel } from '../src/components/progress/ProgressPanel';
import { scenarioRegistry } from '../src/scenarios';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from '../src/theme';
import { tutorialRegistry } from '../src/tutorials';
import { DemoCard } from './components/DemoCard';
import { FeaturedStrip } from './components/FeaturedStrip';
import { SearchBox } from './components/SearchBox';
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

type GalleryThemeMode = 'light' | 'dark';
type GalleryLocale = 'en' | 'ja';

interface GalleryProps {
  initialQuery?: string;
  initialThemeMode?: GalleryThemeMode;
  initialActiveSectionId?: string;
  initialLocale?: GalleryLocale;
}

const GALLERY_LOCALE_KEY = 'netlab-locale';

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

function getSectionSurfaceStyle(accent: string): React.CSSProperties {
  return {
    padding: '24px',
    borderRadius: 28,
    border: `1px solid color-mix(in srgb, ${accent} 18%, var(--netlab-border))`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, ${accent} 4%, var(--netlab-bg-primary)) 100%)`,
    boxShadow: '0 20px 44px rgba(15, 23, 42, 0.07)',
  };
}

function getStatChipStyle(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
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
          borderRadius: 999,
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
                borderRadius: 999,
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
          borderRadius: 999,
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
              onClick={() => onChange(option)}
              style={{
                border: 'none',
                borderRadius: 999,
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
          borderRadius: 999,
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
}: GalleryProps) {
  const [query, setQuery] = useState(initialQuery);
  const [themeMode, setThemeMode] = useState<GalleryThemeMode>(initialThemeMode);
  const [activeSectionId, setActiveSectionId] = useState(initialActiveSectionId);
  const [locale, setLocale] = useState<GalleryLocale>(
    () => initialLocale ?? readStoredGalleryLocale(),
  );
  const mainRef = useRef<HTMLElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const activeTheme = themeMode === 'dark' ? NETLAB_DARK_THEME : NETLAB_LIGHT_THEME;
  const copy = GALLERY_COPY[locale];

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      return CATEGORIES;
    }

    return CATEGORIES.map((category) => ({
      ...category,
      demos: category.demos.filter((demo) =>
        getDemoSearchText(category, demo).includes(normalizedQuery),
      ),
    })).filter((category) => category.demos.length > 0);
  }, [normalizedQuery]);

  const allDemos = filteredCategories.flatMap((cat) => cat.demos);
  const assessmentDemos = allDemos.filter((demo) => getAssessmentHref(demo) !== null);
  const sandboxDemos = allDemos.filter((demo) => demo.sandboxReady).length;
  const filteredIntros = useMemo(() => {
    if (!normalizedQuery) {
      return SANDBOX_INTROS;
    }

    return SANDBOX_INTROS.filter((intro) => getIntroSearchText(intro).includes(normalizedQuery));
  }, [normalizedQuery]);

  const browseItems = useMemo(() => {
    const items: { id: string; label: string; color: string; count: number }[] = [];
    if (filteredIntros.length > 0) {
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
  }, [assessmentDemos.length, filteredCategories, filteredIntros.length]);

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
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalDemoCount = CATEGORIES.reduce((count, category) => count + category.demos.length, 0);
  const noMatches = normalizedQuery.length > 0 && browseItems.length === 0;

  return (
    <div
      style={{
        ...themeToVars(activeTheme),
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, color-mix(in srgb, var(--netlab-accent-cyan) 10%, var(--netlab-bg-surface)), transparent 26%), radial-gradient(circle at top right, color-mix(in srgb, var(--netlab-accent-yellow) 10%, var(--netlab-bg-surface)), transparent 24%), linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 28%, var(--netlab-bg-primary)) 0%, var(--netlab-bg-primary) 100%)',
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
        style={{
          overflowY: 'auto',
          padding: '24px',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 18%, var(--netlab-bg-primary)) 0%, color-mix(in srgb, var(--netlab-bg-primary) 92%, transparent) 100%)',
        }}
      >
        <div
          style={{
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            borderRadius: 30,
            border:
              '1px solid color-mix(in srgb, var(--netlab-accent-blue) 16%, var(--netlab-border))',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--netlab-accent-blue) 10%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 86%, var(--netlab-bg-primary)) 55%, color-mix(in srgb, var(--netlab-accent-yellow) 10%, var(--netlab-bg-primary)) 100%)',
            boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 999,
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
              {normalizedQuery && (
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
            <ThemeModeToggle themeMode={themeMode} onChange={setThemeMode} />
            <LocaleToggle locale={locale} label={copy.localeLabel} onChange={setLocale} />
            <SearchBox
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              resultCount={allDemos.length}
              totalCount={totalDemoCount}
            />
          </div>
        </div>

        <div style={{ padding: '28px 0 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ProgressPanel />

          {filteredIntros.length > 0 && (
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
          )}

          {filteredCategories.map((cat) => (
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
          ))}

          {noMatches && (
            <section style={getSectionSurfaceStyle('var(--netlab-accent-orange)')}>
              <SectionHeader
                dot="var(--netlab-accent-orange)"
                title="No matches"
                blurb={`No demos matched “${query}”. Try a protocol name, category, or layer tag.`}
                count={0}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// Keep Link in scope — it is used transitively by DemoCard (which imports it),
// but if the bundler tree-shakes it away this import ensures the module is
// loaded in test environments where DemoCard renders Link.
void Link;
