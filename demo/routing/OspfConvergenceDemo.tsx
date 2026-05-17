import type React from 'react';
import { useMemo, useState } from 'react';
import DemoShell from '../DemoShell';
import { NetlabAppShellV2 } from '../../src/components/NetlabAppShellV2';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { PacketScrubTimeline } from '../../src/components/simulation/PacketScrubTimeline';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StepControls } from '../../src/components/simulation/StepControls';
import { StatusLine } from '../../src/components/StatusLine';
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
}: {
  primaryLinkDown: boolean;
  onTogglePrimaryLink: () => void;
}) {
  const { engine, state, exportPcap } = useSimulation();

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

  const downloadPcap = () => {
    const traceId = state.currentTraceId ?? undefined;
    const bytes = exportPcap(traceId);
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/vnd.tcpdump.pcap' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netlab-trace-${traceId ?? 'export'}.pcap`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <NetlabAppShellV2
      scenarioId="ospf-convergence"
      scenarioLayer="L3"
      isPlaying={state.status === 'running'}
      step={stepIdx}
      {...(totalHops > 0 ? { totalSteps: totalHops } : {})}
      onPlay={() => engine.play()}
      onPause={() => engine.pause()}
      onStep={() => engine.step()}
      onReset={() => engine.reset()}
      onExport={downloadPcap}
      extraActions={
        <>
          <button
            type="button"
            onClick={() => void sendProbe()}
            title="Send probe C1 -> C2"
            style={commandActionStyle('var(--netlab-accent-green)')}
          >
            Send Probe
          </button>
          <button
            type="button"
            onClick={onTogglePrimaryLink}
            title={
              primaryLinkDown
                ? 'Restore primary inter-router link'
                : 'Fail primary inter-router link'
            }
            style={commandActionStyle(
              primaryLinkDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-yellow)',
            )}
          >
            {primaryLinkDown ? 'Restore link' : 'Fail link'}
          </button>
        </>
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
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
          <PacketScrubTimeline />
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
    </NetlabAppShellV2>
  );
}

function commandActionStyle(accent: string): React.CSSProperties {
  return {
    height: 28,
    padding: '0 8px',
    borderRadius: 6,
    border: `1px solid color-mix(in srgb, ${accent} 34%, var(--netlab-border))`,
    color: accent,
    background: `color-mix(in srgb, ${accent} 10%, transparent)`,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

export default function OspfConvergenceDemo() {
  const [primaryLinkDown, setPrimaryLinkDown] = useState(false);
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
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
