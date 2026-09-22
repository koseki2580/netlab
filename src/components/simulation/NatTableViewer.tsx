import { memo, useContext } from 'react';
import type { TranslatorFn } from '../../i18n/types';
import { useI18n } from '../../i18n/useI18n';
import { useSimulation } from '../../simulation/SimulationContext';
import type { NatTable } from '../../types/nat';
import { useNetlabContext } from '../NetlabContext';
import { NetlabUIContext } from '../NetlabUIContext';

const PANEL_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  overflow: 'hidden',
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
};

function isNatCapableRouter(
  routerId: string,
  nodes: { id: string; data: { role: string; interfaces?: { nat?: 'inside' | 'outside' }[] } }[],
): boolean {
  const node = nodes.find((candidate) => candidate.id === routerId);
  if (node?.data.role !== 'router') return false;
  const interfaces = node.data.interfaces ?? [];
  return (
    interfaces.some((iface) => iface.nat === 'inside') &&
    interfaces.some((iface) => iface.nat === 'outside')
  );
}

function resolveNodeLabel(
  nodeId: string | undefined,
  nodes: { id: string; data: { label: string } }[],
  t: TranslatorFn,
): string {
  if (!nodeId) return t('simulation.nat.routerFallback');
  return nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
}

function resolvePreferredTable(natTables: NatTable[], routerId: string | null): NatTable | null {
  if (!routerId) return null;
  return natTables.find((table) => table.routerId === routerId) ?? { routerId, entries: [] };
}

export const NatTableViewer = memo(function NatTableViewer() {
  const { t } = useI18n();
  const { topology } = useNetlabContext();
  const { state } = useSimulation();
  const ui = useContext(NetlabUIContext);

  const selectedRouterId =
    ui?.selectedNodeId && isNatCapableRouter(ui.selectedNodeId, topology.nodes)
      ? ui.selectedNodeId
      : null;
  const selectedHopRouterId =
    state.selectedHop?.nodeId && isNatCapableRouter(state.selectedHop.nodeId, topology.nodes)
      ? state.selectedHop.nodeId
      : null;

  const preferredTable =
    resolvePreferredTable(state.natTables, selectedRouterId) ??
    resolvePreferredTable(state.natTables, selectedHopRouterId) ??
    state.natTables.find((table) => table.entries.length > 0) ??
    null;

  const entries = preferredTable?.entries ?? [];
  const routerLabel = preferredTable
    ? resolveNodeLabel(preferredTable.routerId, topology.nodes, t)
    : null;

  return (
    <div style={PANEL_STYLE}>
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          background: 'var(--netlab-bg-panel)',
        }}
      >
        <div
          style={{
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          {t('simulation.nat.heading')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
          {routerLabel
            ? t('simulation.nat.router', { router: routerLabel })
            : t('simulation.nat.empty')}
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: '16px 14px',
            color: 'var(--netlab-text-secondary)',
            fontSize: 12,
          }}
        >
          {t('simulation.nat.empty')}
        </div>
      ) : (
        <div
          style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '72px minmax(150px, 1.2fr) minmax(150px, 1.2fr) minmax(150px, 1.2fr) 72px',
              gap: 8,
              color: 'var(--netlab-text-secondary)',
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: 0.5,
            }}
          >
            <span>{t('simulation.nat.column.proto')}</span>
            <span>{t('simulation.nat.column.insideLocal')}</span>
            <span>{t('simulation.nat.column.insideGlobal')}</span>
            <span>{t('simulation.nat.column.outsidePeer')}</span>
            <span>{t('simulation.nat.column.type')}</span>
          </div>

          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '72px minmax(150px, 1.2fr) minmax(150px, 1.2fr) minmax(150px, 1.2fr) 72px',
                gap: 8,
                padding: '8px 0',
                borderTop: '1px solid var(--netlab-border-subtle)',
                fontSize: 11,
                color: 'var(--netlab-text-primary)',
              }}
            >
              <span>{entry.proto.toUpperCase()}</span>
              <span>
                {entry.insideLocalIp}:{entry.insideLocalPort}
              </span>
              <span>
                {entry.insideGlobalIp}:{entry.insideGlobalPort}
              </span>
              <span>
                {entry.outsidePeerIp}:{entry.outsidePeerPort}
              </span>
              <span>{entry.type.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
