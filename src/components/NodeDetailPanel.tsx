import { memo, useContext, useEffect, useState } from 'react';
import type { MulticastTableEntry } from '../layers/l2-datalink/MulticastTable';
import {
  compareBridgeId,
  DEFAULT_BRIDGE_PRIORITY,
  formatBridgeId,
  makeBridgeId,
} from '../layers/l2-datalink/stp/BridgeId';
import { SimulationContext } from '../simulation/SimulationContext';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import type {
  NetlabNode,
  NetlabEdge,
  NetlabNodeData,
  NetworkTopology,
  StpPortRuntime,
  TopologySnapshot,
} from '../types/topology';
import type { UdpBindings } from '../types/udp';
import {
  validateCidr,
  validateIpAddress,
  validateMacAddress,
  validateNoDuplicateIp,
  validatePrefixLength,
} from '../utils/networkValidators';
import { getRequired } from '../utils';
import { useNetlabContext } from './NetlabContext';
import { useNetlabUI } from './NetlabUIContext';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: 12,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 260,
  maxHeight: 360,
  overflowY: 'auto',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 200,
  pointerEvents: 'all',
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 3,
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  color: 'var(--netlab-text-secondary)',
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: 1,
  margin: '10px 0 6px',
};

const BADGE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  border: '1px solid var(--netlab-border-subtle)',
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: 0.4,
  padding: '2px 8px',
};

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 4,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '3px 6px',
  width: 88,
};

const FIELD_STACK_STYLE: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 4,
};

const FIELD_ERROR_STYLE: React.CSSProperties = {
  color: 'var(--netlab-accent-red)',
  fontSize: 10,
  lineHeight: 1.3,
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  width: 120,
};

const VLAN_PALETTE = [
  '#38bdf8',
  '#f59e0b',
  '#22c55e',
  '#f97316',
  '#eab308',
  '#ef4444',
  '#14b8a6',
  '#a78bfa',
];

export function vlanColor(vid: number): string {
  return getRequired(VLAN_PALETTE, Math.abs(vid) % VLAN_PALETTE.length, { vid });
}

function stpRoleColor(role: 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED'): string {
  switch (role) {
    case 'ROOT':
      return '#38bdf8';
    case 'DESIGNATED':
      return '#22c55e';
    case 'BLOCKED':
      return '#ef4444';
    case 'DISABLED':
      return '#94a3b8';
    default:
      return 'var(--netlab-text-primary)';
  }
}

function parseMtu(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateNonNegativeInteger(value: string, label: string): string | null {
  const parsed = parseOptionalInteger(value);
  if (parsed === undefined) {
    return null;
  }
  return parsed >= 0 ? null : `${label} must be 0 or greater`;
}

function validatePositiveInteger(value: string, label: string): string | null {
  const parsed = parseOptionalInteger(value);
  if (parsed === undefined || parsed <= 0) {
    return `${label} must be greater than 0`;
  }
  return null;
}

function parseTrunkAllowedVlans(value: string): {
  vlans: number[] | undefined;
  error: string | null;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { vlans: undefined, error: null };
  }

  const parts = trimmed.split(',').map((part) => part.trim());
  const vlans = parts.map((part) => Number.parseInt(part, 10));
  if (vlans.some((v) => !Number.isFinite(v) || v < 0)) {
    return { vlans: undefined, error: 'Allowed VLANs must be a comma-separated number list' };
  }
  return { vlans, error: null };
}

function collectConfiguredIps(
  snapshot: TopologySnapshot,
  ignore?: {
    nodeId?: string;
    interfaceId?: string;
    subInterfaceId?: string;
  },
): string[] {
  return snapshot.nodes.flatMap((candidate) => {
    const ips: string[] = [];
    if (candidate.id !== ignore?.nodeId && typeof candidate.data.ip === 'string') {
      ips.push(candidate.data.ip);
    }

    for (const iface of candidate.data.interfaces ?? []) {
      if (candidate.id === ignore?.nodeId && iface.id === ignore?.interfaceId) {
        continue;
      }
      ips.push(iface.ipAddress);

      for (const subInterface of iface.subInterfaces ?? []) {
        if (
          candidate.id === ignore?.nodeId &&
          iface.id === ignore?.interfaceId &&
          subInterface.id === ignore?.subInterfaceId
        ) {
          continue;
        }
        ips.push(subInterface.ipAddress);
      }
    }

    return ips;
  });
}

