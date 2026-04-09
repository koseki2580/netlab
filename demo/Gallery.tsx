import { Link } from 'react-router-dom';

const GITHUB_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface DemoCard {
  path: string;
  title: string;
  desc: string;
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
      },
      {
        path: '/basic/three-tier',
        title: 'Three-Tier LAN',
        desc: 'Client → Switch → Server. L2 switching with port and MAC configuration.',
      },
      {
        path: '/basic/star',
        title: 'Star Topology',
        desc: 'One central switch connecting four clients and a server.',
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
      },
      {
        path: '/routing/multi-hop',
        title: 'Multi-Hop',
        desc: 'Traffic traverses two routers across three subnets before reaching the server.',
      },
    ],
  },
  {
    id: 'areas',
    label: 'Network Areas',
    color: '#f59e0b',
    demos: [
      {
        path: '/areas/dmz',
        title: 'DMZ Segmentation',
        desc: 'Classic three-zone topology: Private → DMZ → Public with two border routers.',
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
      },
      {
        path: '/simulation/failure',
        title: 'Failure Injection',
        desc: 'Toggle nodes and links down. Watch packets drop with node-down or no-route reasons. Failed components are highlighted on the canvas.',
      },
      {
        path: '/simulation/trace-inspector',
        title: 'Trace Inspector',
        desc: 'Click any hop in the timeline to inspect routing decisions, LPM candidates, TTL values, and drop reasons.',
      },
      {
        path: '/simulation/nat',
        title: 'NAT / PAT',
        desc: 'Watch SNAT, DNAT port forwarding, and the live NAT table update on an edge router.',
      },
      {
        path: '/simulation/interface-aware',
        title: 'Interface-Aware Forwarding',
        desc: 'See which router interface is selected at each hop, with ingress and egress interface names shown in the inspector.',
      },
      {
        path: '/simulation/session',
        title: 'Session Inspector',
        desc: 'Group request and response traffic into one session lifecycle, with request/response paths and failure-aware status.',
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
      },
      {
        path: '/editor',
        title: 'Topology Editor',
        desc: 'Visually add/remove nodes, connect them, edit properties, and undo/redo changes.',
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
      },
    ],
  },
];

export default function Gallery() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        fontFamily: 'monospace',
        color: '#e2e8f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '32px 40px 24px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 'bold' }}>📡 netlab</span>
            <span style={{ color: '#475569', fontSize: 13 }}>network visualization demo</span>
          </div>
          <a
            href="https://github.com/koseki2580/netlab"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748b',
              textDecoration: 'none',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
            onMouseEnter={(event) => {
              (event.currentTarget as HTMLAnchorElement).style.color = '#94a3b8';
            }}
            onMouseLeave={(event) => {
              (event.currentTarget as HTMLAnchorElement).style.color = '#64748b';
            }}
          >
            {GITHUB_ICON}
            GitHub
          </a>
        </div>
        <p style={{ marginTop: 8, color: '#64748b', fontSize: 12, maxWidth: 480 }}>
          Interactive browser-based network topology visualizer. Each demo is fully self-contained — pick one to explore.
        </p>
      </div>

      {/* Categories */}
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cat.color,
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' }}>
                {cat.label}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {cat.demos.map((demo) => (
                <Link
                  key={demo.path}
                  to={demo.path}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = cat.color;
                      (e.currentTarget as HTMLDivElement).style.background = '#263144';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
                      (e.currentTarget as HTMLDivElement).style.background = '#1e293b';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>
                      {demo.title}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                      {demo.desc}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: cat.color }}>
                      Open →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
