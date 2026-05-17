import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoShell from '../DemoShell';
import { NetlabAppShell } from '../../src/components/NetlabAppShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StepControls } from '../../src/components/simulation/StepControls';
import { StatusLine } from '../../src/components/StatusLine';
import { ToolGroup, ToolGroupButton } from '../../src/components/ToolGroup';
import { ZeroStateHint } from '../../src/components/ZeroStateHint';
import { buildOspfConvergenceTopology } from '../../src/scenarios/ospf-convergence';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { readDemoEmbedParams } from '../embedParams';

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
  onBackToGallery,
  embedded,
}: {
  primaryLinkDown: boolean;
  onTogglePrimaryLink: () => void;
  onBackToGallery: () => void;
  embedded: boolean;
}) {
  const { engine, state } = useSimulation();

  const sendProbe = async () => {
    engine.clearTraces();
    await engine.ping('c1', '10.4.0.10');
  };

  const status =
    state.status === 'running'
      ? { label: 'running', tone: 'running' as const }
      : state.traces.length > 0
        ? { label: 'ready', tone: 'ready' as const }
        : { label: 'idle', tone: 'idle' as const };

  // Status line (N5) — surface live counts and progress through the bar
  // below the canvas so the user can read state without watching the toolbar.
  const currentTrace =
    state.traces.find((t) => t.packetId === state.currentTraceId) ??
    state.traces[state.traces.length - 1] ??
    null;
  const totalHops = currentTrace?.hops.length ?? 0;
  const stepIdx = state.currentStep >= 0 ? state.currentStep : 0;
  const packetsCount = state.traces.length;
  const dropsCount = state.traces.filter((t) => t.status === 'dropped').length;
  const arpCount = Object.values(state.nodeArpTables).reduce(
    (acc, table) => acc + Object.keys(table).length,
    0,
  );

  return (
    <NetlabAppShell
      scenarioId="ospf-convergence"
      scenarioLayer="L3"
      {...(embedded ? {} : { onBackToGallery })}
      topologyZone={
        <ToolGroup title="TOPOLOGY" accent="var(--netlab-accent-blue)">
          <ToolGroupButton active accent="var(--netlab-accent-blue)">
            View
          </ToolGroupButton>
        </ToolGroup>
      }
      runZone={
        <ToolGroup title="RUN" accent="var(--netlab-accent-green)">
          <ToolGroupButton
            accent="var(--netlab-accent-green)"
            onClick={() => void sendProbe()}
            title="Send probe C1 → C2"
          >
            ▶ Send Probe
          </ToolGroupButton>
        </ToolGroup>
      }
      inspectZone={
        <ToolGroup title="INSPECT" accent="var(--netlab-accent-cyan)">
          <ToolGroupButton active accent="var(--netlab-accent-cyan)">
            Routes
          </ToolGroupButton>
        </ToolGroup>
      }
      sandboxZone={
        <ToolGroup title="SANDBOX" accent="var(--netlab-accent-yellow)">
          <ToolGroupButton
            active={primaryLinkDown}
            accent={primaryLinkDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-yellow)'}
            onClick={onTogglePrimaryLink}
            title={
              primaryLinkDown
                ? 'Restore primary inter-router link'
                : 'Fail primary inter-router link'
            }
          >
            {primaryLinkDown ? '↺ Restore link' : '✎ Fail link'}
          </ToolGroupButton>
        </ToolGroup>
      }
      status={status}
      statusLine={
        <StatusLine
          scenarioId="ospf-convergence"
          status={status.tone}
          {...(totalHops > 0 ? { step: stepIdx, totalSteps: totalHops } : {})}
          packetsCount={packetsCount}
          dropsCount={dropsCount}
          arpCount={arpCount}
        />
      }
    >
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <NetlabCanvas />
          <SimulationOverlayDock showRouteTable />
          <ZeroStateHint />
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
              Toggle the primary link, then resend the probe to confirm the recomputed path now
              leaves through R3.
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
    </NetlabAppShell>
  );
}

export default function OspfConvergenceDemo() {
  const [primaryLinkDown, setPrimaryLinkDown] = useState(false);
  const navigate = useNavigate();
  const topology = useMemo(() => buildOspfConvergenceTopology(primaryLinkDown), [primaryLinkDown]);
  const params = new URLSearchParams(window.location.search);
  const sandboxIntroId = params.get('intro') ?? null;
  const assessmentScenarioId = params.get('assessment') ?? null;
  const tutorialId =
    sandboxIntroId || assessmentScenarioId ? null : (params.get('tutorial') ?? null);
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};
  const assessmentProps = assessmentScenarioId ? { assessmentScenarioId } : {};

  return (
    <DemoShell
      title="OSPF Convergence"
      desc="Observe the lower-cost route first, then recompute toward the backup path after removing the primary inter-router link."
      embedded={embedded}
    >
      <NetlabProvider
        topology={topology}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...(sandboxEnabled && sandboxIntroId ? { sandboxIntroId } : {})}
        {...tutorialProps}
        {...assessmentProps}
      >
        <SimulationProvider>
          <OspfConvergenceInner
            primaryLinkDown={primaryLinkDown}
            onTogglePrimaryLink={() => setPrimaryLinkDown((value) => !value)}
            onBackToGallery={() => navigate('/')}
            embedded={embedded}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
