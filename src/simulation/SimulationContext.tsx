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
}

function SandboxSurface({
  children,
  introOverlay,
}: {
  readonly children: ReactNode;
  readonly introOverlay?: ReactNode;
}) {
  const sandbox = useSandbox();

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
      {sandbox.mode === 'beta' ? <BeforeAfterView /> : children}
      {introOverlay}
      <SandboxActiveEditor />
      <DiffTimeline />
      <SandboxPanel />
    </div>
  );
}

export function SimulationProvider({
  children,
  autoRecompute = false,
  animationSpeed,
}: SimulationProviderProps) {
  const { topology, hookEngine, routeTable, tutorialId, sandboxEnabled, sandboxIntroId } =
    useNetlabContext();
  const failureCtx = useOptionalFailure();

  const engine = useMemo(() => new SimulationEngine(topology, hookEngine), [topology, hookEngine]);

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

  const content = sandboxEnabled ? (
    <SandboxErrorBoundary>
      <SandboxProvider>
        {sandboxIntroId ? (
          <SandboxIntroProvider introId={sandboxIntroId as SandboxIntroId}>
            <SandboxSurface introOverlay={<SandboxIntroOverlay />}>{children}</SandboxSurface>
          </SandboxIntroProvider>
        ) : (
          <SandboxSurface>{children}</SandboxSurface>
        )}
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
