import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { SimulationEngine } from './SimulationEngine';
import { useNetlabContext } from '../components/NetlabContext';
import { useOptionalFailure } from './FailureContext';
import type { InFlightPacket } from '../types/packets';
import type { SimulationState } from '../types/simulation';
import type { DhcpLeaseState, DnsCache } from '../types/services';

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

export function SimulationProvider({
  children,
  autoRecompute = false,
  animationSpeed,
}: SimulationProviderProps) {
  const { topology, hookEngine } = useNetlabContext();
  const failureCtx = useOptionalFailure();

  const engine = useMemo(
    () => new SimulationEngine(topology, hookEngine),
    [topology, hookEngine],
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

    void engine.resend(nextFailureState)
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

  const getDnsCache = useCallback(
    (nodeId: string) => engine.getDnsCache(nodeId),
    [engine],
  );

  const exportPcap = useCallback(
    (traceId?: string) => engine.exportPcap(traceId),
    [engine],
  );

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

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('[netlab] useSimulation must be used within <SimulationProvider>');
  }
  return ctx;
}

export function useOptionalSimulation(): SimulationContextValue | null {
  return useContext(SimulationContext);
}
