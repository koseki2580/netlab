import type { CSSProperties } from 'react';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StepControls } from '../../src/components/simulation/StepControls';
import { basicArp } from '../../src/scenarios';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';

const CARD_STYLE: CSSProperties = {
  background: '#0b1220',
  border: '1px solid #1e293b',
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

function ArpTablePanel() {
  const { state } = useSimulation();
  const entries = Object.entries(state.nodeArpTables ?? {});

  return (
    <div style={CARD_STYLE}>
      <div style={LABEL_STYLE}>ARP Tables</div>
      {entries.length === 0 ? (
        <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
          Send the first packet to populate the sender cache.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {entries.map(([nodeId, table]) => (
            <div
              key={nodeId}
              style={{
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 10,
                background: '#020617',
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#e2e8f0',
              }}
            >
              <div style={{ color: '#7dd3fc', fontWeight: 700, marginBottom: 6 }}>{nodeId}</div>
              {Object.entries(table).length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No learned entries.</div>
              ) : (
                Object.entries(table).map(([ip, mac]) => (
                  <div
                    key={ip}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span>{ip}</span>
                    <span style={{ color: '#fbbf24' }}>{mac}</span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArpDemoInner() {
  const { engine } = useSimulation();

  const sendPing = async () => {
    engine.clear();
    await engine.ping('client-1', '203.0.113.10');
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <SimulationOverlayDock showRouteTable={false} />
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
          }}
        >
          <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>
            ARP Teaching Flow
          </div>
          <div>
            The first IPv4 packet cannot leave the sender until it learns a first-hop MAC address.
          </div>
          <div style={{ marginTop: 6, color: '#94a3b8' }}>
            Use the trace on the right to inspect the ARP request and reply before the routed packet
            continues.
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
            <button
              type="button"
              onClick={() => void sendPing()}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #0f766e',
                background: '#115e59',
                color: '#ecfeff',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ping client → server
            </button>
          </div>
          <ArpTablePanel />
          <div style={CARD_STYLE}>
            <StepControls />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'minmax(220px, 0.9fr) minmax(220px, 1.1fr)',
          }}
        >
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

export default function ArpDemo() {
  const tutorialId = new URLSearchParams(window.location.search).get('tutorial') ?? null;
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="ARP Basics"
      desc="Watch ARP resolve the first-hop MAC before the first routed IPv4 packet can move."
    >
      <NetlabProvider topology={basicArp.topology} {...tutorialProps}>
        <SimulationProvider>
          <ArpDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
