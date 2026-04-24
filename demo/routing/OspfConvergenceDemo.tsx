import { useMemo, useState } from 'react';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StepControls } from '../../src/components/simulation/StepControls';
import { buildOspfConvergenceTopology } from '../../src/scenarios/ospf-convergence';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';

function RouteSummaryPanel() {
  const { routeTable } = useNetlabContext();
  const preferredRoute =
    routeTable
      .get('r1')
      ?.find((entry) => entry.destination === '10.4.0.0/24' && entry.protocol === 'ospf') ?? null;

  return (
    <div
      style={{
        background: '#0b1220',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: 12,
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <div
        style={{
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        R1 PREFERRED ROUTE
      </div>
      {preferredRoute ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: '#7dd3fc', fontWeight: 700 }}>{preferredRoute.destination}</div>
          <div>next-hop: {preferredRoute.nextHop}</div>
          <div style={{ color: '#94a3b8' }}>
            metric {preferredRoute.metric} • {preferredRoute.protocol}/
            {preferredRoute.adminDistance}
          </div>
        </div>
      ) : (
        <div style={{ color: '#94a3b8' }}>No OSPF route currently resolves at R1.</div>
      )}
    </div>
  );
}

function OspfConvergenceInner({
  primaryLinkDown,
  onTogglePrimaryLink,
}: {
  primaryLinkDown: boolean;
  onTogglePrimaryLink: () => void;
}) {
  const { engine } = useSimulation();

  const sendProbe = async () => {
    engine.clearTraces();
    await engine.ping('c1', '10.4.0.10');
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <SimulationOverlayDock showRouteTable />
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
            OSPF Route Choice
          </div>
          <div>
            R1 prefers the lower-cost path through R2 until the primary inter-router link is
            removed.
          </div>
          <div style={{ marginTop: 6, color: '#94a3b8' }}>
            Toggle the primary link, then resend the probe to confirm the recomputed path now leaves
            through R3.
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
          <div
            style={{
              background: '#0b1220',
              border: '1px solid #1e293b',
              borderRadius: 10,
              padding: 12,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              CONTROLS
            </div>
            <button
              type="button"
              onClick={() => void sendProbe()}
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
              send probe C1 → C2
            </button>
            <button
              type="button"
              onClick={onTogglePrimaryLink}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${primaryLinkDown ? '#f87171' : '#38bdf8'}`,
                background: primaryLinkDown ? '#7f1d1d' : '#0f172a',
                color: primaryLinkDown ? '#fecaca' : '#bae6fd',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {primaryLinkDown ? 'restore primary link' : 'fail primary link'}
            </button>
          </div>
          <RouteSummaryPanel />
          <div
            style={{
              background: '#0b1220',
              border: '1px solid #1e293b',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <StepControls />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <PacketTimeline />
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function OspfConvergenceDemo() {
  const [primaryLinkDown, setPrimaryLinkDown] = useState(false);
  const topology = useMemo(() => buildOspfConvergenceTopology(primaryLinkDown), [primaryLinkDown]);
  const params = new URLSearchParams(window.location.search);
  const tutorialId = params.get('tutorial') ?? null;
  const sandboxEnabled = params.get('sandbox') === '1';
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="OSPF Convergence"
      desc="Observe the lower-cost route first, then recompute toward the backup path after removing the primary inter-router link."
    >
      <NetlabProvider topology={topology} sandboxEnabled={sandboxEnabled} {...tutorialProps}>
        <SimulationProvider>
          <OspfConvergenceInner
            primaryLinkDown={primaryLinkDown}
            onTogglePrimaryLink={() => setPrimaryLinkDown((value) => !value)}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
