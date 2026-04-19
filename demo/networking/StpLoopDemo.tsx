import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import {
  compareBridgeId,
  DEFAULT_BRIDGE_PRIORITY,
  formatBridgeId,
  makeBridgeId,
} from '../../src/layers/l2-datalink/stp/BridgeId';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology, SwitchPort } from '../../src/types/topology';
import DemoShell from '../DemoShell';

type SwitchId = 'switch-a' | 'switch-b' | 'switch-c';
type HostId = 'host-a' | 'host-b' | 'host-c';

const INTER_SWITCH_EDGE_ID = 'e-bc';

const DEFAULT_PRIORITIES: Record<SwitchId, number> = {
  'switch-a': 4096,
  'switch-b': DEFAULT_BRIDGE_PRIORITY,
  'switch-c': DEFAULT_BRIDGE_PRIORITY,
};

const DEFAULT_DISABLED_PORTS: Record<SwitchId, string[]> = {
  'switch-a': [],
  'switch-b': [],
  'switch-c': [],
};

const SWITCH_PORTS: Record<SwitchId, SwitchPort[]> = {
  'switch-a': [
    { id: 'ab', name: 'fa0/1', macAddress: '02:00:00:0a:00:01' },
    { id: 'ac', name: 'fa0/2', macAddress: '02:00:00:0a:00:02' },
    { id: 'ah', name: 'fa0/3', macAddress: '02:00:00:0a:00:03' },
  ],
  'switch-b': [
    { id: 'ba', name: 'fa0/1', macAddress: '02:00:00:0b:00:01' },
    { id: 'bc', name: 'fa0/2', macAddress: '02:00:00:0b:00:02' },
    { id: 'bh', name: 'fa0/3', macAddress: '02:00:00:0b:00:03' },
  ],
  'switch-c': [
    { id: 'ca', name: 'fa0/1', macAddress: '02:00:00:0c:00:01' },
    { id: 'cb', name: 'fa0/2', macAddress: '02:00:00:0c:00:02' },
    { id: 'ch', name: 'fa0/3', macAddress: '02:00:00:0c:00:03' },
  ],
};

const HOST_META: Record<
  HostId,
  { label: string; ip: string; mac: string; switchId: SwitchId; portId: string }
> = {
  'host-a': {
    label: 'Host A',
    ip: '10.0.0.11',
    mac: '02:00:00:aa:00:11',
    switchId: 'switch-a',
    portId: 'ah',
  },
  'host-b': {
    label: 'Host B',
    ip: '10.0.0.12',
    mac: '02:00:00:bb:00:12',
    switchId: 'switch-b',
    portId: 'bh',
  },
  'host-c': {
    label: 'Host C',
    ip: '10.0.0.13',
    mac: '02:00:00:cc:00:13',
    switchId: 'switch-c',
    portId: 'ch',
  },
};

const CARD_STYLE: CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 10,
  padding: '12px 14px',
};

const SECTION_TITLE_STYLE: CSSProperties = {
  color: '#94a3b8',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  marginBottom: 10,
  textTransform: 'uppercase',
};

const BUTTON_BASE: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 7,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
};

const PRIMARY_BUTTON: CSSProperties = {
  ...BUTTON_BASE,
  background: '#14532d',
  color: '#dcfce7',
};

const SECONDARY_BUTTON: CSSProperties = {
  ...BUTTON_BASE,
  background: '#0f172a',
  borderColor: '#334155',
  color: '#cbd5e1',
};

function roleColor(role: 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED'): string {
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
      return '#e2e8f0';
  }
}

