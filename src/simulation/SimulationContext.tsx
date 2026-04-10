import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
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
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const { topology, hookEngine } = useNetlabContext();
  const failureCtx = useOptionalFailure();

  const engine = useMemo(
    () => new SimulationEngine(topology, hookEngine),
    [topology, hookEngine],
  );

  const [state, setState] = useState<SimulationState>(() => engine.getState());

  useEffect(() => {
    // Re-seed state when engine changes (topology changed)
    setState(engine.getState());
    return engine.subscribe(setState);
  }, [engine]);

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
    }),
    [engine, state, sendPacket, simulateDhcp, simulateDns, getDhcpLeaseState, getDnsCache, exportPcap],
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
