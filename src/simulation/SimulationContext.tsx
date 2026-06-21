import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNetlabContext } from '../components/NetlabContext';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import {
  BeforeAfterView,
  DiffTimeline,
  SandboxActiveEditor,
  SandboxErrorBoundary,
  SandboxIntroOverlay,
  SandboxPanel,
} from '../components/sandbox';
import { NetlabError } from '../errors';
import type { InFlightPacket } from '../types/packets';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import type { SimulationState } from '../types/simulation';
import { SandboxIntroProvider } from '../sandbox/intro/SandboxIntroProvider';
import type { SandboxIntroId } from '../sandbox/intro/introRegistry';
import { TutorialProvider } from '../tutorials/TutorialContext';
import { SandboxProvider, useSandbox } from '../sandbox/SandboxContext';
import { AssessmentProvider } from '../assessments/AssessmentProvider';
import { EmbedBridge } from '../embed/EmbedBridge';
import { scenarioRegistry } from '../scenarios/ScenarioRegistry';
import { useOptionalFailure } from './FailureContext';
import { SimulationEngine } from './SimulationEngine';

export interface SimulationContextValue {
  engine: SimulationEngine;
  state: SimulationState;
  sendPacket: (packet: InFlightPacket) => Promise<void>;
  simulateDhcp: (clientNodeId: string) => Promise<boolean>;
  simulateDns: (clientNodeId: string, hostname: string) => Promise<string | null>;
  getDhcpLeaseState: (nodeId: string) => DhcpLeaseState | null;
  getDnsCache: (nodeId: string) => DnsCache | null;
  exportPcap: (traceId?: string) => Uint8Array;
  animationSpeed: number;
  setAnimationSpeed: (ms: number) => void;
  isRecomputing: boolean;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export interface SimulationProviderProps {
  children: ReactNode;
  autoRecompute?: boolean;
  animationSpeed?: number;
  /**
   * Force the main-thread engine. Browsers default to the worker engine, which
   * has no `pipeline` — required by the Data Transfer surface. Surfaces that use
   * the pipeline must opt in so they don't crash on a worker engine.
   */
  useMainThread?: boolean;
}

const NARROW_VIEWPORT_QUERY = '(max-width: 900px)';

function useSandboxLayoutMode(): 'wide' | 'drawer' {
  const [mode, setMode] = useState<'wide' | 'drawer'>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return 'wide';
    }
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches ? 'drawer' : 'wide';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setMode(event.matches ? 'drawer' : 'wide');
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return mode;
}

function SandboxSurface({
  children,
  introOverlay,
}: {
  readonly children: ReactNode;
  readonly introOverlay?: ReactNode;
}) {
  const sandbox = useSandbox();
  const layoutMode = useSandboxLayoutMode();
  const isDrawer = layoutMode === 'drawer';

  return (
    <div
      data-testid="sandbox-surface"
      data-layout-mode={layoutMode}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: isDrawer ? 'column' : 'row',
      }}
    >
      <div
        data-testid="sandbox-canvas-slot"
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {sandbox.mode === 'beta' ? <BeforeAfterView /> : children}
        {introOverlay}
        <SandboxActiveEditor />
        <DiffTimeline />
      </div>
      <SandboxPanel layoutMode={layoutMode} />
      <EmbedBridge />
    </div>
  );
}