function EditableTextRow({
  label,
  name,
  value,
  editable,
  color = 'var(--netlab-text-primary)',
  minWidth = 72,
  width = '100%',
  onCommit,
}: {
  label: string;
  name: string;
  value: string;
  editable: boolean;
  color?: string;
  minWidth?: number;
  width?: number | string;
  onCommit: (value: string) => string | null;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value);
    setError(null);
  }, [value]);

  return (
    <div style={{ ...ROW_STYLE, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ color: 'var(--netlab-text-secondary)', minWidth }}>{label}</span>
      <div style={FIELD_STACK_STYLE}>
        {editable ? (
          <input
            name={name}
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={(event) => setError(onCommit(event.currentTarget.value))}
            style={{ ...INPUT_STYLE, width }}
          />
        ) : (
          <span style={{ color }}>{value || '—'}</span>
        )}
        {error && <span style={FIELD_ERROR_STYLE}>{error}</span>}
      </div>
    </div>
  );
}

function EditableSelectRow({
  label,
  name,
  value,
  editable,
  minWidth = 72,
  options,
  onCommit,
}: {
  label: string;
  name: string;
  value: string;
  editable: boolean;
  minWidth?: number;
  options: { label: string; value: string }[];
  onCommit: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div style={{ ...ROW_STYLE, alignItems: 'center', marginBottom: 6 }}>
      <span style={{ color: 'var(--netlab-text-secondary)', minWidth }}>{label}</span>
      {editable ? (
        <select
          name={name}
          value={localValue}
          onChange={(event) => {
            setLocalValue(event.target.value);
            onCommit(event.target.value);
          }}
          style={SELECT_STYLE}
        >
          {options.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <span style={{ color: 'var(--netlab-text-primary)' }}>{value || '—'}</span>
      )}
    </div>
  );
}

function MtuBadge({ mtu }: { mtu: number | undefined }) {
  const lowMtu = mtu !== undefined && mtu < 1500;
  return (
    <span
      data-low-mtu={lowMtu ? 'true' : 'false'}
      style={{
        ...BADGE_STYLE,
        color: lowMtu ? '#f59e0b' : 'var(--netlab-text-primary)',
        background: lowMtu ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.08)',
        borderColor: lowMtu ? 'rgba(245, 158, 11, 0.3)' : 'var(--netlab-border-subtle)',
      }}
    >
      {mtu === undefined ? 'MTU ∞' : `MTU ${mtu}`}
    </span>
  );
}

function MtuInput({
  name,
  mtu,
  onCommit,
}: {
  name: string;
  mtu: number | undefined;
  onCommit: (mtu: number | undefined) => void;
}) {
  const [localValue, setLocalValue] = useState(mtu === undefined ? '' : String(mtu));

  useEffect(() => {
    setLocalValue(mtu === undefined ? '' : String(mtu));
  }, [mtu]);

  return (
    <input
      name={name}
      type="number"
      min={1}
      placeholder="inherit"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={(event) => onCommit(parseMtu(event.currentTarget.value))}
      style={INPUT_STYLE}
    />
  );
}

