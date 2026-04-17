import { useEffect, useRef, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { FailureProvider, useFailure } from '../../src/simulation/FailureContext';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const TRUNK_EDGE_ID = 'e-trunk';

const VLAN_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'host-a1',
      type: 'client',
      position: { x: 80, y: 80 },
      data: {
        label: 'A1',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.10.11',
        mac: '02:00:00:00:10:11',
      },
    },
    {
      id: 'host-a2',
      type: 'client',
      position: { x: 80, y: 180 },
      data: {
        label: 'A2',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.10.12',
        mac: '02:00:00:00:10:12',
      },
    },
    {
      id: 'host-b1',
      type: 'client',
      position: { x: 80, y: 320 },
      data: {
        label: 'B1',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.20.21',
        mac: '02:00:00:00:20:21',
      },
    },
    {
      id: 'host-b2',
      type: 'client',
      position: { x: 80, y: 420 },
      data: {
        label: 'B2',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.20.22',
        mac: '02:00:00:00:20:22',
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 360, y: 250 },
      data: {
        label: 'SW1',
        role: 'switch',
        layerId: 'l2',
        vlans: [
          { vlanId: 10, name: 'users' },
          { vlanId: 20, name: 'servers' },
        ],
        ports: [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02', vlanMode: 'access', accessVlan: 10 },
          { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03', vlanMode: 'access', accessVlan: 20 },
          { id: 'p4', name: 'fa0/4', macAddress: '02:00:00:10:00:04', vlanMode: 'access', accessVlan: 20 },
          {
            id: 'p24',
            name: 'fa0/24',
            macAddress: '02:00:00:10:00:24',
            vlanMode: 'trunk',
            trunkAllowedVlans: [10, 20],
            nativeVlan: 1,
          },
        ],
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 680, y: 250 },
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '192.0.2.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:00',
            subInterfaces: [
              {
                id: 'eth0.10',
                parentInterfaceId: 'eth0',
                vlanId: 10,
                ipAddress: '10.0.10.1',
                prefixLength: 24,
              },
              {
                id: 'eth0.20',
                parentInterfaceId: 'eth0',
                vlanId: 20,
                ipAddress: '10.0.20.1',
                prefixLength: 24,
              },
            ],
          },
        ],
        staticRoutes: [
          { destination: '10.0.10.0/24', nextHop: 'direct' },
          { destination: '10.0.20.0/24', nextHop: 'direct' },
          { destination: '192.0.2.0/24', nextHop: 'direct' },
        ],
      },
    },
  ],
  edges: [
    { id: 'e-a1', source: 'host-a1', target: 'switch-1', targetHandle: 'p1', type: 'smoothstep' },
    { id: 'e-a2', source: 'host-a2', target: 'switch-1', targetHandle: 'p2', type: 'smoothstep' },
    { id: 'e-b1', source: 'host-b1', target: 'switch-1', targetHandle: 'p3', type: 'smoothstep' },
    { id: 'e-b2', source: 'host-b2', target: 'switch-1', targetHandle: 'p4', type: 'smoothstep' },
    { id: TRUNK_EDGE_ID, source: 'switch-1', target: 'router-1', sourceHandle: 'p24', targetHandle: 'eth0', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

const BTN_BASE: CSSProperties = {
  padding: '7px 12px',
  borderRadius: 6,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
};

const BTN_PRIMARY: CSSProperties = {
  ...BTN_BASE,
  background: '#0f766e',
  color: '#f0fdfa',
};

const BTN_SECONDARY: CSSProperties = {
  ...BTN_BASE,
  background: '#1e293b',
  borderColor: '#334155',
  color: '#cbd5e1',
};

const BTN_DANGER: CSSProperties = {
  ...BTN_BASE,
  background: '#7f1d1d',
  color: '#fee2e2',
};

const BTN_DISABLED: CSSProperties = {
  ...BTN_BASE,
  background: '#111827',
  borderColor: '#1f2937',
  color: '#6b7280',
  cursor: 'not-allowed',
};

function buildPacket(
  topology: NetworkTopology,
  srcNodeId: string,
  dstNodeId: string,
): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === srcNodeId);
  const dstNode = topology.nodes.find((node) => node.id === dstNodeId);
  const srcIp = srcNode?.data.ip;
  const dstIp = dstNode?.data.ip;

  if (!srcNode || !dstNode || typeof srcIp !== 'string' || typeof dstIp !== 'string') {
    return null;
  }

  return {
    id: `pkt-${Date.now()}`,
    srcNodeId,
    dstNodeId,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
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
          data: 'vlan-demo',
        },
      },
    },
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function VlanDemoInner() {
  const { topology } = useNetlabContext();
  const { engine, sendPacket, state, isRecomputing } = useSimulation();
  const { isEdgeDown, toggleEdge } = useFailure();
  const didAutoSend = useRef(false);
  const trunkDown = isEdgeDown(TRUNK_EDGE_ID);

  const sendBetween = async (srcNodeId: string, dstNodeId: string) => {
    const packet = buildPacket(topology, srcNodeId, dstNodeId);
    if (!packet) return;
    engine.reset();
    await sendPacket(packet);
  };

  useEffect(() => {
    if (didAutoSend.current || state.status !== 'idle') return;
    didAutoSend.current = true;
    void sendBetween('host-a1', 'host-b1');
  }, [state.status]);

  const activeTrace = state.currentTraceId
    ? state.traces.find((trace) => trace.packetId === state.currentTraceId) ?? null
    : null;

  const lastHop = activeTrace?.hops[activeTrace.hops.length - 1];
  const headline = trunkDown
    ? 'Trunk is down. Inter-VLAN traffic should drop while same-VLAN traffic still works.'
    : 'Trunk is up. Router-on-a-stick can move traffic between VLAN 10 and VLAN 20.';

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 11,
            maxWidth: 320,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>VLAN Demo</div>
          <div>{headline}</div>
          <div style={{ marginTop: 6, color: '#94a3b8' }}>
            Click <strong>SW1</strong> to inspect access/trunk port VLANs and <strong>R1</strong> to inspect sub-interfaces.
          </div>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={420}
        maxWidth={680}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid #1e293b',
              display: 'grid',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: '#111827',
                  border: '1px solid #1f2937',
                }}
              >
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>TRUNK</div>
                <div style={{ marginTop: 4, color: trunkDown ? '#fca5a5' : '#86efac', fontFamily: 'monospace', fontWeight: 700 }}>
                  {trunkDown ? 'DOWN' : 'UP'}
                </div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: '#111827',
                  border: '1px solid #1f2937',
                }}
              >
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>LATEST RESULT</div>
                <div style={{ marginTop: 4, color: lastHop?.event === 'drop' ? '#fca5a5' : '#93c5fd', fontFamily: 'monospace', fontWeight: 700 }}>
                  {activeTrace?.status?.toUpperCase() ?? 'IDLE'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => void sendBetween('host-a1', 'host-a2')}
                style={BTN_PRIMARY}
              >
                Send a1→a2
              </button>
              <button
                type="button"
                onClick={() => void sendBetween('host-a1', 'host-b1')}
                style={BTN_PRIMARY}
              >
                Send a1→b1
              </button>
              <button
                type="button"
                onClick={() => toggleEdge(TRUNK_EDGE_ID)}
                disabled={trunkDown}
                style={trunkDown ? BTN_DISABLED : BTN_DANGER}
              >
                Break trunk
              </button>
              <button
                type="button"
                onClick={() => toggleEdge(TRUNK_EDGE_ID)}
                disabled={!trunkDown}
                style={!trunkDown ? BTN_DISABLED : BTN_SECONDARY}
              >
                Restore trunk
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
              {isRecomputing && 'Recomputing last packet after topology failure change...'}
              {!isRecomputing && lastHop?.event === 'drop' && `Last drop reason: ${lastHop.reason}`}
              {!isRecomputing && lastHop?.event !== 'drop' && 'Send traffic inside one VLAN or across VLANs to compare forwarding paths.'}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 12,
            }}
          >
            <TraceSummary />

            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: 'var(--netlab-bg-panel)',
                border: '1px solid var(--netlab-border-subtle)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <PacketTimeline />
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <HopInspector />
            </div>
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function VlanDemo() {
  return (
    <DemoShell
      title="VLAN (802.1Q)"
      desc="Access/trunk segmentation with router-on-a-stick inter-VLAN routing"
    >
      <NetlabProvider topology={VLAN_TOPOLOGY}>
        <FailureProvider>
          <SimulationProvider autoRecompute>
            <VlanDemoInner />
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
