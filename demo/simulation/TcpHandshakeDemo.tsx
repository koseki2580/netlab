import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { StepControls } from '../../src/components/simulation/StepControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { TcpSegment } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import type { TcpState } from '../../src/types/tcp';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 80, y: 180 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.1.10',
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 360, y: 180 },
      data: {
        label: 'Router',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '10.0.2.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:01',
          },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 640, y: 180 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '10.0.2.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map([
    [
      'router-1',
      [
        {
          destination: '10.0.1.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'router-1',
        },
        {
          destination: '10.0.2.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'router-1',
        },
      ],
    ],
  ]),
};

export const TCP_HANDSHAKE_DEMO_TOPOLOGY = TOPOLOGY;

function getCurrentTraceIndex(traces: PacketTrace[], currentTraceId: string | null): number {
  if (traces.length === 0) {
    return -1;
  }

  if (!currentTraceId) {
    return traces.length - 1;
  }

  const index = traces.findIndex((trace) => trace.packetId === currentTraceId);
  return index >= 0 ? index : traces.length - 1;
}

function deriveNodeStates(
  traces: PacketTrace[],
  currentTraceId: string | null,
  hasActiveConnection: boolean,
): { client: TcpState; server: TcpState } {
  if (traces.length === 0) {
    return hasActiveConnection
      ? { client: 'ESTABLISHED', server: 'ESTABLISHED' }
      : { client: 'CLOSED', server: 'LISTEN' };
  }

  const states: { client: TcpState; server: TcpState } = {
    client: 'CLOSED',
    server: 'LISTEN',
  };
  const traceIndex = getCurrentTraceIndex(traces, currentTraceId);

  traces.slice(0, traceIndex + 1).forEach((trace) => {
    switch (trace.label) {
      case 'TCP SYN':
        states.client = 'SYN_SENT';
        states.server = trace.status === 'delivered' ? 'SYN_RECEIVED' : 'LISTEN';
        break;
      case 'TCP SYN-ACK':
        states.server = 'SYN_RECEIVED';
        if (trace.status === 'delivered') {
          states.client = 'ESTABLISHED';
        }
        break;
      case 'TCP ACK':
        if (states.server === 'SYN_RECEIVED') {
          states.client = 'ESTABLISHED';
          if (trace.status === 'delivered') {
            states.server = 'ESTABLISHED';
          }
        } else if (states.client === 'FIN_WAIT_1' && trace.status === 'delivered') {
          states.client = 'FIN_WAIT_2';
        } else if (states.server === 'LAST_ACK' && trace.status === 'delivered') {
          states.server = 'CLOSED';
        }
        break;
      case 'TCP FIN':
        if (trace.srcNodeId === 'client-1') {
          states.client = 'FIN_WAIT_1';
          if (trace.status === 'delivered') {
            states.server = 'CLOSE_WAIT';
          }
        } else {
          states.server = 'LAST_ACK';
          if (trace.status === 'delivered') {
            states.client = 'TIME_WAIT';
          }
        }
        break;
      default:
        break;
    }
  });

  return states;
}

function formatFlags(segment: TcpSegment): string {
  return Object.entries(segment.flags)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag.toUpperCase())
    .join(', ') || 'NONE';
}

function readSelectedSegment(selectedPacket: ReturnType<typeof useSimulation>['state']['selectedPacket']) {
  if (!selectedPacket) {
    return null;
  }

  const transport = selectedPacket.frame.payload.payload;
  if (!('seq' in transport)) {
    return null;
  }

  return {
    src: `${selectedPacket.frame.payload.srcIp}:${transport.srcPort}`,
    dst: `${selectedPacket.frame.payload.dstIp}:${transport.dstPort}`,
    seq: transport.seq,
    ack: transport.ack,
    flags: formatFlags(transport),
  };
}

function stateAccent(state: TcpState): string {
  if (state === 'ESTABLISHED') return '#34d399';
  if (state === 'TIME_WAIT') return '#f59e0b';
  if (state === 'CLOSED') return '#64748b';
  return '#7dd3fc';
}

