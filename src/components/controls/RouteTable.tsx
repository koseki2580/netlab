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

const HEADER_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 28,
  borderBottom: '1px solid var(--netlab-border-subtle)',
  marginBottom: 8,
  paddingBottom: 4,
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
      <div style={HEADER_ROW_STYLE}>
        <span
          style={{
            fontWeight: 700,
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          ROUTE TABLE
        </span>
        <button
          type="button"
          aria-label="Collapse route table"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--netlab-text-muted)',
            fontSize: 12,
            padding: '0 4px',
            fontFamily: 'monospace',
          }}
        >
          ⌃
        </button>
      </div>
      {routers.map((router) => {
        const routes = routeTable.get(router.id) ?? [];
        return (
          <div key={router.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--netlab-accent-green)',
                fontWeight: 700,
                marginBottom: 4,
                fontSize: 11,
              }}
            >
              <span aria-hidden="true">●</span>
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>No routes</div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
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
                  <tr
                    style={{
                      color: 'var(--netlab-text-muted)',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--netlab-bg-panel)',
                    }}
                  >
                    <th scope="col" style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}>
                      Destination
                    </th>
                    <th scope="col" style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}>
                      Next Hop
                    </th>
                    <th scope="col" style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 600 }}>
                      AD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r, idx) => (
                    <tr key={idx} style={{ color: 'var(--netlab-text-primary)' }}>
                      <td
                        style={{
                          padding: '2px 4px',
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.destination}
                      </td>
                      <td
                        style={{
                          padding: '2px 4px',
                          maxWidth: 80,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--netlab-text-secondary)',
                        }}
                      >
                        {r.nextHop === 'direct' ? (
                          <span style={{ color: 'var(--netlab-accent-green)' }}>direct</span>
                        ) : (
                          r.nextHop
                        )}
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--netlab-text-muted)' }}>
                        {r.adminDistance ?? 0}
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
