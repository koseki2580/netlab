import { useEffect, useState } from 'react';
import { useNetlabUI } from '../../components/NetlabUIContext';
import type { RouterInterface, StaticRouteConfig } from '../../types/routing';
import type { NetlabNodeData, SwitchPort } from '../../types/topology';
import { useTopologyEditorContext, type NodeDataPatch } from '../context/TopologyEditorContext';

// ─── Styles ────────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: 12,
  background: 'rgba(15, 23, 42, 0.97)',
  border: '1px solid rgba(100, 116, 139, 0.4)',
  borderRadius: 8,
  padding: '10px 14px',
  width: 280,
  maxHeight: 'calc(100% - 24px)',
  overflowY: 'auto',
  color: '#e2e8f0',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 200,
  pointerEvents: 'all',
};

const SECTION_STYLE: React.CSSProperties = {
  borderTop: '1px solid rgba(100,116,139,0.2)',
  paddingTop: 8,
  marginTop: 8,
};

const LABEL_STYLE: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 10,
  letterSpacing: 1,
  marginBottom: 3,
};

const INPUT_STYLE: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#e2e8f0',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '3px 6px',
  width: '100%',
  boxSizing: 'border-box',
};

const SMALL_BTN: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#94a3b8',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '2px 6px',
  marginTop: 4,
};

const DELETE_BTN: React.CSSProperties = {
  ...SMALL_BTN,
  background: '#450a0a',
  border: '1px solid #7f1d1d',
  color: '#fca5a5',
  width: '100%',
  marginTop: 8,
  padding: '5px 0',
  fontSize: 11,
};

const ICON_BTN: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 11,
  padding: '0 2px',
  lineHeight: 1,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateIfaceId() {
  return `iface-${Date.now().toString(36)}`;
}

function generatePortId() {
  return `port-${Date.now().toString(36)}`;
}

function generateMac() {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  return `02:00:${hex()}:${hex()}:${hex()}:${hex()}`;
}

// ─── Field components ──────────────────────────────────────────────────────

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (val: string) => void;
  accentColor?: string;
}

function TextField({
  label,
  value,
  placeholder,
  onCommit,
  accentColor = '#e2e8f0',
}: TextFieldProps) {
  const [local, setLocal] = useState(value);

  // Sync if external value changes (e.g. undo)
  useEffect(() => setLocal(value), [value]);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={LABEL_STYLE}>{label}</div>
      <input
        style={{ ...INPUT_STYLE, color: accentColor }}
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onCommit(local);
        }}
      />
    </div>
  );
}

// ─── Role-specific editors ─────────────────────────────────────────────────

function HostEditor({
  data,
  onCommit,
}: {
  data: NetlabNodeData;
  onCommit: (patch: NodeDataPatch) => void;
}) {
  return (
    <div style={SECTION_STYLE}>
      <TextField
        label="IP ADDRESS"
        value={data.ip ?? ''}
        placeholder="e.g. 10.0.0.10"
        onCommit={(v) => onCommit({ ip: v || undefined })}
        accentColor="#7dd3fc"
      />
      <TextField
        label="MAC ADDRESS"
        value={data.mac ?? ''}
        placeholder="e.g. aa:bb:cc:dd:ee:ff"
        onCommit={(v) => onCommit({ mac: v || undefined })}
        accentColor="#fbbf24"
      />
    </div>
  );
}

function RouterEditor({
  data,
  onCommit,
}: {
  data: NetlabNodeData;
  onCommit: (patch: NodeDataPatch) => void;
}) {
  const ifaces = data.interfaces ?? [];

  const updateIface = (id: string, field: Partial<RouterInterface>) => {
    onCommit({
      interfaces: ifaces.map((i) => (i.id === id ? { ...i, ...field } : i)),
    });
  };

  const deleteIface = (id: string) => {
    onCommit({ interfaces: ifaces.filter((i) => i.id !== id) });
  };

  const addIface = () => {
    const newId = generateIfaceId();
    const newIface: RouterInterface = {
      id: newId,
      name: `eth${ifaces.length}`,
      ipAddress: '0.0.0.0',
      prefixLength: 24,
      macAddress: generateMac(),
    };
    onCommit({ interfaces: [...ifaces, newIface] });
  };

  return (
    <div style={SECTION_STYLE}>
      <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>INTERFACES</div>
      {ifaces.map((iface) => (
        <IfaceRow
          key={iface.id}
          iface={iface}
          onUpdate={(f) => updateIface(iface.id, f)}
          onDelete={() => deleteIface(iface.id)}
        />
      ))}
      <button style={SMALL_BTN} onClick={addIface}>
        + Add Interface
      </button>
    </div>
  );
}

