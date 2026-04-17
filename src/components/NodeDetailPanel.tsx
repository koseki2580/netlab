import { useContext, useEffect } from 'react';
import { useNetlabUI } from './NetlabUIContext';
import { useNetlabContext } from './NetlabContext';
import { SimulationContext } from '../simulation/SimulationContext';
import type { NetlabNodeData, NetworkTopology, StpPortRuntime } from '../types/topology';
import type { RouterInterface } from '../types/routing';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import {
  compareBridgeId,
  DEFAULT_BRIDGE_PRIORITY,
  formatBridgeId,
  makeBridgeId,
} from '../layers/l2-datalink/stp/BridgeId';

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
  return VLAN_PALETTE[Math.abs(vid) % VLAN_PALETTE.length] ?? VLAN_PALETTE[0];
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

function RouterDetail({ data }: { data: NetlabNodeData }) {
  const ifaces = (data.interfaces ?? []) as RouterInterface[];
  return (
    <>
      {ifaces.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>No interfaces</div>
      ) : (
        ifaces.map((iface) => (
          <div key={iface.id} style={{ marginBottom: 6 }}>
            <div style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold' }}>{iface.name}</div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>{iface.ipAddress}/{iface.prefixLength}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
              <span style={{ color: 'var(--netlab-accent-yellow)' }}>{iface.macAddress}</span>
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
                    <div style={{ color: vlanColor(subInterface.vlanId), fontWeight: 'bold' }}>
                      {subInterface.id}
                    </div>
                    <div style={ROW_STYLE}>
                      <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
                      <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                        {subInterface.ipAddress}/{subInterface.prefixLength}
                      </span>
                    </div>
                    <div style={ROW_STYLE}>
                      <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>VLAN</span>
                      <span style={{ color: vlanColor(subInterface.vlanId) }}>{subInterface.vlanId}</span>
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
  const hasVlanConfig = ports.some((port) =>
    port.vlanMode !== undefined ||
    port.accessVlan !== undefined ||
    (port.trunkAllowedVlans?.length ?? 0) > 0 ||
    port.nativeVlan !== undefined,
  );
  const stpPortStates: Array<{ port: typeof ports[number]; runtime: StpPortRuntime }> = topology.stpStates
    ? ports.reduce<Array<{ port: typeof ports[number]; runtime: StpPortRuntime }>>((entries, port) => {
      const runtime = topology.stpStates?.get(`${nodeId}:${port.id}`);
      if (runtime) {
        entries.push({ port, runtime });
      }
      return entries;
    }, [])
    : [];
  const localBridgeId = topology.stpStates && topology.stpRoot && ports.length > 0
    ? makeBridgeId(data.stpConfig?.priority ?? DEFAULT_BRIDGE_PRIORITY, ports)
    : null;
  const isRootBridge = Boolean(
    localBridgeId &&
    topology.stpRoot &&
    compareBridgeId(localBridgeId, topology.stpRoot) === 0,
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
              {isRootBridge ? 'Root bridge' : `Non-root (root = ${formatBridgeId(topology.stpRoot)})`}
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
            <div key={`${port.id}-vlan`} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--netlab-border-subtle)' }}>
              <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold', marginBottom: 4 }}>
                {port.name}
              </div>
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Mode</span>
                <span style={{ color: 'var(--netlab-text-primary)' }}>{(port.vlanMode ?? 'access').toUpperCase()}</span>
              </div>
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Access</span>
                <span style={{ color: port.accessVlan ? vlanColor(port.accessVlan) : 'var(--netlab-text-muted)' }}>
                  {port.accessVlan ?? '-'}
                </span>
              </div>
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Allowed</span>
                <span style={{ color: 'var(--netlab-text-primary)' }}>
                  {port.trunkAllowedVlans?.join(', ') ?? '-'}
                </span>
              </div>
              <div style={ROW_STYLE}>
                <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Native</span>
                <span style={{ color: vlanColor(port.nativeVlan ?? 1) }}>{port.nativeVlan ?? 1}</span>
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

export function NodeDetailPanel() {
  const { selectedNodeId, setSelectedNodeId } = useNetlabUI();
  const { topology } = useNetlabContext();
  const simCtx = useContext(SimulationContext);

  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNodeId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, setSelectedNodeId]);

  if (!selectedNodeId) return null;

  const node = topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const d = node.data as NetlabNodeData;
  const leaseState = simCtx?.getDhcpLeaseState(selectedNodeId) ?? null;
  const dnsCache = simCtx?.getDnsCache(selectedNodeId) ?? null;
  const runtimeIp = simCtx?.engine.getRuntimeNodeIp(selectedNodeId) ?? leaseState?.assignedIp ?? undefined;

  return (
    <div style={PANEL_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', color: 'var(--netlab-text-secondary)', fontSize: 10, letterSpacing: 1 }}>
          NODE DETAIL
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
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
        <span style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold', fontSize: 13 }}>{d.label}</span>
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>{d.role}</span>
        <span style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>{d.layerId}</span>
      </div>
      <div style={{ borderTop: '1px solid var(--netlab-border-subtle)', paddingTop: 8 }}>
        {d.role === 'router' && <RouterDetail data={d} />}
        {d.role === 'switch' && <SwitchDetail nodeId={node.id} data={d} topology={topology} />}
        {(d.role === 'client' || d.role === 'server') && <HostDetail data={d} runtimeIp={runtimeIp} />}
        {leaseState && <DhcpLeaseDetail lease={leaseState} />}
        {dnsCache && <DnsCacheDetail cache={dnsCache} />}
      </div>
    </div>
  );
}
