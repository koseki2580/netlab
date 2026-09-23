import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoShell from '../DemoShell';
import type { CommandPaletteItem } from '../../src/components/CommandPalette';
import { AudiencePill, useAudience } from '../../src/components/AudiencePill';
import { NetlabAppShellV2 } from '../../src/components/NetlabAppShellV2';
import { LineageBanner } from '../../src/components/LineageBanner';
import { toast } from '../../src/components/ToastBus';
import { PreFlightBrief } from '../../src/components/PreFlightBrief';
import { getRecommendedNext, NextScenarioRail } from '../../src/components/NextScenarioRail';
import { scenarioRegistry } from '../../src/scenarios';
import type { Scenario, ScenarioBrief } from '../../src/scenarios/types';
import type { PacketTrace } from '../../src/types/simulation';
import {
  forkScenario,
  getSandbox,
  recordSandboxDiff,
  resetSandbox,
  type Sandbox,
} from '../../src/sandbox/fork';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { PacketScrubTimeline } from '../../src/components/simulation/PacketScrubTimeline';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { DropEventOverlay } from '../../src/components/simulation/DropEventOverlay';
import { StepControls } from '../../src/components/simulation/StepControls';
import { StatusLine } from '../../src/components/StatusLine';
import { ZeroStateHint } from '../../src/components/ZeroStateHint';
import {
  buildOspfConvergenceTopology,
  ospfConvergence,
} from '../../src/scenarios/ospf-convergence';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { readDemoEmbedParams } from '../embedParams';
import { useShellChrome } from '../ShellChromeContext';
import { useSandboxOrNull } from '../../src/sandbox/useSandbox';
import { useGalleryLocale, useT } from '../localeContext';

/** The inter-router link this lesson fails; the assessment names the same id. */
const PRIMARY_LINK_ID = 'e-r2-r4';

/**
 * The scenario's brief in Japanese. The scenario authors it in English; the
 * lesson passes this one to the brief card instead when Japanese is chosen.
 * Steps, marker kinds, prerequisite codes and action ids are the scenario's own.
 */
const BRIEF_JA: ScenarioBrief | undefined = ospfConvergence.brief && {
  ...ospfConvergence.brief,
  goal: 'OSPF がコストの最も低い経路を選ぶようすと、ルータ間の主経路のリンクが落ちたときに予備の経路を計算し直すようすを見ます。',
  est: '約 3 分',
  watchPoints: [
    { step: 1, kind: 'route', label: 'R1 はコストの低い R2 経由の経路で C2 へ転送します' },
    { step: 3, kind: 'spf', label: '主経路のリンクを落とすと、R1 で SPF の再計算が起きます' },
    { step: 5, kind: 'route', label: '計算し直した経路では、R1 から R3 経由で出ていきます' },
  ],
  conclusion: {
    headline: '主経路のリンクが落ちたあと、OSPF は予備の経路を計算し直しました。',
    detail:
      'R1 は最初コストの低い R2 経由の経路を選び、そのリンクが落ちると R3 経由へ収束しました。静的な設定変更は必要ありません。',
    actions: [
      { id: 'fork', label: 'サンドボックスで試す →', kind: 'primary' },
      { id: 'gallery', label: 'ほかのシナリオを見る →' },
    ],
  },
};

/** One probe the learner sent, kept so a later run can be compared with it. */
export interface ProbeRun {
  readonly packetId: string;
  readonly linkDown: boolean;
  readonly path: string;
}

/**
 * The path the probe took to its destination, by device name: the hops up to
 * the first delivery (or the drop), without the ARP exchanges on the way, each
 * device once. `C1 → R1 → R2 → R4 → C2`.
 */
export function probePath(trace: PacketTrace): string {
  const labels: string[] = [];
  for (const hop of trace.hops) {
    if (hop.event === 'arp-request' || hop.event === 'arp-reply') continue;
    if (labels[labels.length - 1] !== hop.nodeLabel) labels.push(hop.nodeLabel);
    if (hop.event === 'deliver' || hop.event === 'drop') break;
  }
  return labels.join(' → ');
}

