import React, { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import { routingVerdict } from '../../simulation/pipeline/dispatch/routingHelpers';
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
  const { t } = useI18n();
  const { topology, routeTable } = useNetlabContext();
  // The panel floats over the diagram and can cover the devices a learner is
  // looking at, so its collapse control has to actually collapse it.
  const [collapsed, setCollapsed] = useState(false);
  // The hop the learner is on. When it is a router's forwarding decision, the
  // row it used is marked, so "R-1 finds the matching row" can be seen.
  const currentHop = useOptionalSimulation()?.state.selectedHop ?? null;
  const decision = currentHop?.routingDecision ?? null;

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
          {t('simulation.routeTable.heading')}
        </span>
        <button
          type="button"
          data-testid="route-table-toggle"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? t('simulation.routeTable.expand') : t('simulation.routeTable.collapse')
          }
          onClick={() => setCollapsed((value) => !value)}
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
          {collapsed ? '⌄' : '⌃'}
        </button>
      </div>
      {collapsed ? null : (
        <div data-testid="route-table-body">
          {routers.map((router) => {
            const routes = routeTable.get(router.id) ?? [];
            const routerDecision = decision && currentHop?.nodeId === router.id ? decision : null;
            const winner = routerDecision?.winner ?? null;
            const verdict = routerDecision ? routingVerdict(routerDecision) : null;
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
                  <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
                    {t('simulation.routeTable.none')}
                  </div>
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
                      {t('simulation.routeTable.caption', { router: router.data.label })}
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
                        <th
                          scope="col"
                          title={t('simulation.panelGloss.af.title')}
                          data-testid="route-table-af-header"
                          style={{
                            textAlign: 'left',
                            padding: '2px 4px',
                            fontWeight: 600,
                            cursor: 'help',
                          }}
                        >
                          AF
                        </th>
                        <th
                          scope="col"
                          style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}
                        >
                          {t('simulation.routeTable.column.destination')}
                        </th>
                        <th
                          scope="col"
                          style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}
                        >
                          {t('simulation.routeTable.column.nextHop')}
                        </th>
                        <th
                          scope="col"
                          title={t('simulation.panelGloss.ad.title')}
                          data-testid="route-table-ad-header"
                          style={{
                            textAlign: 'right',
                            padding: '2px 4px',
                            fontWeight: 600,
                            cursor: 'help',
                          }}
                        >
                          AD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((r, idx) => {
                        const used =
                          winner !== null &&
                          r.destination === winner.destination &&
                          r.nextHop === winner.nextHop;
                        return (
                          <tr
                            key={idx}
                            data-testid="route-table-row"
                            data-used={used ? 'true' : undefined}
                            aria-current={used ? 'true' : undefined}
                            style={{
                              color: 'var(--netlab-text-primary)',
                              background: used
                                ? 'color-mix(in srgb, var(--netlab-accent-green) 18%, transparent)'
                                : undefined,
                              outline: used ? '1px solid var(--netlab-accent-green)' : undefined,
                            }}
                          >
                            <td
                              style={{
                                padding: '2px 4px',
                                color: r.destination.includes(':')
                                  ? 'var(--netlab-accent-cyan)'
                                  : 'var(--netlab-text-muted)',
                              }}
                            >
                              {r.destination.includes(':') ? 'v6' : 'v4'}
                            </td>
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
                              {used && (
                                <span
                                  data-testid="route-table-used-badge"
                                  style={{
                                    marginLeft: 6,
                                    color: 'var(--netlab-accent-green)',
                                    fontWeight: 700,
                                  }}
                                >
                                  {t('simulation.routeTable.used')}
                                </span>
                              )}
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
                                <span style={{ color: 'var(--netlab-accent-green)' }}>
                                  {t('simulation.routeTable.direct')}
                                </span>
                              ) : (
                                r.nextHop
                              )}
                            </td>
                            <td
                              style={{
                                padding: '2px 4px',
                                textAlign: 'right',
                                color: 'var(--netlab-text-muted)',
                              }}
                            >
                              {r.adminDistance ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {routerDecision && verdict && (
                  <div
                    data-testid="route-table-verdict"
                    style={{
                      marginTop: 4,
                      padding: '4px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: winner ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-yellow)',
                      border: `1px solid color-mix(in srgb, ${winner ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-yellow)'} 30%, transparent)`,
                    }}
                  >
                    <span style={{ color: 'var(--netlab-text-secondary)' }}>
                      {t('simulation.routeTable.verdictLabel', { dstIp: routerDecision.dstIp })}
                    </span>{' '}
                    {t(verdict.key, verdict.params)}
                  </div>
                )}
              </div>
            );
          })}
          <div
            data-testid="route-table-gloss"
            style={{ color: 'var(--netlab-text-secondary)', fontSize: 10, lineHeight: 1.5 }}
          >
            {t('simulation.panelGloss.routeTableCaption')}
          </div>
        </div>
      )}
    </div>
  );
}

export function RouteTable() {
  return <RouteTablePanel floating />;
}