export function SimulationProvider({
  children,
  autoRecompute = false,
  animationSpeed,
  useMainThread = false,
}: SimulationProviderProps) {
  const {
    topology,
    hookEngine,
    routeTable,
    tutorialId,
    sandboxEnabled,
    sandboxIntroId,
    assessmentScenarioId,
  } = useNetlabContext();
  const failureCtx = useOptionalFailure();

  const engine = useMemo(
    () => new SimulationEngine(topology, hookEngine, useMainThread ? { useMainThread: true } : {}),
    [topology, hookEngine, useMainThread],
  );

  const [state, setState] = useState<SimulationState>(() => engine.getState());
  const [currentSpeed, setCurrentSpeed] = useState<number>(
    () => animationSpeed ?? engine.getPlayInterval(),
  );
  const [isRecomputing, setIsRecomputing] = useState(false);
  const prevFailureStateRef = useRef(failureCtx?.failureState);
  const recomputeSequenceRef = useRef(0);

  useEffect(() => {
    // Re-seed state when engine changes (topology changed)
    setState(engine.getState());
    setCurrentSpeed(animationSpeed ?? engine.getPlayInterval());
    setIsRecomputing(false);
    return engine.subscribe(setState);
  }, [engine]);

  // E2E-mode: expose simulation state on window.__NETLAB_TRACE__ for Playwright golden tests.
  // Gated by VITE_E2E so production/demo builds don't expose test hooks.
  useEffect(() => {
    if ((import.meta as any).env.VITE_E2E !== 'true') return;
    (window as any).__NETLAB_TRACE__ = { traces: state.traces, lastStatus: state.status };
  }, [state.traces, state.status]);

  useEffect(() => {
    if (animationSpeed === undefined) return;
    engine.setPlayInterval(animationSpeed);
    setCurrentSpeed(engine.getPlayInterval());
  }, [animationSpeed, engine]);

  useEffect(() => {
    const nextFailureState = failureCtx?.failureState;
    const prevFailureState = prevFailureStateRef.current;
    prevFailureStateRef.current = nextFailureState;

    if (!autoRecompute || !failureCtx || !nextFailureState) return;
    if (prevFailureState === undefined || prevFailureState === nextFailureState) return;
    if (!engine.getLastPacket()) return;

    const sequence = recomputeSequenceRef.current + 1;
    recomputeSequenceRef.current = sequence;
    const shouldResume = engine.getState().status === 'running';

    setIsRecomputing(true);
    engine.reset();

    void engine
      .resend(nextFailureState)
      .then(() => {
        if (recomputeSequenceRef.current !== sequence) return;
        if (shouldResume) {
          engine.play();
        }
      })
      .finally(() => {
        if (recomputeSequenceRef.current === sequence) {
          setIsRecomputing(false);
        }
      });
  }, [autoRecompute, engine, failureCtx, failureCtx?.failureState]);

  const sendPacket = useCallback(
    (packet: InFlightPacket) => engine.send(packet, failureCtx?.failureState),
    [engine, failureCtx?.failureState],
  );

  const simulateDhcp = useCallback(
    (clientNodeId: string) => engine.simulateDhcp(clientNodeId, failureCtx?.failureState),
    [engine, failureCtx?.failureState],
  );

  const simulateDns = useCallback(
    (clientNodeId: string, hostname: string) =>
      engine.simulateDns(clientNodeId, hostname, failureCtx?.failureState),
    [engine, failureCtx?.failureState],
  );

  const getDhcpLeaseState = useCallback(
    (nodeId: string) => engine.getDhcpLeaseState(nodeId),
    [engine],
  );

  const getDnsCache = useCallback((nodeId: string) => engine.getDnsCache(nodeId), [engine]);

  const exportPcap = useCallback((traceId?: string) => engine.exportPcap(traceId), [engine]);

  const setAnimationSpeed = useCallback(
    (ms: number) => {
      engine.setPlayInterval(ms);
      setCurrentSpeed(engine.getPlayInterval());
    },
    [engine],
  );

  const value = useMemo(
    () => ({
      engine,
      state,
      sendPacket,
      simulateDhcp,
      simulateDns,
      getDhcpLeaseState,
      getDnsCache,
      exportPcap,
      animationSpeed: currentSpeed,
      setAnimationSpeed,
      isRecomputing,
    }),
    [
      engine,
      state,
      sendPacket,
      simulateDhcp,
      simulateDns,
      getDhcpLeaseState,
      getDnsCache,
      exportPcap,
      currentSpeed,
      setAnimationSpeed,
      isRecomputing,
    ],
  );

  const effectiveSandboxEnabled = sandboxEnabled || assessmentScenarioId !== undefined;
  const sandboxSurface = sandboxIntroId ? (
    <SandboxIntroProvider introId={sandboxIntroId as SandboxIntroId}>
      <SandboxSurface introOverlay={<SandboxIntroOverlay />}>{children}</SandboxSurface>
    </SandboxIntroProvider>
  ) : (
    <SandboxSurface>{children}</SandboxSurface>
  );

  const assessmentSurface = assessmentScenarioId ? (
    <AssessmentProvider assessmentScenarioId={assessmentScenarioId}>
      {sandboxSurface}
    </AssessmentProvider>
  ) : (
    sandboxSurface
  );
  const assessmentRubric = assessmentScenarioId
    ? scenarioRegistry.get(assessmentScenarioId)?.assessmentRubric
    : undefined;

  const content = effectiveSandboxEnabled ? (
    <SandboxErrorBoundary>
      <SandboxProvider {...(assessmentRubric ? { assessmentRubric } : {})}>
        {assessmentSurface}
      </SandboxProvider>
    </SandboxErrorBoundary>
  ) : (
    children
  );

  return (
    <SimulationContext.Provider value={value}>
      {tutorialId ? (
        <TutorialProvider
          tutorialId={tutorialId}
          engine={engine}
          simulationState={state}
          routeTable={routeTable}
          hookEngine={hookEngine}
        >
          <TutorialOverlay />
          {content}
        </TutorialProvider>
      ) : (
        content
      )}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useSimulation must be used within <SimulationProvider>',
    });
  }
  return ctx;
}

export function useOptionalSimulation(): SimulationContextValue | null {
  return useContext(SimulationContext);
}