function RouteComparison({ runs }: { runs: readonly ProbeRun[] }) {
  const t = useT();
  const current = runs[runs.length - 1] ?? null;
  const previous = runs[runs.length - 2] ?? null;
  const linkWord = (run: ProbeRun) =>
    run.linkDown ? t('link down', 'リンク断') : t('link up', 'リンクあり');

  return (
    <div style={{ display: 'grid', gap: 4, marginTop: 10 }}>
      <div data-testid="ospf-route-current">
        {t('Probe route', '今回の経路')}:{' '}
        {current
          ? `${current.path} (${linkWord(current)})`
          : t('send a probe to see it', 'プローブを送ると表示されます')}
      </div>
      {previous && (
        <div data-testid="ospf-route-previous" style={{ color: 'var(--netlab-text-secondary)' }}>
          {t('Previous route', '前回の経路')}: {previous.path} ({linkWord(previous)})
        </div>
      )}
    </div>
  );
}

/**
 * Every router's table, one at a time, in the side rail. Floating over the
 * canvas they covered R4 and C2, and more than half of their own rows.
 */
function RouterTablesPanel() {
  const t = useT();
  const { topology, routeTable } = useNetlabContext();
  const routers = topology.nodes.filter((node) => node.data.role === 'router');
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected && routers.some((r) => r.id === selected) ? selected : routers[0]?.id;
  const routes = activeId ? (routeTable.get(activeId) ?? []) : [];

  return (
    <div
      data-testid="ospf-route-tables"
      style={{
        background: 'var(--netlab-bg-primary)',
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 10,
        padding: 12,
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {t('ROUTE TABLES', '経路表')}
      </div>
      <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {routers.map((router) => {
          const active = router.id === activeId;
          return (
            <button
              key={router.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`ospf-route-tab-${router.id}`}
              onClick={() => setSelected(router.id)}
              style={{
                padding: '3px 10px',
                borderRadius: 6,
                border: `1px solid ${active ? 'var(--netlab-accent-blue)' : 'var(--netlab-border-subtle)'}`,
                background: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                color: active ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
            >
              {router.data.label}
            </button>
          );
        })}
      </div>
      <table
        role="tabpanel"
        data-testid="ospf-route-table-rows"
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr style={{ color: 'var(--netlab-text-muted)', textAlign: 'left' }}>
            <th style={{ padding: '2px 4px', fontWeight: 600 }}>{t('Destination', '宛先')}</th>
            <th style={{ padding: '2px 4px', fontWeight: 600 }}>{t('Next hop', '次ホップ')}</th>
            <th style={{ padding: '2px 4px', fontWeight: 600, textAlign: 'right' }}>
              {t('Metric', 'メトリック')}
            </th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={`${route.destination}-${route.nextHop}`}>
              <td style={{ padding: '2px 4px' }}>{route.destination}</td>
              <td style={{ padding: '2px 4px', color: 'var(--netlab-text-secondary)' }}>
                {route.nextHop === 'direct' ? t('direct', '直結') : route.nextHop}
              </td>
              <td style={{ padding: '2px 4px', textAlign: 'right' }}>{route.metric}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RouteSummaryPanel({ runs }: { runs: readonly ProbeRun[] }) {
  const t = useT();
  const { routeTable } = useNetlabContext();
  const preferredRoute =
    routeTable
      .get('r1')
      ?.find((entry) => entry.destination === '10.4.0.0/24' && entry.protocol === 'ospf') ?? null;

  return (
    <div
      style={{
        background: 'var(--netlab-bg-primary)',
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 10,
        padding: 12,
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {t('R1 PREFERRED ROUTE', 'R1 の優先経路')}
      </div>
      {preferredRoute ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 700 }}>
            {preferredRoute.destination}
          </div>
          <div>
            {t('next-hop:', '次ホップ:')} {preferredRoute.nextHop}
          </div>
          <div style={{ color: 'var(--netlab-text-secondary)' }}>
            {t('metric', 'メトリック')} {preferredRoute.metric} • {preferredRoute.protocol}/
            {preferredRoute.adminDistance}
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--netlab-text-secondary)' }}>
          {t(
            'No OSPF route currently resolves at R1.',
            '今は R1 で使える OSPF の経路がありません。',
          )}
        </div>
      )}
      <RouteComparison runs={runs} />
    </div>
  );
}

function OspfConvergenceInner({
  primaryLinkDown,
  onTogglePrimaryLink,
  runs,
  onProbeFinished,
}: {
  primaryLinkDown: boolean;
  onTogglePrimaryLink: () => void;
  runs: readonly ProbeRun[];
  onProbeFinished: (run: ProbeRun) => void;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const { engine, state, exportPcap } = useSimulation();
  const shellChrome = useShellChrome();
  const navigate = useNavigate();
  // Reactive (Q7): the terminal-surface pill broadcasts netlab:audience, so the
  // PreFlightBrief full/strip mode switches live without a reload.
  const audience = useAudience();
  // A guided intro or an assessment opened from the gallery brings its own
  // instructions; the lesson's brief would cover them.
  const guided = (() => {
    const search = new URLSearchParams(window.location.search);
    return search.has('intro') || search.has('assessment');
  })();

  // R5 — acknowledge the mode switch with a toast (skip the initial mount so a
  // page load is silent).
  const audienceMounted = useRef(false);
  useEffect(() => {
    if (!audienceMounted.current) {
      audienceMounted.current = true;
      return;
    }
    toast.info(
      audience === 'learner'
        ? t(
            'Audience: learner — briefs will show in full',
            '対象を学習者にしました — 説明をすべて表示します',
          )
        : t(
            'Audience: pro — briefs collapse to a strip',
            '対象をプロにしました — 説明を1行にたたみます',
          ),
    );
  }, [audience, t]);

  // Q8 — recommend what to do next once the scenario finishes.
  const nextScenarios = useMemo(() => {
    const current = scenarioRegistry.get('ospf-convergence');
    return current ? getRecommendedNext(current, scenarioRegistry.list(), 3) : [];
  }, []);
  const openScenario = useCallback(
    (id: string) => {
      const current = scenarioRegistry.get('ospf-convergence');
      void navigate(resolveScenarioHref(id, current));
    },
    [navigate],
  );

  const sendProbe = useCallback(async () => {
    engine.clearTraces();
    await engine.ping('c1', '10.4.0.10');
  }, [engine]);

  // Keep each finished probe's path. Failing the link rebuilds the topology and
  // the simulation with it, which wiped the run the learner was meant to compare
  // the recomputed route against; the page, not the engine, remembers it.
  const firstTrace = state.traces[0] ?? null;
  useEffect(() => {
    if (!firstTrace || firstTrace.status === 'in-flight') return;
    onProbeFinished({
      packetId: firstTrace.packetId,
      linkDown: primaryLinkDown,
      path: probePath(firstTrace),
    });
  }, [firstTrace, primaryLinkDown, onProbeFinished]);

  const status =
    state.status === 'running'
      ? { label: t('running', '実行中'), tone: 'running' as const }
      : state.traces.length > 0
        ? { label: t('ready', '準備完了'), tone: 'ready' as const }
        : { label: t('idle', '待機中'), tone: 'idle' as const };

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

  const editSession = useSandboxOrNull();

  const handleToggleLink = useCallback(() => {
    onTogglePrimaryLink();
    // Record it as an edit the learner made, the way the link editor and the
    // controlled-topology demo's own buttons do. Without this the sandbox's
    // history omitted the change, and the assessment sub-goal that asks for
    // exactly this link to go down was never satisfied by the control labelled
    // to do it.
    editSession?.pushEdit({
      kind: 'link.state',
      target: { kind: 'edge', edgeId: PRIMARY_LINK_ID },
      before: primaryLinkDown ? 'down' : 'up',
      after: primaryLinkDown ? 'up' : 'down',
    });
    if (forkId) setSandbox(recordSandboxDiff(forkId, { edges: 1 }) ?? null);
  }, [onTogglePrimaryLink, forkId, editSession, primaryLinkDown]);

  const handleResetFork = useCallback(() => {
    if (forkId) {
      setSandbox(resetSandbox(forkId) ?? null);
      toast.success(t('Sandbox reset to origin', 'サンドボックスを元の状態に戻しました'));
    }
  }, [forkId, t]);

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

  const jumpToFirstDrop = useCallback(() => {
    const dropHop = currentTrace?.hops.find((hop) => hop.event === 'drop');
    if (dropHop) jumpTo(dropHop.step);
  }, [currentTrace, jumpTo]);

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
        label: t(
          `Hop ${String(index).padStart(2, '0')} ${hop.event} ${hop.nodeLabel}`,
          `ホップ ${String(index).padStart(2, '0')} ${hop.event} ${hop.nodeLabel}`,
        ),
        subtitle:
          hop.toNodeId != null
            ? `${hop.nodeId} -> ${hop.toNodeId}`
            : `${hop.srcIp} -> ${hop.dstIp}`,
        group: t('Current trace', '現在のトレース'),
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
    [currentTrace, jumpTo, t],
  );

  useEffect(
    () => shellChrome.registerPaletteItems(tracePaletteItems),
    [shellChrome, tracePaletteItems],
  );

  const downloadPcap = () => {
    const traceId = state.currentTraceId ?? undefined;
    toast.info(t('Exporting PCAP…', 'PCAP を書き出しています…'));
    try {
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
      const packetCount =
        state.traces.find((t) => t.packetId === traceId)?.hops.length ?? state.traces.length;
      toast.success(
        t(`PCAP saved · ${packetCount} packets`, `PCAP を保存しました · ${packetCount} パケット`),
      );
    } catch {
      toast.error(t('PCAP export failed', 'PCAP の書き出しに失敗しました'), { sticky: true });
    }
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
            title={t('Send probe C1 -> C2', 'C1 -> C2 へプローブを送る')}
            style={commandActionStyle('var(--netlab-accent-green)')}
          >
            {t('Send Probe', 'プローブを送る')}
          </button>
          <button
            type="button"
            data-testid="ospf-fail-link"
            onClick={handleToggleLink}
            title={
              primaryLinkDown
                ? t('Restore primary inter-router link', 'ルータ間の主経路のリンクを戻す')
                : t('Fail primary inter-router link', 'ルータ間の主経路のリンクを落とす')
            }
            style={commandActionStyle(
              primaryLinkDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-yellow)',
            )}
          >
            {primaryLinkDown ? t('Restore link', 'リンクを戻す') : t('Fail link', 'リンクを落とす')}
          </button>
          {/* Q7 — persistent audience pill; uncontrolled, self-syncs via localStorage + event. */}
          <AudiencePill variant="terminal" />
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
          onJumpToDrop={jumpToFirstDrop}
          onOpenPalette={shellChrome.openPalette}
          onOpenHelp={shellChrome.openHelp}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {sandbox && (
          <LineageBanner
            sandbox={sandbox}
            originTitle={t('OSPF Preferred Path', 'OSPF の優先経路')}
            onReset={handleResetFork}
            onCompare={handleCompareFork}
            onClose={handleCloseFork}
          />
        )}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <NetlabCanvas>
                <DropEventOverlay />
              </NetlabCanvas>
              {/* The route tables live in the side rail; over the canvas they hid R4. */}
              <SimulationOverlayDock showRouteTable={false} />
              <ZeroStateHint />
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  maxWidth: 360,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'color-mix(in srgb, var(--netlab-bg-primary) 90%, transparent)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: 'var(--netlab-text-primary)',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{ color: 'var(--netlab-text-primary)', fontWeight: 700, marginBottom: 4 }}
                >
                  {t('OSPF Route Choice', 'OSPF の経路選択')}
                </div>
                <div>
                  {t(
                    'R1 prefers the lower-cost path through R2 until the primary inter-router link is removed.',
                    'ルータ間の主経路のリンクがなくなるまで、R1 はコストの低い R2 経由の経路を選びます。',
                  )}
                </div>
                <div style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}>
                  {t(
                    'Toggle the primary link, then resend the probe to confirm the recomputed path now leaves through R3.',
                    '主経路のリンクを切り替えてからプローブを送り直し、計算し直した経路が R3 経由になったことを確かめてください。',
                  )}
                </div>
              </div>
              {/* A guided intro or an assessment is the more specific guidance
                  the learner asked for; two greetings at once talk over each
                  other, and the brief is modal. */}
              {!guided && (
                <PreFlightBrief
                  scenarioId="ospf-convergence"
                  {...(locale === 'ja' && BRIEF_JA ? { brief: BRIEF_JA } : {})}
                  audience={audience}
                  isLastStep={isLastStep}
                  onAction={(actionId) => {
                    if (actionId === 'gallery') void navigate('/');
                    else if (actionId === 'fork') handleFork();
                  }}
                  conclusionExtra={<NextScenarioRail next={nextScenarios} onOpen={openScenario} />}
                />
              )}
            </div>
            <PacketScrubTimeline ownKeyboard={false} />
          </div>

          <ResizableSidebar
            defaultWidth={460}
            maxWidth={760}
            style={{
              background: 'var(--netlab-bg-primary)',
              borderLeft: '1px solid var(--netlab-bg-surface)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: 12,
                display: 'grid',
                gap: 12,
                borderBottom: '1px solid var(--netlab-bg-surface)',
              }}
            >
              <RouteSummaryPanel runs={runs} />
              <RouterTablesPanel />
            </div>

            <div style={{ minHeight: 0 }}>
              <PacketTimeline />
            </div>

            {/* The command bar and the scrubber below the canvas step too; this
                fuller control comes after the results rather than before them. */}
            <div style={{ padding: 12, borderTop: '1px solid var(--netlab-bg-surface)' }}>
              <div
                style={{
                  background: 'var(--netlab-bg-primary)',
                  border: '1px solid var(--netlab-bg-surface)',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <StepControls />
              </div>
            </div>
          </ResizableSidebar>
        </div>
      </div>
    </NetlabAppShellV2>
  );
}

/**
 * scenarioId → demo route. There is no scenarioId→path registry (routes live
 * in demo/main.tsx), so this small map mirrors the registered-scenario routes
 * for the next-scenario rail (Q8). Keep in sync with demo/main.tsx.
 */
const SCENARIO_ROUTES: Record<string, string> = {
  'basic-arp': '/networking/arp',
  'fragmented-echo': '/networking/mtu-fragmentation',
  'tcp-handshake': '/simulation/tcp-handshake',
  'ospf-convergence': '/routing/ospf-convergence',
  'stp-loop': '/networking/stp',
  'nat-basics': '/simulation/nat',
};

/**
 * Resolve where the rail should send the learner. Prefer a standalone demo
 * route; for a same-topology-group sibling without one (e.g. rip-convergence),
 * open the side-by-side compare view; otherwise fall back to the gallery.
 */
function resolveScenarioHref(id: string, current: Scenario | undefined): string {
  if (SCENARIO_ROUTES[id]) return SCENARIO_ROUTES[id];
  const sibling = scenarioRegistry.get(id);
  if (current?.topologyGroup && sibling?.topologyGroup === current.topologyGroup) {
    return `/compare/${current.metadata.id}/${id}`;
  }
  return '/';
}

function commandActionStyle(accent: string): React.CSSProperties {
  return {
    // Anchors the hit-area overlay `shell-chrome.css` puts on every button in
    // the command bar. Unanchored, that overlay attaches to the toolbar row and
    // becomes an invisible full-width shield over its neighbours.
    position: 'relative',
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
  const [runs, setRuns] = useState<readonly ProbeRun[]>([]);
  const recordRun = useCallback(
    (run: ProbeRun) =>
      setRuns((current) =>
        current.some((existing) => existing.packetId === run.packetId)
          ? current
          : [...current, run].slice(-2),
      ),
    [],
  );
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
            runs={runs}
            onProbeFinished={recordRun}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
