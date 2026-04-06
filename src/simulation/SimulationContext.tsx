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

export interface SimulationContextValue {
  engine: SimulationEngine;
  state: SimulationState;
  sendPacket: (packet: InFlightPacket) => Promise<void>;
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

  const value = useMemo(
    () => ({ engine, state, sendPacket }),
    [engine, state, sendPacket],
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
