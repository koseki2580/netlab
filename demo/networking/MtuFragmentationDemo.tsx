import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import {
  buildFragmentedEchoTopology,
  DEFAULT_FRAGMENTED_ECHO_TUNNEL_MTU,
} from '../../src/scenarios/fragmented-echo';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const PING_PAYLOAD_BYTES = 1200;

const CARD_STYLE: CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 10,
  padding: 12,
};

const LABEL_STYLE: CSSProperties = {
  color: '#94a3b8',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  marginBottom: 8,
  textTransform: 'uppercase',
};

const BUTTON_STYLE: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
};

function buildPingPacket(topology: NetworkTopology, df: boolean): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === 'host-a');
  const dstNode = topology.nodes.find((node) => node.id === 'host-b');
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
    id: `mtu-frag-${Date.now()}`,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
    currentDeviceId: srcNode.id,
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
        flags: { df, mf: false },
        payload: {
          layer: 'L4',
          type: 8,
          code: 0,
          checksum: 0,
          identifier: 1,
          sequenceNumber: 1,
          data: 'x'.repeat(PING_PAYLOAD_BYTES),
        },
      },
    },
  };
}

export default function MtuFragmentationDemo() {
  const [tunnelMtu, setTunnelMtu] = useState(DEFAULT_FRAGMENTED_ECHO_TUNNEL_MTU);
  const topology = useMemo(() => buildFragmentedEchoTopology(tunnelMtu), [tunnelMtu]);
  const tutorialId = new URLSearchParams(window.location.search).get('tutorial') ?? null;
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="MTU & IPv4 Fragmentation"
      desc="Watch a low-MTU routed hop fragment oversized IPv4 packets or return ICMP Fragmentation Needed."
    >
      <NetlabProvider topology={topology} {...tutorialProps}>
        <SimulationProvider>
          <FragmentationDemoInner tunnelMtu={tunnelMtu} onTunnelMtuChange={setTunnelMtu} />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

function FragmentationDemoInner({
  tunnelMtu,
  onTunnelMtuChange,
}: {
  tunnelMtu: number;
  onTunnelMtuChange: (value: number) => void;
}) {
  const { topology } = useNetlabContext();
  const { engine, sendPacket, state, isRecomputing } = useSimulation();
  const activeTrace = state.currentTraceId
    ? (state.traces.find((trace) => trace.packetId === state.currentTraceId) ?? null)
    : null;
  const fragmentHops = activeTrace?.hops.filter((hop) => hop.action === 'fragment') ?? [];
  const reassemblyHop =
    activeTrace?.hops.find((hop) => hop.action === 'reassembly-complete') ?? null;
  const fragNeededHop =
    activeTrace?.hops.find((hop) => hop.reason === 'fragmentation-needed') ?? null;
  const [dfEnabled, setDfEnabled] = useState(false);

  const sendPing = async () => {
    const packet = buildPingPacket(topology, dfEnabled);
    if (!packet) return;
    engine.reset();
    await sendPacket(packet);
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
            maxWidth: 360,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>
            MTU & Fragmentation
          </div>
          <div>
            Host A sends toward Host B across a low-MTU tunnel. R1 fragments on egress when DF is
            clear, or drops and emits ICMP Fragmentation Needed when DF is set.
          </div>
          <div style={{ marginTop: 6, color: '#94a3b8' }}>
            With the default `600`-byte tunnel MTU and a `1200`-byte ICMP data field, Netlab shows
            three IPv4 fragments because the ICMP header is part of the fragmented payload.
          </div>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={460}
        maxWidth={760}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 12, display: 'grid', gap: 12, borderBottom: '1px solid #1e293b' }}>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Controls</div>
            <label
              style={{
                display: 'grid',
                gap: 6,
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              <span>Tunnel MTU: {tunnelMtu} bytes</span>
              <input
                type="range"
                min={300}
                max={1500}
                step={8}
                value={tunnelMtu}
                onChange={(event) => onTunnelMtuChange(Number.parseInt(event.target.value, 10))}
              />
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: 12,
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={dfEnabled}
                onChange={(event) => setDfEnabled(event.target.checked)}
              />
              Set DF bit on ICMP echo from A
            </label>
            <button
              type="button"
              style={BUTTON_STYLE}
              disabled={isRecomputing}
              onClick={() => void sendPing()}
            >
              ping A → B (1200-byte payload)
            </button>
          </div>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Trace Notes</div>
            <div
              style={{
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: 12,
                display: 'grid',
                gap: 6,
              }}
            >
              <div>Fragment hops: {fragmentHops.length}</div>
              <div>
                Reassembly:{' '}
                {reassemblyHop
                  ? `complete (${reassemblyHop.fragmentCount ?? fragmentHops.length} fragments)`
                  : 'not completed'}
              </div>
              <div>
                Frag-Needed ICMP:{' '}
                {fragNeededHop
                  ? `yes (next-hop MTU ${fragNeededHop.nextHopMtu ?? 'unknown'})`
                  : 'no'}
              </div>
            </div>
          </div>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Why You See Multiple Packets</div>
            <div
              style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
            >
              R1&apos;s egress link to R2 has a finite MTU. With DF disabled, the packet is split
              into RFC 791 fragments. Host B reassembles them before the echo reaches the
              destination stack. With DF enabled, R1 keeps the packet intact and returns ICMP type 3
              code 4 instead.
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'auto minmax(220px, 0.9fr) minmax(220px, 1.1fr)',
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid #1e293b' }}>
            <TraceSummary />
          </div>
          <div style={{ minHeight: 0, borderBottom: '1px solid #1e293b' }}>
            <PacketTimeline />
          </div>
          <div style={{ minHeight: 0 }}>
            <HopInspector />
          </div>
        </div>
      </ResizableSidebar>
    </div>
  );
}