interface IfaceRowProps {
  iface: RouterInterface;
  onUpdate: (patch: Partial<RouterInterface>) => void;
  onDelete: () => void;
}

function IfaceRow({ iface, onUpdate, onDelete }: IfaceRowProps) {
  const ipPrefix = `${iface.ipAddress}/${iface.prefixLength}`;
  const [localName, setLocalName] = useState(iface.name);
  const [localIpPrefix, setLocalIpPrefix] = useState(ipPrefix);
  const [localMac, setLocalMac] = useState(iface.macAddress);

  useEffect(() => setLocalName(iface.name), [iface.name]);
  useEffect(
    () => setLocalIpPrefix(`${iface.ipAddress}/${iface.prefixLength}`),
    [iface.ipAddress, iface.prefixLength],
  );
  useEffect(() => setLocalMac(iface.macAddress), [iface.macAddress]);

  const commitIpPrefix = (val: string) => {
    const [ip, prefix] = val.split('/');
    onUpdate({ ipAddress: ip ?? '0.0.0.0', prefixLength: parseInt(prefix ?? '24', 10) || 24 });
  };

  return (
    <div
      style={{
        marginBottom: 8,
        padding: '6px 8px',
        background: '#0f172a',
        borderRadius: 4,
        border: '1px solid #1e293b',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <input
          style={{ ...INPUT_STYLE, color: '#4ade80', width: 90, marginBottom: 0 }}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => {
            if (localName !== iface.name) onUpdate({ name: localName });
          }}
        />
        <button style={ICON_BTN} onClick={onDelete} title="Remove interface">
          ✕
        </button>
      </div>
      <input
        style={{ ...INPUT_STYLE, color: '#7dd3fc', marginBottom: 3 }}
        value={localIpPrefix}
        placeholder="10.0.0.1/24"
        onChange={(e) => setLocalIpPrefix(e.target.value)}
        onBlur={() => {
          if (localIpPrefix !== ipPrefix) commitIpPrefix(localIpPrefix);
        }}
      />
      <input
        style={{ ...INPUT_STYLE, color: '#fbbf24' }}
        value={localMac}
        placeholder="00:00:00:00:00:00"
        onChange={(e) => setLocalMac(e.target.value)}
        onBlur={() => {
          if (localMac !== iface.macAddress) onUpdate({ macAddress: localMac });
        }}
      />
    </div>
  );
}

function SwitchEditor({
  data,
  onCommit,
}: {
  data: NetlabNodeData;
  onCommit: (patch: Partial<NetlabNodeData>) => void;
}) {
  const ports = data.ports ?? [];

  const updatePort = (id: string, field: Partial<SwitchPort>) => {
    onCommit({ ports: ports.map((p) => (p.id === id ? { ...p, ...field } : p)) });
  };

  const deletePort = (id: string) => {
    onCommit({ ports: ports.filter((p) => p.id !== id) });
  };

  const addPort = () => {
    onCommit({
      ports: [
        ...ports,
        {
          id: generatePortId(),
          name: `fa0/${ports.length}`,
          macAddress: generateMac(),
        },
      ],
    });
  };

  return (
    <div style={SECTION_STYLE}>
      <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>PORTS</div>
      {ports.map((port) => (
        <PortRow
          key={port.id}
          port={port}
          onUpdate={(f) => updatePort(port.id, f)}
          onDelete={() => deletePort(port.id)}
        />
      ))}
      <button style={SMALL_BTN} onClick={addPort}>
        + Add Port
      </button>
    </div>
  );
}

interface PortRowProps {
  port: SwitchPort;
  onUpdate: (patch: Partial<SwitchPort>) => void;
  onDelete: () => void;
}

function PortRow({ port, onUpdate, onDelete }: PortRowProps) {
  const [localName, setLocalName] = useState(port.name);
  const [localMac, setLocalMac] = useState(port.macAddress);

  useEffect(() => setLocalName(port.name), [port.name]);
  useEffect(() => setLocalMac(port.macAddress), [port.macAddress]);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
      <input
        style={{ ...INPUT_STYLE, color: '#60a5fa', width: 80 }}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => {
          if (localName !== port.name) onUpdate({ name: localName });
        }}
      />
      <input
        style={{ ...INPUT_STYLE, color: '#fbbf24', flex: 1 }}
        value={localMac}
        onChange={(e) => setLocalMac(e.target.value)}
        onBlur={() => {
          if (localMac !== port.macAddress) onUpdate({ macAddress: localMac });
        }}
      />
      <button style={ICON_BTN} onClick={onDelete} title="Remove port">
        ✕
      </button>
    </div>
  );
}

