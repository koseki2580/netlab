import { Link } from 'react-router-dom';

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
    id: 'editor',
    label: 'Interactive Editor',
    color: '#a855f7',
    demos: [
      {
        path: '/editor',
        title: 'Topology Editor',
        desc: 'Visually add/remove nodes, connect them, edit properties, and undo/redo changes.',
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 'bold' }}>📡 netlab</span>
          <span style={{ color: '#475569', fontSize: 13 }}>network visualization demo</span>
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
