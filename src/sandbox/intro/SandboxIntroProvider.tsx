import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NetlabError } from '../../errors';
import { hookEngine } from '../../hooks/HookEngine';
import { TutorialRunner } from '../../tutorials/TutorialRunner';
import type { Tutorial, TutorialRunnerState, TutorialStep } from '../../tutorials/types';
import type { HookMap, HookPoint } from '../../types/hooks';
import { useSandbox } from '../useSandbox';
import { introRegistry, type SandboxIntroId } from './introRegistry';

export interface SandboxIntroContextValue {
  readonly intro: Tutorial;
  readonly status: TutorialRunnerState['status'];
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly currentStep: TutorialStep | null;
  readonly start: () => void;
  readonly skip: () => void;
  readonly restart: () => void;
}

export const SandboxIntroContext = createContext<SandboxIntroContextValue | null>(null);

export interface SandboxIntroProviderProps {
  readonly introId: SandboxIntroId;
  readonly children: ReactNode;
  readonly onExit?: () => void;
}

const INTRO_HOOK_POINTS: readonly HookPoint[] = [
  'sandbox:panel-tab-opened',
  'sandbox:mode-changed',
  'sandbox:edit-applied',
];

function subscribeIntroPoint<K extends HookPoint>(
  point: K,
  runner: TutorialRunner,
  getStepIndex: () => number,
) {
  return hookEngine.on(
    point,
    async (payload: Parameters<HookMap[K]>[0], next: Parameters<HookMap[K]>[1]) => {
      runner.onHookEvent({
        name: point,
        payload,
        stepIndex: getStepIndex(),
      });
      await next();
    },
  );
}

export function SandboxIntroProvider({ introId, children, onExit }: SandboxIntroProviderProps) {
  const sandbox = useSandbox();
  const intro = introRegistry.get(introId);
  const runnerRef = useRef<TutorialRunner | null>(null);

  if (!intro) {
    throw new NetlabError({
      code: 'sandbox-intro/unknown-id',
      message: `[netlab] unknown sandbox intro id: ${introId}`,
    });
  }

  if (!runnerRef.current) {
    runnerRef.current = new TutorialRunner(intro);
  }

  const runner = runnerRef.current;
  const [runnerState, setRunnerState] = useState<TutorialRunnerState>(runner.state);

  useEffect(() => {
    setRunnerState(runner.state);
    return runner.subscribe(setRunnerState);
  }, [runner]);

  useEffect(() => {
    runner.onSimulationState(sandbox.engine.whatIf.getState());

    const unsubscribeEngine = sandbox.engine.subscribe(() => {
      runner.onSimulationState(sandbox.engine.whatIf.getState());
    });

    const unsubscribers = INTRO_HOOK_POINTS.map((point) =>
      subscribeIntroPoint(point, runner, () => sandbox.engine.whatIf.getState().currentStep),
    );

    return () => {
      unsubscribeEngine();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [runner, sandbox.engine]);

  const start = useCallback(() => {
    sandbox.setUndoFloor?.(sandbox.session.head);
    runner.start();
    runner.onSimulationState(sandbox.engine.whatIf.getState());
  }, [runner, sandbox]);

  const skip = useCallback(() => {
    sandbox.setUndoFloor?.(0);
    runner.exit();
    onExit?.();
  }, [onExit, runner, sandbox]);

  const restart = useCallback(() => {
    sandbox.setUndoFloor?.(sandbox.session.head);
    runner.start();
    runner.onSimulationState(sandbox.engine.whatIf.getState());
  }, [runner, sandbox]);

  const value = useMemo<SandboxIntroContextValue>(
    () => ({
      intro,
      status: runnerState.status,
      currentStepIndex: runnerState.currentStepIndex,
      totalSteps: intro.steps.length,
      currentStep: intro.steps[runnerState.currentStepIndex] ?? null,
      start,
      skip,
      restart,
    }),
    [intro, restart, runnerState, skip, start],
  );

  return <SandboxIntroContext.Provider value={value}>{children}</SandboxIntroContext.Provider>;
}
