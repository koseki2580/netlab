import {
  compareBridgeId,
  DEFAULT_BRIDGE_PRIORITY,
  formatBridgeId,
  makeBridgeId,
} from '../../../layers/l2-datalink/stp/BridgeId';
import { useI18n } from '../../../i18n/useI18n';
import type { NetlabNodeData, NetworkTopology, StpPortRuntime } from '../../../types/topology';
import { stpRoleColor, vlanColor } from '../_colors';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';

export function SwitchDetail({
  nodeId,
  data,
  topology,
}: {
  nodeId: string;
  data: NetlabNodeData;
  topology: NetworkTopology;
}) {
  const { t } = useI18n();
  const ports = data.ports ?? [];
  const hasVlanConfig = ports.some(
    (port) =>
      port.vlanMode !== undefined ||
      port.accessVlan !== undefined ||
      (port.trunkAllowedVlans?.length ?? 0) > 0 ||
      port.nativeVlan !== undefined,
  );
  const stpPortStates: {
    port: (typeof ports)[number];
    runtime: StpPortRuntime;
  }[] = topology.stpStates
    ? ports.reduce<{ port: (typeof ports)[number]; runtime: StpPortRuntime }[]>((entries, port) => {
        const runtime = topology.stpStates?.get(`${nodeId}:${port.id}`);
        if (runtime) {
          entries.push({ port, runtime });
        }
        return entries;
      }, [])
    : [];
  const localBridgeId =
    topology.stpStates && topology.stpRoot && ports.length > 0
      ? makeBridgeId(data.stpConfig?.priority ?? DEFAULT_BRIDGE_PRIORITY, ports)
      : null;
  const isRootBridge = Boolean(
    localBridgeId && topology.stpRoot && compareBridgeId(localBridgeId, topology.stpRoot) === 0,
  );

  return (
    <>
      {ports.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          {t('simulation.nodeDetail.switch.noPorts')}
        </div>
      ) : (
        ports.map((port) => (
          <div key={port.id} style={{ marginBottom: 4 }}>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>
                {t('simulation.nodeDetail.switch.port')}
              </span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>{port.name}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
              <span style={{ color: 'var(--netlab-accent-yellow)' }}>{port.macAddress}</span>
            </div>
            {port.lacp && (
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>LACP</span>
                <span style={{ color: 'var(--netlab-accent-green)' }}>
                  {port.lacp.channelId ?? `key-${port.lacp.key}`} {port.lacp.mode}
                  {port.lacp.fastTimer ? ' fast' : ' slow'}
                </span>
              </div>
            )}
          </div>
        ))
      )}
      {topology.stpStates && stpPortStates.length > 0 && (
        <>
          <div style={SECTION_HEADER_STYLE}>STP</div>
          {topology.stpRoot && localBridgeId && (
            <div
              style={{
                marginBottom: 8,
                padding: '4px 8px',
                borderRadius: 6,
                background: isRootBridge ? 'rgba(56, 189, 248, 0.14)' : 'rgba(148, 163, 184, 0.12)',
                color: isRootBridge ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-secondary)',
              }}
            >
              {isRootBridge
                ? t('simulation.nodeDetail.switch.rootBridge')
                : t('simulation.nodeDetail.switch.nonRoot', {
                    root: formatBridgeId(topology.stpRoot),
                  })}
            </div>
          )}
          {stpPortStates.map(({ port, runtime }) => (
            <div key={`${port.id}-stp`} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>{port.id}</span>
              <span style={{ color: stpRoleColor(runtime.role) }}>
                {runtime.role} ({runtime.state})
              </span>
            </div>
          ))}
        </>
      )}
      {hasVlanConfig && (
        <>
          <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.switch.portVlans')}</div>
          {ports.map((port) => (
            <div
              key={`${port.id}-vlan`}
              style={{
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid var(--netlab-border-subtle)',
              }}
            >
              <div
                style={{
                  color: 'var(--netlab-text-primary)',
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                {port.name}
              </div>
              <div style={ROW_STYLE}>
                <span
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    minWidth: 52,
                  }}
                >
                  {t('simulation.nodeDetail.switch.mode')}
                </span>
                <span style={{ color: 'var(--netlab-text-primary)' }}>
                  {(port.vlanMode ?? 'access').toUpperCase()}
                </span>
              </div>
              <div style={ROW_STYLE}>
                <span
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    minWidth: 52,
                  }}
                >
                  {t('simulation.nodeDetail.switch.access')}
                </span>
                <span
                  style={{
                    color: port.accessVlan
                      ? vlanColor(port.accessVlan)
                      : 'var(--netlab-text-muted)',
                  }}
                >
                  {port.accessVlan ?? '-'}
                </span>
              </div>
              <div style={ROW_STYLE}>
                <span
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    minWidth: 52,
                  }}
                >
                  {t('simulation.nodeDetail.switch.allowed')}
                </span>
                <span style={{ color: 'var(--netlab-text-primary)' }}>
                  {port.trunkAllowedVlans?.join(', ') ?? '-'}
                </span>
              </div>
              <div style={ROW_STYLE}>
                <span
                  style={{
                    color: 'var(--netlab-text-secondary)',
                    minWidth: 52,
                  }}
                >
                  {t('simulation.nodeDetail.switch.native')}
                </span>
                <span style={{ color: vlanColor(port.nativeVlan ?? 1) }}>
                  {port.nativeVlan ?? 1}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
