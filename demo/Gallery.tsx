import type React from 'react';
import { Link } from 'react-router-dom';
import { scenarioRegistry } from '../src/scenarios';
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

const CARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 12,
};

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
        alignItems: 'center',
        gap: 8,
        paddingBottom: 10,
        borderBottom: '1px solid var(--netlab-border)',
        marginBottom: 14,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dot,
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title}</span>
      <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--netlab-text-muted)' }}>
        {blurb}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--netlab-text-muted)' }}>
        {count} demos
      </span>
    </div>
  );
}

export default function Gallery() {
  const allDemos = CATEGORIES.flatMap((cat) => cat.demos);
  const assessmentDemos = allDemos.filter((demo) => getAssessmentHref(demo) !== null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--netlab-bg-primary)',
        fontFamily: 'monospace',
        color: 'var(--netlab-text-primary)',
        display: 'grid',
        gridTemplateColumns: '248px 1fr',
      }}
    >
      <Sidebar categories={CATEGORIES} featuredCount={SANDBOX_INTROS.length} />

      <main style={{ overflowY: 'auto' }}>
        {/* Page header */}
        <div
          style={{
            padding: '24px 32px 20px',
            borderBottom: '1px solid var(--netlab-border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Demo gallery
            </h1>
            <p
              style={{
                marginTop: 6,
                color: 'var(--netlab-text-secondary)',
                fontSize: 12,
                maxWidth: 480,
              }}
            >
              Interactive browser-based network topology visualizer. Each demo is fully
              self-contained — pick one to explore.
            </p>
          </div>
          <SearchBox />
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <FeaturedStrip intros={SANDBOX_INTROS} />

          {assessmentDemos.length > 0 && (
            <section id="assessments">
              <SectionHeader
                dot="var(--netlab-accent-green)"
                title="Assessments"
                blurb="— test your understanding"
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

          {CATEGORIES.map((cat) => (
            <section key={cat.id} id={cat.id}>
              <SectionHeader
                dot={cat.color}
                title={cat.label}
                blurb="— learn the building blocks"
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
        </div>
      </main>
    </div>
  );
}

// Keep Link in scope — it is used transitively by DemoCard (which imports it),
// but if the bundler tree-shakes it away this import ensures the module is
// loaded in test environments where DemoCard renders Link.
void Link;
