import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NetlabError } from '../errors';
import type { HookEngine } from '../hooks/HookEngine';
import type { HookMap, HookPoint } from '../types/hooks';
import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationState } from '../types/simulation';
import type { RouteEntry } from '../types/routing';
import { TutorialRunner } from './TutorialRunner';
import { tutorialRegistry } from './index';
import type { Tutorial, TutorialRunnerState } from './types';

const HOOK_POINTS = [
  'packet:create',
  'packet:forward',
  'packet:deliver',
  'packet:drop',
  'switch:learn',
  'router:lookup',
  'fetch:intercept',
  'fetch:respond',
] as const;

interface TutorialContextValue {
  readonly tutorial: Tutorial;
  readonly state: TutorialRunnerState;
  readonly start: () => void;
  readonly exit: () => void;
  readonly restart: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);
export const TutorialPresenceContext = createContext(false);

export interface TutorialProviderProps {
  readonly tutorialId?: string | null;
  readonly engine: SimulationEngine;
  readonly simulationState: SimulationState;
  readonly routeTable: Map<string, RouteEntry[]>;
  readonly hookEngine: HookEngine;
  readonly children: ReactNode;
}

function serializeRouteTable(routeTable: Map<string, RouteEntry[]>): Record<string, RouteEntry[]> {
  return Object.fromEntries(routeTable.entries());
}

function enrichSimulationState(
  state: SimulationState,
  engine: SimulationEngine,
  routeTable: Map<string, RouteEntry[]>,
): SimulationState {
  return {
    ...state,
    tutorialRouteTable: serializeRouteTable(routeTable),
    tutorialTcpConnections: engine.getTcpConnections(),
  } as SimulationState;
}

export function TutorialProvider({
  tutorialId,
  engine,
  simulationState,
  routeTable,
  hookEngine,
  children,
}: TutorialProviderProps) {
  const tutorial = useMemo(() => {
    if (!tutorialId) {
      return null;
    }

    const resolved = tutorialRegistry.get(tutorialId);
    if (!resolved) {
      throw new NetlabError({
        code: 'invariant/not-found',
        message: `[netlab] unknown tutorial id: ${tutorialId}`,
      });
    }

    return resolved;
  }, [tutorialId]);

  const runner = useMemo(() => (tutorial ? new TutorialRunner(tutorial) : null), [tutorial]);
  const latestStateRef = useRef(simulationState);
  const [runnerState, setRunnerState] = useState<TutorialRunnerState | null>(
    () => runner?.state ?? null,
  );

  latestStateRef.current = simulationState;

  useEffect(() => {
    if (!runner) {
      setRunnerState(null);
      return;
    }

    setRunnerState(runner.state);

    return runner.subscribe(setRunnerState);
  }, [runner]);

  useEffect(() => {
    if (!runner || !tutorial) {
      return;
    }

    runner.onSimulationState(enrichSimulationState(simulationState, engine, routeTable));
  }, [engine, routeTable, runner, simulationState, tutorial]);

  useEffect(() => {
    if (!runner || !tutorial) {
      return;
    }

    const subscribe = <K extends HookPoint>(hookPoint: K) =>
      hookEngine.on(
        hookPoint,
        async (payload: Parameters<HookMap[K]>[0], next: Parameters<HookMap[K]>[1]) => {
          runner.onHookEvent({
            name: hookPoint,
            payload,
            stepIndex: latestStateRef.current.currentStep,
          });
          await next();
        },
      );

    const unsubscribers = HOOK_POINTS.map((hookPoint) => subscribe(hookPoint));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [hookEngine, runner, tutorial]);

  const effectiveRunnerState =
    tutorial && runnerState?.tutorialId !== tutorial.id ? (runner?.state ?? null) : runnerState;

  const value = useMemo<TutorialContextValue | null>(() => {
    if (!tutorial || !effectiveRunnerState || !runner) {
      return null;
    }

    return {
      tutorial,
      state: effectiveRunnerState,
      start: () => runner.start(),
      exit: () => runner.exit(),
      restart: () => runner.start(),
    };
  }, [effectiveRunnerState, runner, tutorial]);

  if (!tutorial || !value) {
    return <>{children}</>;
  }

  return (
    <TutorialPresenceContext.Provider value={true}>
      <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
    </TutorialPresenceContext.Provider>
  );
}

export function useTutorialRunner(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useTutorialRunner must be used within <TutorialProvider>',
    });
  }

  return context;
}
