import { useNetlabContext } from '../NetlabContext';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: 12,
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(100, 116, 139, 0.4)',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 280,
  maxHeight: 300,
  overflowY: 'auto',
  color: '#e2e8f0',
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
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#94a3b8', fontSize: 10 }}>
        ROUTE TABLE
      </div>
      {routers.map((router) => {
        const routes = routeTable.get(router.id) ?? [];
        return (
          <div key={router.id} style={{ marginBottom: 10 }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: 4 }}>
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: '#64748b' }}>No routes</div>
            ) : (
              routes.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: '#7dd3fc', minWidth: 140 }}>{r.destination}</span>
                  <span style={{ color: '#fbbf24' }}>{r.nextHop}</span>
                  <span style={{ color: '#94a3b8' }}>[{r.protocol}/{r.adminDistance}]</span>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
