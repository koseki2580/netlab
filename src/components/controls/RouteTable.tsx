import { useNetlabContext } from '../NetlabContext';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: 12,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 280,
  maxHeight: 300,
  overflowY: 'auto',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 100,
};

export function RouteTable() {
  const { topology, routeTable } = useNetlabContext();

  const routers = topology.nodes.filter((n) => n.data.role === 'router');

  if (routers.length === 0) {
    return null;
  }

  return (
    <div style={PANEL_STYLE}>
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: 'var(--netlab-text-secondary)', fontSize: 10 }}>
        ROUTE TABLE
      </div>
      {routers.map((router) => {
        const routes = routeTable.get(router.id) ?? [];
        return (
          <div key={router.id} style={{ marginBottom: 10 }}>
            <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold', marginBottom: 4 }}>
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: 'var(--netlab-text-muted)' }}>No routes</div>
            ) : (
              routes.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: 'var(--netlab-accent-cyan)', minWidth: 140 }}>{r.destination}</span>
                  <span style={{ color: 'var(--netlab-accent-yellow)' }}>{r.nextHop}</span>
                  <span style={{ color: 'var(--netlab-text-secondary)' }}>[{r.protocol}/{r.adminDistance}]</span>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