// ─── Static routes editor ──────────────────────────────────────────────────

function StaticRoutesEditor({
  data,
  onCommit,
}: {
  data: NetlabNodeData;
  onCommit: (patch: Partial<NetlabNodeData>) => void;
}) {
  const routes = data.staticRoutes ?? [];

  const updateRoute = (i: number, field: Partial<StaticRouteConfig>) => {
    onCommit({ staticRoutes: routes.map((r, idx) => (idx === i ? { ...r, ...field } : r)) });
  };

  const deleteRoute = (i: number) => {
    onCommit({ staticRoutes: routes.filter((_, idx) => idx !== i) });
  };

  const addRoute = () => {
    onCommit({
      staticRoutes: [...routes, { destination: '0.0.0.0/0', nextHop: '0.0.0.0' }],
    });
  };

  return (
    <div style={SECTION_STYLE}>
      <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>STATIC ROUTES</div>
      {routes.map((route, i) => (
        <RouteRow
          key={i}
          route={route}
          onUpdate={(f) => updateRoute(i, f)}
          onDelete={() => deleteRoute(i)}
        />
      ))}
      <button style={SMALL_BTN} onClick={addRoute}>
        + Add Route
      </button>
    </div>
  );
}

interface RouteRowProps {
  route: StaticRouteConfig;
  onUpdate: (patch: Partial<StaticRouteConfig>) => void;
  onDelete: () => void;
}

function RouteRow({ route, onUpdate, onDelete }: RouteRowProps) {
  const [localDest, setLocalDest] = useState(route.destination);
  const [localHop, setLocalHop] = useState(route.nextHop);

  useEffect(() => setLocalDest(route.destination), [route.destination]);
  useEffect(() => setLocalHop(route.nextHop), [route.nextHop]);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
      <input
        style={{ ...INPUT_STYLE, color: '#7dd3fc', flex: 1 }}
        value={localDest}
        placeholder="0.0.0.0/0"
        onChange={(e) => setLocalDest(e.target.value)}
        onBlur={() => {
          if (localDest !== route.destination) onUpdate({ destination: localDest });
        }}
      />
      <input
        style={{ ...INPUT_STYLE, color: '#4ade80', flex: 1 }}
        value={localHop}
        placeholder="next-hop or 'direct'"
        onChange={(e) => setLocalHop(e.target.value)}
        onBlur={() => {
          if (localHop !== route.nextHop) onUpdate({ nextHop: localHop });
        }}
      />
      <button style={ICON_BTN} onClick={onDelete} title="Remove route">
        ✕
      </button>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export function NodeEditorPanel() {
  const { selectedNodeId, setSelectedNodeId } = useNetlabUI();
  const { state, updateNodeData, deleteNode } = useTopologyEditorContext();

  // Escape to close
  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNodeId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, setSelectedNodeId]);

  if (!selectedNodeId) return null;

  const node = state.topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const d = node.data;

  const onCommit = (patch: NodeDataPatch) => {
    updateNodeData(selectedNodeId, patch);
  };

  const roleColor =
    d.role === 'router'
      ? '#4ade80'
      : d.role === 'switch'
        ? '#60a5fa'
        : d.role === 'client'
          ? '#7dd3fc'
          : '#f472b6';

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: 10, letterSpacing: 1 }}>
          EDIT NODE
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Role badge */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            color: roleColor,
            fontSize: 10,
            border: `1px solid ${roleColor}`,
            borderRadius: 3,
            padding: '1px 5px',
          }}
        >
          {d.role}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 6 }}>{d.layerId}</span>
      </div>

      {/* Label */}
      <TextField label="LABEL" value={d.label} onCommit={(v) => onCommit({ label: v })} />

      {/* Role-specific editors */}
      {(d.role === 'client' || d.role === 'server') && <HostEditor data={d} onCommit={onCommit} />}
      {d.role === 'router' && (
        <>
          <RouterEditor data={d} onCommit={onCommit} />
          <StaticRoutesEditor data={d} onCommit={onCommit} />
        </>
      )}
      {d.role === 'switch' && <SwitchEditor data={d} onCommit={onCommit} />}

      {/* Delete node */}
      <button
        style={DELETE_BTN}
        onClick={() => {
          deleteNode(selectedNodeId);
          setSelectedNodeId(null);
        }}
      >
        Delete Node
      </button>
    </div>
  );
}