function RouterDetail({
  data,
  onInterfaceMtuChange,
  onSubInterfaceMtuChange,
}: {
  data: NetlabNodeData;
  onInterfaceMtuChange?: (interfaceId: string, mtu: number | undefined) => void;
  onSubInterfaceMtuChange?: (
    interfaceId: string,
    subInterfaceId: string,
    mtu: number | undefined,
  ) => void;
}) {
  const ifaces = data.interfaces ?? [];
  return (
    <>
      {ifaces.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>No interfaces</div>
      ) : (
        ifaces.map((iface) => (
          <div key={iface.id} style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: 'var(--netlab-accent-green)',
                  fontWeight: 'bold',
                }}
              >
                {iface.name}
              </div>
              <MtuBadge mtu={iface.mtu} />
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                {iface.ipAddress}/{iface.prefixLength}
              </span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
              <span style={{ color: 'var(--netlab-accent-yellow)' }}>{iface.macAddress}</span>
            </div>
            <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MTU</span>
              <MtuBadge mtu={iface.mtu} />
              {onInterfaceMtuChange && (
                <MtuInput
                  name={`interface-mtu-${iface.id}`}
                  mtu={iface.mtu}
                  onCommit={(mtu) => onInterfaceMtuChange(iface.id, mtu)}
                />
              )}
            </div>
            {(iface.subInterfaces ?? []).length > 0 && (
              <>
                <div style={SECTION_HEADER_STYLE}>SUB-INTERFACES</div>
                {(iface.subInterfaces ?? []).map((subInterface) => (
                  <div
                    key={subInterface.id}
                    style={{
                      marginBottom: 6,
                      paddingLeft: 10,
                      borderLeft: `2px solid ${vlanColor(subInterface.vlanId)}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          color: vlanColor(subInterface.vlanId),
                          fontWeight: 'bold',
                        }}
                      >
                        {subInterface.id}
                      </div>
                      <MtuBadge mtu={subInterface.mtu} />
                    </div>
                    <div style={ROW_STYLE}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        IP
                      </span>
                      <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                        {subInterface.ipAddress}/{subInterface.prefixLength}
                      </span>
                    </div>
                    <div style={ROW_STYLE}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        VLAN
                      </span>
                      <span style={{ color: vlanColor(subInterface.vlanId) }}>
                        {subInterface.vlanId}
                      </span>
                    </div>
                    <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
                      <span
                        style={{
                          color: 'var(--netlab-text-secondary)',
                          minWidth: 36,
                        }}
                      >
                        MTU
                      </span>
                      <MtuBadge mtu={subInterface.mtu} />
                      {onSubInterfaceMtuChange && (
                        <MtuInput
                          name={`subinterface-mtu-${subInterface.id}`}
                          mtu={subInterface.mtu}
                          onCommit={(mtu) =>
                            onSubInterfaceMtuChange(iface.id, subInterface.id, mtu)
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}

function EdgeDetail({
  edge,
  topology,
  onMtuChange,
}: {
  edge: NetlabEdge;
  topology: NetworkTopology;
  onMtuChange?: (mtu: number | undefined) => void;
}) {
  const sourceLabel =
    topology.nodes.find((node) => node.id === edge.source)?.data.label ?? edge.source;
  const targetLabel =
    topology.nodes.find((node) => node.id === edge.target)?.data.label ?? edge.target;
  const mtu = edge.data?.mtuBytes;

  return (
    <>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Source</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{sourceLabel}</span>
      </div>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Target</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{targetLabel}</span>
      </div>
      <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>MTU</span>
        <MtuBadge mtu={mtu} />
        {onMtuChange && <MtuInput name={`edge-mtu-${edge.id}`} mtu={mtu} onCommit={onMtuChange} />}
      </div>
    </>
  );
}

function SwitchDetail({
  nodeId,
  data,
  topology,
}: {
  nodeId: string;
  data: NetlabNodeData;
  topology: NetworkTopology;
}) {
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
        <div style={{ color: 'var(--netlab-text-muted)' }}>No ports</div>
      ) : (
        ports.map((port) => (
          <div key={port.id} style={{ marginBottom: 4 }}>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>Port</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>{port.name}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
              <span style={{ color: 'var(--netlab-accent-yellow)' }}>{port.macAddress}</span>
            </div>
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
                color: isRootBridge ? '#38bdf8' : 'var(--netlab-text-secondary)',
              }}
            >
              {isRootBridge
                ? 'Root bridge'
                : `Non-root (root = ${formatBridgeId(topology.stpRoot)})`}
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
          <div style={SECTION_HEADER_STYLE}>PORT VLANS</div>
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
                  Mode
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
                  Access
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
                  Allowed
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
                  Native
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

function HostDetail({ data, runtimeIp }: { data: NetlabNodeData; runtimeIp?: string }) {
  return (
    <>
      {(runtimeIp ?? data.ip) && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
          <span style={{ color: 'var(--netlab-accent-cyan)' }}>{runtimeIp ?? data.ip}</span>
        </div>
      )}
      {data.mac && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
          <span style={{ color: 'var(--netlab-accent-yellow)' }}>{data.mac}</span>
        </div>
      )}
    </>
  );
}

function HostEditorSection({
  nodeId,
  data,
  editable,
  snapshot,
  updateNode,
}: {
  nodeId: string;
  data: NetlabNodeData;
  editable: boolean;
  snapshot: TopologySnapshot;
  updateNode: (updater: (node: NetlabNode) => NetlabNode) => void;
}) {
  const configuredIps = collectConfiguredIps(snapshot, { nodeId });

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>EDIT HOST</div>
      <EditableTextRow
        label="IP"
        name={`host-ip-${nodeId}`}
        value={data.ip ?? ''}
        editable={editable}
        color="var(--netlab-accent-cyan)"
        minWidth={36}
        onCommit={(nextValue) => {
          const trimmed = nextValue.trim();
          if (trimmed) {
            const ipError =
              validateIpAddress(trimmed) ?? validateNoDuplicateIp(trimmed, configuredIps);
            if (ipError) {
              return ipError;
            }
          }

          if (trimmed === (data.ip ?? '')) {
            return null;
          }

          updateNode((node) => ({
            ...node,
            data:
              trimmed === ''
                ? (() => {
                    const { ip: _ip, ...restData } = node.data;
                    return restData;
                  })()
                : { ...node.data, ip: trimmed },
          }));
          return null;
        }}
      />
      <EditableTextRow
        label="MAC"
        name={`host-mac-${nodeId}`}
        value={data.mac ?? ''}
        editable={editable}
        color="var(--netlab-accent-yellow)"
        minWidth={36}
        onCommit={(nextValue) => {
          const trimmed = nextValue.trim();
          if (trimmed) {
            const macError = validateMacAddress(trimmed);
            if (macError) {
              return macError;
            }
          }

          if (trimmed === (data.mac ?? '')) {
            return null;
          }

          updateNode((node) => ({
            ...node,
            data:
              trimmed === ''
                ? (() => {
                    const { mac: _mac, ...restData } = node.data;
                    return restData;
                  })()
                : { ...node.data, mac: trimmed },
          }));
          return null;
        }}
      />
    </>
  );
}

function RouterEditorSection({
  nodeId,
  data,
  editable,
  snapshot,
  updateNode,
}: {
  nodeId: string;
  data: NetlabNodeData;
  editable: boolean;
  snapshot: TopologySnapshot;
  updateNode: (updater: (node: NetlabNode) => NetlabNode) => void;
}) {
  const interfaces = data.interfaces ?? [];
  const staticRoutes = data.staticRoutes ?? [];
  const dhcpServer = data.dhcpServer;
  const dnsServer = data.dnsServer;

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>EDIT INTERFACES</div>
      {interfaces.map((iface) => (
        <div key={`${iface.id}-edit`} style={{ marginBottom: 10 }}>
          <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold', marginBottom: 4 }}>
            {iface.name}
          </div>
          <EditableTextRow
            label="IP"
            name={`interface-ip-${iface.id}`}
            value={iface.ipAddress}
            editable={editable}
            color="var(--netlab-accent-cyan)"
            minWidth={36}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error =
                validateIpAddress(trimmed) ??
                validateNoDuplicateIp(
                  trimmed,
                  collectConfiguredIps(snapshot, {
                    nodeId,
                    interfaceId: iface.id,
                  }),
                );
              if (error) {
                return error;
              }
              if (trimmed === iface.ipAddress) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, ipAddress: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="Prefix"
            name={`interface-prefix-${iface.id}`}
            value={String(iface.prefixLength)}
            editable={editable}
            minWidth={36}
            onCommit={(nextValue) => {
              const parsed = Number.parseInt(nextValue.trim(), 10);
              const error = validatePrefixLength(parsed);
              if (error) {
                return error;
              }
              if (parsed === iface.prefixLength) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, prefixLength: parsed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="MAC"
            name={`interface-mac-${iface.id}`}
            value={iface.macAddress}
            editable={editable}
            color="var(--netlab-accent-yellow)"
            minWidth={36}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateMacAddress(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === iface.macAddress) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) =>
                    candidate.id === iface.id ? { ...candidate, macAddress: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableSelectRow
            label="NAT"
            name={`interface-nat-${iface.id}`}
            value={iface.nat ?? ''}
            editable={editable}
            minWidth={36}
            options={[
              { label: 'none', value: '' },
              { label: 'inside', value: 'inside' },
              { label: 'outside', value: 'outside' },
            ]}
            onCommit={(nextValue) => {
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  interfaces: (node.data.interfaces ?? []).map((candidate) => {
                    if (candidate.id !== iface.id) {
                      return candidate;
                    }
                    if (!nextValue) {
                      const { nat: _nat, ...restIface } = candidate;
                      return restIface;
                    }
                    return { ...candidate, nat: nextValue as 'inside' | 'outside' };
                  }),
                },
              }));
            }}
          />
        </div>
      ))}

      {staticRoutes.length > 0 && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT STATIC ROUTES</div>
          {staticRoutes.map((route, index) => (
            <div key={`route-${index}`} style={{ marginBottom: 10 }}>
              <EditableTextRow
                label="CIDR"
                name={`route-destination-${index}`}
                value={route.destination}
                editable={editable}
                minWidth={42}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = validateCidr(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === route.destination) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      staticRoutes: (node.data.staticRoutes ?? []).map(
                        (candidate, candidateIndex) =>
                          candidateIndex === index
                            ? { ...candidate, destination: trimmed }
                            : candidate,
                      ),
                    },
                  }));
                  return null;
                }}
              />
              <EditableTextRow
                label="Next"
                name={`route-next-hop-${index}`}
                value={route.nextHop}
                editable={editable}
                minWidth={42}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = trimmed === 'direct' ? null : validateIpAddress(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === route.nextHop) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      staticRoutes: (node.data.staticRoutes ?? []).map(
                        (candidate, candidateIndex) =>
                          candidateIndex === index ? { ...candidate, nextHop: trimmed } : candidate,
                      ),
                    },
                  }));
                  return null;
                }}
              />
            </div>
          ))}
        </>
      )}

      {dhcpServer && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT DHCP SERVER</div>
          <EditableTextRow
            label="Pool"
            name={`dhcp-pool-${nodeId}`}
            value={dhcpServer.leasePool}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateCidr(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === dhcpServer.leasePool) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    leasePool: trimmed,
                  },
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="GW"
            name={`dhcp-default-gateway-${nodeId}`}
            value={dhcpServer.defaultGateway}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              const error = validateIpAddress(trimmed);
              if (error) {
                return error;
              }
              if (trimmed === dhcpServer.defaultGateway) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    defaultGateway: trimmed,
                  },
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="Lease"
            name={`dhcp-lease-time-${nodeId}`}
            value={String(dhcpServer.leaseTime)}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const error = validatePositiveInteger(nextValue, 'Lease time');
              if (error) {
                return error;
              }
              const parsed = Number.parseInt(nextValue.trim(), 10);
              if (parsed === dhcpServer.leaseTime) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  dhcpServer: {
                    ...(node.data.dhcpServer ?? dhcpServer),
                    leaseTime: parsed,
                  },
                },
              }));
              return null;
            }}
          />
        </>
      )}

      {dnsServer && (
        <>
          <div style={SECTION_HEADER_STYLE}>EDIT DNS ZONES</div>
          {dnsServer.zones.map((zone, index) => (
            <div key={`dns-zone-${index}`} style={{ marginBottom: 10 }}>
              <EditableTextRow
                label="Name"
                name={`dns-zone-name-${index}`}
                value={zone.name}
                editable={editable}
                minWidth={52}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  if (!trimmed) {
                    return 'Zone name is required';
                  }
                  if (trimmed === zone.name) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      dnsServer: {
                        ...(node.data.dnsServer ?? dnsServer),
                        zones: (node.data.dnsServer?.zones ?? dnsServer.zones).map(
                          (candidate, candidateIndex) =>
                            candidateIndex === index ? { ...candidate, name: trimmed } : candidate,
                        ),
                      },
                    },
                  }));
                  return null;
                }}
              />
              <EditableTextRow
                label="IP"
                name={`dns-zone-address-${index}`}
                value={zone.address}
                editable={editable}
                minWidth={52}
                onCommit={(nextValue) => {
                  const trimmed = nextValue.trim();
                  const error = validateIpAddress(trimmed);
                  if (error) {
                    return error;
                  }
                  if (trimmed === zone.address) {
                    return null;
                  }
                  updateNode((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      dnsServer: {
                        ...(node.data.dnsServer ?? dnsServer),
                        zones: (node.data.dnsServer?.zones ?? dnsServer.zones).map(
                          (candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, address: trimmed }
                              : candidate,
                        ),
                      },
                    },
                  }));
                  return null;
                }}
              />
            </div>
          ))}
        </>
      )}
    </>
  );
}

function SwitchEditorSection({
  data,
  editable,
  updateNode,
}: {
  data: NetlabNodeData;
  editable: boolean;
  updateNode: (updater: (node: NetlabNode) => NetlabNode) => void;
}) {
  const ports = data.ports ?? [];

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>EDIT PORTS</div>
      {ports.map((port) => (
        <div key={`${port.id}-edit`} style={{ marginBottom: 10 }}>
          <EditableTextRow
            label="Port"
            name={`switch-port-name-${port.id}`}
            value={port.name}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const trimmed = nextValue.trim();
              if (!trimmed || trimmed === port.name) {
                return trimmed ? null : 'Port name is required';
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) =>
                    candidate.id === port.id ? { ...candidate, name: trimmed } : candidate,
                  ),
                },
              }));
              return null;
            }}
          />
          <EditableTextRow
            label="Access"
            name={`switch-port-access-vlan-${port.id}`}
            value={port.accessVlan === undefined ? '' : String(port.accessVlan)}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const error = validateNonNegativeInteger(nextValue, 'Access VLAN');
              if (error) {
                return error;
              }
              const parsed = parseOptionalInteger(nextValue);
              if (parsed === port.accessVlan) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) => {
                    if (candidate.id !== port.id) {
                      return candidate;
                    }
                    if (parsed === undefined) {
                      const { accessVlan: _accessVlan, ...restPort } = candidate;
                      return restPort;
                    }
                    return { ...candidate, accessVlan: parsed };
                  }),
                },
              }));
              return null;
            }}
          />
          <EditableSelectRow
            label="Mode"
            name={`switch-port-mode-${port.id}`}
            value={port.vlanMode ?? ''}
            editable={editable}
            minWidth={52}
            options={[
              { label: 'access', value: 'access' },
              { label: 'trunk', value: 'trunk' },
            ]}
            onCommit={(nextValue) => {
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) =>
                    candidate.id === port.id
                      ? { ...candidate, vlanMode: nextValue as 'access' | 'trunk' }
                      : candidate,
                  ),
                },
              }));
            }}
          />
          <EditableTextRow
            label="Allowed"
            name={`switch-port-allowed-vlans-${port.id}`}
            value={port.trunkAllowedVlans?.join(', ') ?? ''}
            editable={editable}
            minWidth={52}
            onCommit={(nextValue) => {
              const { vlans, error } = parseTrunkAllowedVlans(nextValue);
              if (error) {
                return error;
              }
              const current = port.trunkAllowedVlans?.join(',') ?? '';
              if ((vlans?.join(',') ?? '') === current) {
                return null;
              }
              updateNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  ports: (node.data.ports ?? []).map((candidate) => {
                    if (candidate.id !== port.id) {
                      return candidate;
                    }
                    if (!vlans || vlans.length === 0) {
                      const { trunkAllowedVlans: _allowed, ...restPort } = candidate;
                      return restPort;
                    }
                    return { ...candidate, trunkAllowedVlans: vlans };
                  }),
                },
              }));
              return null;
            }}
          />
        </div>
      ))}
    </>
  );
}

function DhcpLeaseDetail({ lease }: { lease: DhcpLeaseState }) {
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>DHCP LEASE</div>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>Status</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.status.toUpperCase()}</span>
      </div>
      {lease.assignedIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>Assigned IP</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.assignedIp}</span>
        </div>
      )}
      {lease.serverIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>Lease Server</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.serverIp}</span>
        </div>
      )}
      {lease.defaultGateway && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>Default GW</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.defaultGateway}</span>
        </div>
      )}
      {lease.dnsServerIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>DNS Server</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.dnsServerIp}</span>
        </div>
      )}
    </>
  );
}

function DnsCacheDetail({ cache }: { cache: DnsCache }) {
  const entries = Object.entries(cache);
  if (entries.length === 0) return null;

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>DNS CACHE</div>
      {entries.map(([hostname, entry]) => (
        <div key={hostname} style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>{hostname}</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{entry.address}</span>
        </div>
      ))}
    </>
  );
}

function portOwnerLabel(port: number): string {
  switch (port) {
    case 67:
      return 'dhcp-server';
    case 68:
      return 'dhcp-client';
    case 53:
      return 'dns';
    default:
      return 'application';
  }
}

function UdpBindingsDetail({ bindings }: { bindings: UdpBindings }) {
  const hasListening = bindings.listening.length > 0;
  const hasEphemeral = bindings.ephemeral.length > 0;
  if (!hasListening && !hasEphemeral) {
    return (
      <>
        <div style={SECTION_HEADER_STYLE}>UDP BINDINGS</div>
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-muted)' }}>(no active UDP bindings)</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>UDP BINDINGS</div>
      {hasListening && (
        <>
          <div style={{ ...ROW_STYLE, color: 'var(--netlab-text-secondary)' }}>Listening:</div>
          {bindings.listening.map((b) => (
            <div key={`${b.ip}:${b.port}`} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-primary)', minWidth: 150 }}>
                {b.ip}:{b.port}
              </span>
              <span style={{ color: 'var(--netlab-text-muted)' }}>({portOwnerLabel(b.port)})</span>
            </div>
          ))}
        </>
      )}
      {hasEphemeral && (
        <>
          <div style={{ ...ROW_STYLE, color: 'var(--netlab-text-secondary)' }}>Ephemeral out:</div>
          {bindings.ephemeral.map((b) => (
            <div key={`${b.ip}:${b.port}`} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-primary)' }}>
                {b.ip}:{b.port}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export interface NodeDetailPanelProps {
  editable?: boolean;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}

function MulticastSnoopingDetail({ entries }: { entries: MulticastTableEntry[] }) {
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>MULTICAST SNOOPING (IGMP)</div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>(no multicast memberships)</div>
      ) : (
        entries.map((entry) => (
          <div key={`${entry.vlanId}:${entry.multicastMac}`} style={ROW_STYLE}>
            <span style={{ color: vlanColor(entry.vlanId), minWidth: 48 }}>
              vlan={entry.vlanId}
            </span>
            <span style={{ color: 'var(--netlab-accent-yellow)', minWidth: 110 }}>
              {entry.multicastMac}
            </span>
            <span style={{ color: 'var(--netlab-text-primary)' }}>
              ports: {entry.ports.length > 0 ? entry.ports.join(',') : '—'}
            </span>
          </div>
        ))
      )}
    </>
  );
}

function MulticastMembershipDetail({
  memberships,
}: {
  memberships: { interfaceId: string; group: string }[];
}) {
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>MULTICAST MEMBERSHIPS</div>
      {memberships.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>(no multicast memberships)</div>
      ) : (
        memberships.map((m) => (
          <div key={`${m.interfaceId}:${m.group}`} style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-accent-green)', minWidth: 52 }}>
              {m.interfaceId}
            </span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{m.group}</span>
          </div>
        ))
      )}
    </>
  );
}

function JoinedGroupsDetail({ groups }: { groups: string[] }) {
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>JOINED GROUPS</div>
      {groups.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>(no multicast memberships)</div>
      ) : (
        groups.map((group) => (
          <div key={group} style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{group}</span>
          </div>
        ))
      )}
    </>
  );
}

export const NodeDetailPanel = memo(function NodeDetailPanel({
  editable = false,
  onTopologyChange,
}: NodeDetailPanelProps = {}) {
  const { selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId } = useNetlabUI();
  const { topology } = useNetlabContext();
  const simCtx = useContext(SimulationContext);
  const activeSelectionId = selectedEdgeId ?? selectedNodeId;
  const canEdit = editable && onTopologyChange !== undefined;

  useEffect(() => {
    if (!activeSelectionId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId?.(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSelectionId, selectedNodeId, setSelectedEdgeId, setSelectedNodeId]);

  if (!selectedNodeId && !selectedEdgeId) return null;

  const closePanel = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId?.(null);
  };

  const updateSnapshot = (update: (snapshot: TopologySnapshot) => TopologySnapshot) => {
    if (!onTopologyChange) return;
    onTopologyChange(
      update({
        nodes: topology.nodes,
        edges: topology.edges,
        areas: topology.areas,
      }),
    );
  };

  if (selectedEdgeId) {
    const edge = topology.edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return null;

    return (
      <div tabIndex={0} style={PANEL_STYLE}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: 'var(--netlab-text-secondary)',
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            EDGE DETAIL
          </div>
          <button
            onClick={closePanel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--netlab-text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              color: 'var(--netlab-text-primary)',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {edge.id}
          </span>
          <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>link</span>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--netlab-border-subtle)',
            paddingTop: 8,
          }}
        >
          <EdgeDetail
            edge={edge}
            topology={topology}
            {...(onTopologyChange
              ? {
                  onMtuChange: (mtu: number | undefined) => {
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      edges: snapshot.edges.map((candidate) => {
                        if (candidate.id !== edge.id) {
                          return candidate;
                        }
                        const { data: _data, ...restCandidate } = candidate;
                        return mtu === undefined
                          ? restCandidate
                          : {
                              ...restCandidate,
                              data: {
                                ...(candidate.data ?? {}),
                                mtuBytes: mtu,
                              },
                            };
                      }),
                    }));
                  },
                }
              : {})}
          />
        </div>
      </div>
    );
  }

  const node = topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node || !selectedNodeId) return null;

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const updateSelectedNode = (updater: (candidate: NetlabNode) => NetlabNode) => {
    updateSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      nodes: currentSnapshot.nodes.map((candidate) =>
        candidate.id === selectedNodeId ? updater(candidate) : candidate,
      ),
    }));
  };

  const d = node.data;
  const leaseState = simCtx?.getDhcpLeaseState(selectedNodeId) ?? null;
  const dnsCache = simCtx?.getDnsCache(selectedNodeId) ?? null;
  const udpBindings = simCtx?.engine.getUdpBindings(selectedNodeId) ?? null;
  const runtimeIp =
    simCtx?.engine.getRuntimeNodeIp(selectedNodeId) ?? leaseState?.assignedIp ?? undefined;
  const multicastTableSnapshot =
    d.role === 'switch' ? (simCtx?.engine.getMulticastTableSnapshot(selectedNodeId) ?? []) : [];
  const igmpMemberships =
    d.role === 'router' ? (simCtx?.engine.getIgmpMembershipSnapshot(selectedNodeId) ?? []) : [];
  const joinedGroups =
    d.role === 'client' || d.role === 'server'
      ? (simCtx?.engine.getJoinedGroups(selectedNodeId) ?? [])
      : [];

  return (
    <div tabIndex={0} style={PANEL_STYLE}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          NODE DETAIL
        </div>
        <button
          onClick={closePanel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--netlab-text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            color: 'var(--netlab-text-primary)',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          {d.label}
        </span>
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>{d.role}</span>
        <span style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>{d.layerId}</span>
      </div>
      <div
        style={{
          borderTop: '1px solid var(--netlab-border-subtle)',
          paddingTop: 8,
        }}
      >
        {d.role === 'router' && (
          <RouterDetail
            data={d}
            {...(onTopologyChange
              ? {
                  onInterfaceMtuChange: (interfaceId: string, mtu: number | undefined) => {
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      nodes: snapshot.nodes.map((candidate) =>
                        candidate.id === selectedNodeId && candidate.data.role === 'router'
                          ? {
                              ...candidate,
                              data: {
                                ...candidate.data,
                                interfaces: (candidate.data.interfaces ?? []).map((iface) => {
                                  if (iface.id !== interfaceId) {
                                    return iface;
                                  }
                                  const { mtu: _mtu, ...restIface } = iface;
                                  return mtu === undefined ? restIface : { ...restIface, mtu };
                                }),
                              },
                            }
                          : candidate,
                      ),
                    }));
                  },
                  onSubInterfaceMtuChange: (
                    interfaceId: string,
                    subInterfaceId: string,
                    mtu: number | undefined,
                  ) => {
                    updateSnapshot((snapshot) => ({
                      ...snapshot,
                      nodes: snapshot.nodes.map((candidate) =>
                        candidate.id === selectedNodeId && candidate.data.role === 'router'
                          ? {
                              ...candidate,
                              data: {
                                ...candidate.data,
                                interfaces: (candidate.data.interfaces ?? []).map((iface) =>
                                  iface.id === interfaceId
                                    ? {
                                        ...iface,
                                        subInterfaces: (iface.subInterfaces ?? []).map(
                                          (subInterface) => {
                                            if (subInterface.id !== subInterfaceId) {
                                              return subInterface;
                                            }
                                            const { mtu: _mtu, ...restSubInterface } = subInterface;
                                            return mtu === undefined
                                              ? restSubInterface
                                              : { ...restSubInterface, mtu };
                                          },
                                        ),
                                      }
                                    : iface,
                                ),
                              },
                            }
                          : candidate,
                      ),
                    }));
                  },
                }
              : {})}
          />
        )}
        {d.role === 'switch' && <SwitchDetail nodeId={node.id} data={d} topology={topology} />}
        {(d.role === 'client' || d.role === 'server') && (
          <HostDetail data={d} {...(runtimeIp !== undefined ? { runtimeIp } : {})} />
        )}
        {canEdit && (d.role === 'client' || d.role === 'server') && (
          <HostEditorSection
            nodeId={node.id}
            data={d}
            editable={canEdit}
            snapshot={snapshot}
            updateNode={updateSelectedNode}
          />
        )}
        {canEdit && d.role === 'router' && (
          <RouterEditorSection
            nodeId={node.id}
            data={d}
            editable={canEdit}
            snapshot={snapshot}
            updateNode={updateSelectedNode}
          />
        )}
        {canEdit && d.role === 'switch' && (
          <SwitchEditorSection data={d} editable={canEdit} updateNode={updateSelectedNode} />
        )}
        {leaseState && <DhcpLeaseDetail lease={leaseState} />}
        {dnsCache && <DnsCacheDetail cache={dnsCache} />}
        {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
        {d.role === 'switch' && simCtx && (
          <MulticastSnoopingDetail entries={multicastTableSnapshot} />
        )}
        {d.role === 'router' && simCtx && (
          <MulticastMembershipDetail memberships={igmpMemberships} />
        )}
        {(d.role === 'client' || d.role === 'server') && simCtx && (
          <JoinedGroupsDetail groups={joinedGroups} />
        )}
      </div>
    </div>
  );
});
