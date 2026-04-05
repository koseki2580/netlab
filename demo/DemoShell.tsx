import { Link } from 'react-router-dom';

interface DemoShellProps {
  title: string;
  desc: string;
  children: React.ReactNode;
}

export default function DemoShell({ title, desc, children }: DemoShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
      <div
        style={{
          padding: '10px 16px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <Link
          to="/"
          style={{
            color: '#64748b',
            textDecoration: 'none',
            fontFamily: 'monospace',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Gallery
        </Link>
        <div style={{ width: 1, height: 18, background: '#334155' }} />
        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 15 }}>
          📡 netlab
        </span>
        <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
          {title}
        </span>
        <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
          {desc}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
