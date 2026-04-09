import { useContext, useEffect } from 'react';
import { useNetlabUI } from './NetlabUIContext';
import { useNetlabContext } from './NetlabContext';
import { SimulationContext } from '../simulation/SimulationContext';
import type { NetlabNodeData } from '../types/topology';
import type { RouterInterface } from '../types/routing';
import type { DhcpLeaseState, DnsCache } from '../types/services';

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
          </div>
        ))
      )}
    </>
  );
}

function SwitchDetail({ data }: { data: NetlabNodeData }) {
  const ports = data.ports ?? [];
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
        {d.role === 'switch' && <SwitchDetail data={d} />}
        {(d.role === 'client' || d.role === 'server') && <HostDetail data={d} runtimeIp={runtimeIp} />}
        {leaseState && <DhcpLeaseDetail lease={leaseState} />}
        {dnsCache && <DnsCacheDetail cache={dnsCache} />}
      </div>
    </div>
  );
}