function StateBadge({
  label,
  state,
  left,
  top,
}: {
  label: string;
  state: TcpState;
  left: number;
  top: number;
}) {
  const accent = stateAccent(state);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid ${accent}55`,
        background: '#020617dd',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.4,
        boxShadow: '0 8px 24px rgba(2, 6, 23, 0.35)',
        pointerEvents: 'none',
        minWidth: 124,
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ color: accent, fontWeight: 'bold' }}>{state}</div>
    </div>
  );
}

function SidebarPanel({
  traces,
  currentTraceId,
}: {
  traces: PacketTrace[];
  currentTraceId: string | null;
}) {
  const { engine, state } = useSimulation();
  const activeConnections = engine.getTcpConnections();
  const selected = readSelectedSegment(state.selectedPacket);
  const activeTrace = currentTraceId
    ? traces.find((trace) => trace.packetId === currentTraceId) ?? null
    : traces[traces.length - 1] ?? null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        border: '1px solid #1e293b',
        borderRadius: 10,
        background: '#0b1220',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 }}>
          ACTIVE TCP CONNECTIONS
        </div>
        {activeConnections.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 12 }}>No active connections.</div>
        ) : (
          activeConnections.map((connection) => (
            <div
              key={connection.id}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#020617',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: 4 }}>
                {connection.state}
              </div>
              <div>{connection.srcIp}:{connection.srcPort} → {connection.dstIp}:{connection.dstPort}</div>
              <div style={{ color: '#94a3b8', marginTop: 4 }}>
                localSeq={connection.localSeq} localAck={connection.localAck} remoteSeq={connection.remoteSeq}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 }}>
          SELECTED SEGMENT
        </div>
        {selected ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#020617',
              border: '1px solid #1e293b',
              color: '#e2e8f0',
              fontSize: 12,
              fontFamily: 'monospace',
              display: 'grid',
              gap: 4,
            }}
          >
            <div style={{ color: '#7dd3fc', fontWeight: 'bold' }}>
              {activeTrace?.label ?? 'TCP'}
            </div>
            <div>{selected.src} → {selected.dst}</div>
            <div>Flags: {selected.flags}</div>
            <div>SEQ: {selected.seq}</div>
            <div>ACK: {selected.ack}</div>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>
            Select a trace and step into a hop to inspect TCP header fields.
          </div>
        )}
      </div>
    </div>
  );
}

function TcpHandshakeDemoInner() {
  const { engine, state } = useSimulation();
  const activeConnection = engine.getTcpConnections()[0] ?? null;
  const nodeStates = deriveNodeStates(
    state.traces,
    state.currentTraceId,
    activeConnection !== null,
  );

  const handleConnect = async () => {
    engine.clear();
    await engine.tcpConnect('client-1', 'server-1', 12345, 80);
  };

  const handleDisconnect = async () => {
    const connection = engine.getTcpConnections()[0];
    if (!connection) {
      return;
    }

    engine.clearTraces();
    await engine.tcpDisconnect(connection.id);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            disabled={activeConnection !== null}
            onClick={() => void handleConnect()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeConnection ? '#334155' : '#0f766e',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: activeConnection ? 'not-allowed' : 'pointer',
            }}
          >
            Connect (TCP)
          </button>
          <button
            type="button"
            disabled={activeConnection === null}
            onClick={() => void handleDisconnect()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: activeConnection ? '#020617' : '#111827',
              color: activeConnection ? '#e2e8f0' : '#64748b',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: activeConnection ? 'pointer' : 'not-allowed',
            }}
          >
            Disconnect
          </button>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
            Use the trace selector on the right to step through SYN, SYN-ACK, ACK, and FIN exchanges.
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 12,
            width: 320,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #1e293b',
            background: '#020617dd',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
            zIndex: 20,
          }}
        >
          <div style={{ color: '#7dd3fc', fontWeight: 'bold', marginBottom: 6 }}>
            TCP Teaching Flow
          </div>
          <div>Handshake: SYN → SYN-ACK → ACK</div>
          <div>Teardown: FIN → ACK → FIN → ACK</div>
          <div style={{ color: '#94a3b8', marginTop: 6 }}>
            State badges are derived from the recorded packet sequence so you can inspect historical
            handshake and teardown phases even after the engine finishes the exchange.
          </div>
        </div>

        <StateBadge label="Client State" state={nodeStates.client} left={24} top={100} />
        <StateBadge label="Server State" state={nodeStates.server} left={602} top={100} />
      </div>

      <ResizableSidebar
        defaultWidth={520}
        maxWidth={760}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
          <SidebarPanel traces={state.traces} currentTraceId={state.currentTraceId} />
          <StepControls />
          <div
            style={{
              padding: 16,
              border: '1px solid #1e293b',
              borderRadius: 10,
              background: '#0b1220',
            }}
          >
            <PacketStructureViewer />
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function TcpHandshakeDemo() {
  return (
    <DemoShell
      title="TCP Handshake"
      desc="Inspect a 3-way handshake and 4-step teardown across a routed path, with state badges, active connections, and packet-byte detail."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <TcpHandshakeDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
