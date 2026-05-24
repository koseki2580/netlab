import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoShell from '../DemoShell';
import type { CommandPaletteItem } from '../../src/components/CommandPalette';
import { NetlabAppShellV2 } from '../../src/components/NetlabAppShellV2';
import { LineageBanner } from '../../src/components/LineageBanner';
import { PreFlightBrief } from '../../src/components/PreFlightBrief';
import {
  forkScenario,
  getSandbox,
  recordSandboxDiff,
  resetSandbox,
  type Sandbox,
} from '../../src/sandbox/fork';
import type { NetlabAudience } from '../../src/theme';
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
import { useShellChrome } from '../ShellChromeContext';

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
  const shellChrome = useShellChrome();
  const navigate = useNavigate();
  const audience = useMemo(() => readAudience(), []);

  const sendProbe = useCallback(async () => {
    engine.clearTraces();
    await engine.ping('c1', '10.4.0.10');
  }, [engine]);

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
  const isLastStep = totalHops > 0 && stepIdx === totalHops - 1;

  // M5 — fork-to-sandbox lineage. `?fork=<id>` marks a forked session.
  const forkId = useMemo(() => new URLSearchParams(window.location.search).get('fork'), []);
  const [sandbox, setSandbox] = useState<Sandbox | null>(() =>
    forkId ? (getSandbox(forkId) ?? null) : null,
  );

  const handleFork = useCallback(() => {
    const created = forkScenario('ospf-convergence', stepIdx);
    // Round-trip the topology state (failed link) so the fork reopens as it was.
    const linkParam = primaryLinkDown ? '&link=down' : '';
    window.location.href = `?sandbox=1&fork=${created.id}${linkParam}#/routing/ospf-convergence`;
  }, [stepIdx, primaryLinkDown]);

  const handleToggleLink = useCallback(() => {
    onTogglePrimaryLink();
    if (forkId) setSandbox(recordSandboxDiff(forkId, { edges: 1 }) ?? null);
  }, [onTogglePrimaryLink, forkId]);

  const handleResetFork = useCallback(() => {
    if (forkId) setSandbox(resetSandbox(forkId) ?? null);
  }, [forkId]);

  const handleCompareFork = useCallback(() => {
    void navigate('/compare/ospf-convergence/rip-convergence');
  }, [navigate]);

  const handleCloseFork = useCallback(() => {
    window.location.href = `${window.location.pathname}#/routing/ospf-convergence`;
  }, []);
  const packetsCount = state.traces.length;
  const dropsCount = state.traces.filter((t) => t.status === 'dropped').length;
  const arpCount = Object.values(state.nodeArpTables).reduce(
    (acc, table) => acc + Object.keys(table).length,
    0,
  );

  const jumpTo = useCallback(
    (step: number) => {
      if (totalHops === 0) return;
      engine.selectHop(Math.max(0, Math.min(totalHops - 1, step)));
    },
    [engine, totalHops],
  );

  const togglePlay = useCallback(() => {
    if (totalHops === 0) return;
    if (state.status === 'running') {
      engine.pause();
    } else {
      engine.play();
    }
  }, [engine, state.status, totalHops]);

  // M5 deep-seed — a forked session replays the probe and opens at the forked step,
  // so the sandbox shows the simulation state as of the fork (topology restored above).
  const forkProbeStartedRef = useRef(false);
  const forkPositionedRef = useRef(false);
  useEffect(() => {
    if (forkId && !forkProbeStartedRef.current) {
      forkProbeStartedRef.current = true;
      void sendProbe();
    }
  }, [forkId, sendProbe]);
  useEffect(() => {
    if (forkId && sandbox && totalHops > 0 && !forkPositionedRef.current) {
      forkPositionedRef.current = true;
      jumpTo(sandbox.forkedAtStep);
    }
  }, [forkId, sandbox, totalHops, jumpTo]);

  useEffect(
    () =>
      shellChrome.registerKeymapActions({
        playPause: togglePlay,
        stepBackward: (delta) => jumpTo(stepIdx - delta),
        stepForward: (delta) => jumpTo(stepIdx + delta),
        jumpStart: () => jumpTo(0),
        jumpEnd: () => jumpTo(totalHops - 1),
      }),
    [jumpTo, shellChrome, stepIdx, togglePlay, totalHops],
  );

  const tracePaletteItems = useMemo<CommandPaletteItem[]>(
    () =>
      currentTrace?.hops.map((hop, index) => ({
        id: `trace-hop:${currentTrace.packetId}:${index}`,
        label: `Hop ${String(index).padStart(2, '0')} ${hop.event} ${hop.nodeLabel}`,
        subtitle:
          hop.toNodeId != null
            ? `${hop.nodeId} -> ${hop.toNodeId}`
            : `${hop.srcIp} -> ${hop.dstIp}`,
        group: 'Current trace',
        keywords: [
          currentTrace.packetId,
          hop.event,
          hop.nodeId,
          hop.nodeLabel,
          hop.protocol,
          hop.srcIp,
          hop.dstIp,
          hop.fromNodeId ?? '',
          hop.toNodeId ?? '',
          hop.reason ?? '',
        ],
        onSelect: () => jumpTo(index),
      })) ?? [],
    [currentTrace, jumpTo],
  );

  useEffect(
    () => shellChrome.registerPaletteItems(tracePaletteItems),
    [shellChrome, tracePaletteItems],
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
      onOpenPalette={shellChrome.openPalette}
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
            data-testid="ospf-fail-link"
            onClick={handleToggleLink}
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
          onOpenPalette={shellChrome.openPalette}
          onOpenHelp={shellChrome.openHelp}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {sandbox && (
          <LineageBanner
            sandbox={sandbox}
            originTitle="OSPF Preferred Path"
            onReset={handleResetFork}
            onCompare={handleCompareFork}
            onClose={handleCloseFork}
          />
        )}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
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
              <PreFlightBrief
                scenarioId="ospf-convergence"
                audience={audience}
                isLastStep={isLastStep}
                onAction={(actionId) => {
                  if (actionId === 'gallery') void navigate('/');
                  else if (actionId === 'fork') handleFork();
                }}
              />
            </div>
            <PacketScrubTimeline ownKeyboard={false} />
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
            <div
              style={{ padding: 12, display: 'grid', gap: 12, borderBottom: '1px solid #1e293b' }}
            >
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
      </div>
    </NetlabAppShellV2>
  );
}

/** Resolve the active audience from the URL or the persisted gallery setting. */
function readAudience(): NetlabAudience {
  const fromUrl = new URLSearchParams(window.location.search).get('audience');
  if (fromUrl === 'learner' || fromUrl === 'pro') return fromUrl;
  try {
    const stored = window.localStorage.getItem('netlab-audience');
    if (stored === 'learner' || stored === 'pro') return stored;
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return 'pro';
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
  // M5 — a forked session restores the topology state it was forked at (`?link=down`).
  const [primaryLinkDown, setPrimaryLinkDown] = useState(
    () => new URLSearchParams(window.location.search).get('link') === 'down',
  );
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
