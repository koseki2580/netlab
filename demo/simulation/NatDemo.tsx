import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { NatTableViewer } from '../../src/components/simulation/NatTableViewer';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import { NAT_DEMO_TOPOLOGY } from './natDemoTopology';

export { NAT_DEMO_TOPOLOGY };

function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
): InFlightPacket {
  return {
    id,
    srcNodeId,
    dstNodeId,
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
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
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
  };
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        color: 'var(--netlab-text-primary)',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 10px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  );
}

function NatDemoInner() {
  const { sendPacket } = useSimulation();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>

      <ResizableSidebar
        defaultWidth={500}
        maxWidth={760}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ActionButton
              label="Client A -> Internet (SNAT)"
              onClick={() => {
                void sendPacket(
                  makePacket(
                    `nat-snat-${Date.now()}`,
                    'client-1',
                    'server-1',
                    '192.168.1.10',
                    '198.51.100.10',
                    54321,
                    80,
                  ),
                );
              }}
            />
            <ActionButton
              label="Internet -> Client A (DNAT 8080)"
              onClick={() => {
                void sendPacket(
                  makePacket(
                    `nat-dnat-${Date.now()}`,
                    'server-1',
                    'client-1',
                    '198.51.100.10',
                    '203.0.113.1',
                    55000,
                    8080,
                  ),
                );
              }}
            />
          </div>

          <div style={{ flex: 1, minHeight: 170 }}>
            <NatTableViewer />
          </div>

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

          <div style={{ flex: 2, minHeight: 0 }}>
            <HopInspector />
          </div>
        </div>

        <SimulationControls />
      </ResizableSidebar>
    </div>
  );
}

export default function NatDemo() {
  const params = new URLSearchParams(window.location.search);
  const sandboxIntroId = params.get('intro') ?? null;
  const tutorialId = sandboxIntroId ? null : (params.get('tutorial') ?? null);
  const sandboxEnabled = params.get('sandbox') === '1';
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="NAT / PAT"
      desc="Inspect SNAT, DNAT port forwarding, and the live NAT table on an edge router"
    >
      <NetlabProvider
        topology={NAT_DEMO_TOPOLOGY}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled && sandboxIntroId ? { sandboxIntroId } : {})}
        {...tutorialProps}
      >
        <SimulationProvider>
          <NatDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
