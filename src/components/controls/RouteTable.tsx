import React from 'react';
import { useNetlabContext } from '../NetlabContext';

const PANEL_STYLE: React.CSSProperties = {
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
};

const FLOATING_PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: 12,
  zIndex: 100,
};

interface RouteTablePanelProps {
  floating?: boolean;
}

export function RouteTablePanel({ floating = false }: RouteTablePanelProps) {
  const { topology, routeTable } = useNetlabContext();

  const routers = topology.nodes.filter((n) => n.data.role === 'router');

  if (routers.length === 0) {
    return null;
  }

  return (
    <div tabIndex={0} style={floating ? { ...PANEL_STYLE, ...FLOATING_PANEL_STYLE } : PANEL_STYLE}>
      <div
        style={{
          fontWeight: 'bold',
          marginBottom: 8,
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
        }}
      >
        ROUTE TABLE
      </div>
      {routers.map((router) => {
        const routes = routeTable.get(router.id) ?? [];
        return (
          <div key={router.id} style={{ marginBottom: 10 }}>
            <div
              style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold', marginBottom: 4 }}
            >
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: 'var(--netlab-text-muted)' }}>No routes</div>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <caption
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    fontSize: 10,
                    textAlign: 'left',
                    marginBottom: 2,
                    captionSide: 'top',
                  }}
                >
                  Route table for {router.data.label}
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      style={{
                        color: 'var(--netlab-text-secondary)',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        paddingRight: 8,
                        fontSize: 10,
                      }}
                    >
                      Destination
                    </th>
                    <th
                      scope="col"
                      style={{
                        color: 'var(--netlab-text-secondary)',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        paddingRight: 8,
                        fontSize: 10,
                      }}
                    >
                      Next Hop
                    </th>
                    <th
                      scope="col"
                      style={{
                        color: 'var(--netlab-text-secondary)',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        fontSize: 10,
                      }}
                    >
                      Proto/AD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          color: 'var(--netlab-accent-cyan)',
                          minWidth: 140,
                          paddingRight: 8,
                          paddingBottom: 2,
                        }}
                      >
                        {r.destination}
                      </td>
                      <td
                        style={{
                          color: 'var(--netlab-accent-yellow)',
                          paddingRight: 8,
                          paddingBottom: 2,
                        }}
                      >
                        {r.nextHop}
                      </td>
                      <td style={{ color: 'var(--netlab-text-secondary)', paddingBottom: 2 }}>
                        [{r.protocol}/{r.adminDistance}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RouteTable() {
  return <RouteTablePanel floating />;
}