function buildTopology(
  priorities: Record<SwitchId, number>,
  disabledPortIds: Record<SwitchId, string[]>,
): NetworkTopology {
  return {
    nodes: [
      {
        id: 'host-a',
        type: 'client',
        position: { x: 70, y: 70 },
        data: {
          label: HOST_META['host-a'].label,
          role: 'client',
          layerId: 'l7',
          ip: HOST_META['host-a'].ip,
          mac: HOST_META['host-a'].mac,
        },
      },
      {
        id: 'host-b',
        type: 'client',
        position: { x: 650, y: 70 },
        data: {
          label: HOST_META['host-b'].label,
          role: 'client',
          layerId: 'l7',
          ip: HOST_META['host-b'].ip,
          mac: HOST_META['host-b'].mac,
        },
      },
      {
        id: 'host-c',
        type: 'client',
        position: { x: 360, y: 430 },
        data: {
          label: HOST_META['host-c'].label,
          role: 'client',
          layerId: 'l7',
          ip: HOST_META['host-c'].ip,
          mac: HOST_META['host-c'].mac,
        },
      },
      {
        id: 'switch-a',
        type: 'switch',
        position: { x: 190, y: 180 },
        data: {
          label: 'Switch A',
          role: 'switch',
          layerId: 'l2',
          ports: SWITCH_PORTS['switch-a'],
          stpConfig: {
            priority: priorities['switch-a'],
            disabledPortIds: disabledPortIds['switch-a'],
          },
        },
      },
      {
        id: 'switch-b',
        type: 'switch',
        position: { x: 530, y: 180 },
        data: {
          label: 'Switch B',
          role: 'switch',
          layerId: 'l2',
          ports: SWITCH_PORTS['switch-b'],
          stpConfig: {
            priority: priorities['switch-b'],
            disabledPortIds: disabledPortIds['switch-b'],
          },
        },
      },
      {
        id: 'switch-c',
        type: 'switch',
        position: { x: 360, y: 330 },
        data: {
          label: 'Switch C',
          role: 'switch',
          layerId: 'l2',
          ports: SWITCH_PORTS['switch-c'],
          stpConfig: {
            priority: priorities['switch-c'],
            disabledPortIds: disabledPortIds['switch-c'],
          },
        },
      },
    ],
    edges: [
      { id: 'e-ah', source: 'host-a', target: 'switch-a', targetHandle: 'ah', type: 'smoothstep' },
      { id: 'e-bh', source: 'host-b', target: 'switch-b', targetHandle: 'bh', type: 'smoothstep' },
      { id: 'e-ch', source: 'host-c', target: 'switch-c', targetHandle: 'ch', type: 'smoothstep' },
      {
        id: 'e-ab',
        source: 'switch-a',
        target: 'switch-b',
        sourceHandle: 'ab',
        targetHandle: 'ba',
        type: 'smoothstep',
      },
      {
        id: 'e-ac',
        source: 'switch-a',
        target: 'switch-c',
        sourceHandle: 'ac',
        targetHandle: 'ca',
        type: 'smoothstep',
      },
      {
        id: INTER_SWITCH_EDGE_ID,
        source: 'switch-b',
        target: 'switch-c',
        sourceHandle: 'bc',
        targetHandle: 'cb',
        type: 'smoothstep',
      },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export function buildStpDemoTopology(): NetworkTopology {
  return buildTopology(DEFAULT_PRIORITIES, DEFAULT_DISABLED_PORTS);
}

function buildPingPacket(
  topology: NetworkTopology,
  srcNodeId: HostId,
  dstNodeId: HostId,
): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === srcNodeId);
  const dstNode = topology.nodes.find((node) => node.id === dstNodeId);
  const srcIp = srcNode?.data.ip;
  const dstIp = dstNode?.data.ip;
  const srcMac = srcNode?.data.mac;

  if (
    !srcNode ||
    !dstNode ||
    typeof srcIp !== 'string' ||
    typeof dstIp !== 'string' ||
    typeof srcMac !== 'string'
  ) {
    return null;
  }

  return {
    id: `stp-ping-${srcNodeId}-${dstNodeId}-${Date.now()}`,
    srcNodeId,
    dstNodeId,
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac,
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 1,
        payload: {
          layer: 'L4',
          type: 8,
          code: 0,
          checksum: 0,
          identifier: 1,
          sequenceNumber: 1,
          data: 'stp-demo',
        },
      },
    },
  };
}

function StpStatusCard({ switchId }: { switchId: SwitchId }) {
  const { topology } = useNetlabContext();
  const node = topology.nodes.find((candidate) => candidate.id === switchId);
  if (node?.data.role !== 'switch') {
    return null;
  }

  const ports = node.data.ports ?? [];
  const bridgeId =
    ports.length > 0
      ? makeBridgeId(node.data.stpConfig?.priority ?? DEFAULT_BRIDGE_PRIORITY, ports)
      : null;
  const isRoot = Boolean(
    bridgeId && topology.stpRoot && compareBridgeId(bridgeId, topology.stpRoot) === 0,
  );

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ color: '#f8fafc', fontFamily: 'monospace', fontWeight: 700 }}>
            {node.data.label}
          </div>
          <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
            priority {node.data.stpConfig?.priority ?? DEFAULT_BRIDGE_PRIORITY}
          </div>
        </div>
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '4px 8px',
            borderRadius: 999,
            background: isRoot ? 'rgba(56, 189, 248, 0.14)' : 'rgba(148, 163, 184, 0.12)',
            color: isRoot ? '#38bdf8' : '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {isRoot ? 'Root' : 'Non-root'}
        </div>
      </div>
      {ports.map((port) => {
        const runtime = topology.stpStates?.get(`${switchId}:${port.id}`);
        return (
          <div
            key={port.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '6px 0',
              borderTop: '1px solid #1f2937',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#94a3b8' }}>{port.id}</span>
            <span style={{ color: runtime ? roleColor(runtime.role) : '#e2e8f0' }}>
              {runtime ? `${runtime.role} (${runtime.state})` : 'FORWARDING'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TracePanel({ lastScenario }: { lastScenario: string | null }) {
  const { topology } = useNetlabContext();
  const { state, isRecomputing } = useSimulation();
  const activeTrace = state.currentTraceId
    ? (state.traces.find((trace) => trace.packetId === state.currentTraceId) ?? null)
    : null;
  const hopLabels = activeTrace?.hops.map((hop) => hop.nodeLabel).join(' → ') ?? 'No trace yet';
  const usedBlockedSegment =
    activeTrace?.hops.some((hop) => hop.activeEdgeId === INTER_SWITCH_EDGE_ID) ?? false;
  const rootLabel = topology.stpRoot ? formatBridgeId(topology.stpRoot) : 'none';

  return (
    <div style={CARD_STYLE}>
      <div style={SECTION_TITLE_STYLE}>Trace</div>
      <div style={{ color: '#f8fafc', fontFamily: 'monospace', fontSize: 12, marginBottom: 6 }}>
        Last flow: {lastScenario ?? 'none'}
      </div>
      <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
        {hopLabels}
      </div>
      <div style={{ marginTop: 10, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
        Root bridge: {rootLabel}
      </div>
      <div
        style={{
          marginTop: 6,
          color: usedBlockedSegment ? '#f97316' : '#22c55e',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        Blocked segment used: {usedBlockedSegment ? 'yes' : 'no'}
      </div>
      {activeTrace?.status && (
        <div style={{ marginTop: 6, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
          Trace status: {activeTrace.status}
        </div>
      )}
      {isRecomputing && (
        <div style={{ marginTop: 6, color: '#fbbf24', fontFamily: 'monospace', fontSize: 12 }}>
          Recomputing simulation…
        </div>
      )}
    </div>
  );
}

function StpLoopDemoInner({
  priorities,
  setPriorities,
  disabledPorts,
  setDisabledPorts,
}: {
  priorities: Record<SwitchId, number>;
  setPriorities: React.Dispatch<React.SetStateAction<Record<SwitchId, number>>>;
  disabledPorts: Record<SwitchId, string[]>;
  setDisabledPorts: React.Dispatch<React.SetStateAction<Record<SwitchId, string[]>>>;
}) {
  const { topology } = useNetlabContext();
  const { engine, sendPacket, state } = useSimulation();
  const [lastScenario, setLastScenario] = useState<string | null>(null);
  const didAutoSend = useRef(false);

  const runPing = useCallback(
    async (srcNodeId: HostId, dstNodeId: HostId, label: string) => {
      const packet = buildPingPacket(topology, srcNodeId, dstNodeId);
      if (!packet) {
        return;
      }

      setLastScenario(label);
      engine.reset();
      await sendPacket(packet);
    },
    [engine, sendPacket, topology],
  );

  useEffect(() => {
    if (didAutoSend.current || state.status !== 'idle') {
      return;
    }

    didAutoSend.current = true;
    void runPing('host-b', 'host-c', 'B → C');
  }, [runPing, state.status]);

  const updatePriority = (switchId: SwitchId, value: string) => {
    const parsed = Number(value);
    setPriorities((current) => ({
      ...current,
      [switchId]: Number.isFinite(parsed) ? parsed : DEFAULT_BRIDGE_PRIORITY,
    }));
  };

  const toggleDisabledPort = (switchId: SwitchId, portId: string) => {
    setDisabledPorts((current) => {
      const nextPorts = current[switchId].includes(portId)
        ? current[switchId].filter((candidate) => candidate !== portId)
        : [...current[switchId], portId];

      return {
        ...current,
        [switchId]: nextPorts,
      };
    });
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <NetlabCanvas />
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            maxWidth: 360,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(51, 65, 85, 0.9)',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          Default root is Switch A. In the initial B → C trace, the blocked B–C segment should not
          appear; traffic detours through Switch A. Lower Switch B or C priority to re-elect the
          root.
        </div>
      </div>

      <ResizableSidebar defaultWidth={420} minWidth={320} maxWidth={560}>
        <div
          style={{
            height: '100%',
            overflowY: 'auto',
            background: '#020617',
            borderLeft: '1px solid #1e293b',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={CARD_STYLE}>
            <div style={SECTION_TITLE_STYLE}>Ping Controls</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                style={PRIMARY_BUTTON}
                onClick={() => void runPing('host-a', 'host-b', 'A → B')}
              >
                A → B
              </button>
              <button
                type="button"
                style={PRIMARY_BUTTON}
                onClick={() => void runPing('host-a', 'host-c', 'A → C')}
              >
                A → C
              </button>
              <button
                type="button"
                style={PRIMARY_BUTTON}
                onClick={() => void runPing('host-b', 'host-c', 'B → C')}
              >
                B → C
              </button>
            </div>
          </div>

          <TracePanel lastScenario={lastScenario} />

          <div style={CARD_STYLE}>
            <div style={SECTION_TITLE_STYLE}>Priorities</div>
            {(['switch-a', 'switch-b', 'switch-c'] as SwitchId[]).map((switchId) => (
              <label
                key={switchId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                  color: '#cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                <span>{switchId}</span>
                <input
                  type="number"
                  value={priorities[switchId]}
                  onChange={(event) => updatePriority(switchId, event.target.value)}
                  style={{
                    width: 112,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#f8fafc',
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              style={SECONDARY_BUTTON}
              onClick={() => {
                setPriorities(DEFAULT_PRIORITIES);
                setDisabledPorts(DEFAULT_DISABLED_PORTS);
              }}
            >
              Reset STP Controls
            </button>
          </div>

          <div style={CARD_STYLE}>
            <div style={SECTION_TITLE_STYLE}>Disable Ports</div>
            {(['switch-a', 'switch-b', 'switch-c'] as SwitchId[]).map((switchId) => (
              <div key={switchId} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  {switchId}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SWITCH_PORTS[switchId].map((port) => (
                    <label
                      key={port.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={disabledPorts[switchId].includes(port.id)}
                        onChange={() => toggleDisabledPort(switchId, port.id)}
                      />
                      <span>{port.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StpStatusCard switchId="switch-a" />
            <StpStatusCard switchId="switch-b" />
            <StpStatusCard switchId="switch-c" />
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function StpLoopDemo() {
  const [priorities, setPriorities] = useState<Record<SwitchId, number>>(DEFAULT_PRIORITIES);
  const [disabledPorts, setDisabledPorts] =
    useState<Record<SwitchId, string[]>>(DEFAULT_DISABLED_PORTS);
  const topology = useMemo(
    () => buildTopology(priorities, disabledPorts),
    [priorities, disabledPorts],
  );

  return (
    <DemoShell
      title="Spanning Tree"
      desc="Triangle of switches with live root election, blocked ports, and packet traces"
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <StpLoopDemoInner
            priorities={priorities}
            setPriorities={setPriorities}
            disabledPorts={disabledPorts}
            setDisabledPorts={setDisabledPorts}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
