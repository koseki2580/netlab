import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NetlabContext } from '../components/NetlabContext';
import { NetlabError } from '../errors';
import { hookEngine as sharedHookEngine } from '../hooks/HookEngine';
import type { HookEngine } from '../hooks/HookEngine';
import { scenarioRegistry } from '../scenarios/ScenarioRegistry';
import { useSandbox } from '../sandbox/useSandbox';
import type { HookMap, HookPoint } from '../types/hooks';
import { AssessmentContext, type AssessmentContextValue } from './AssessmentContext';
import { AssessmentRunner } from './AssessmentRunner';
import type { AssessmentStatus } from './types';

const ASSESSMENT_HOOK_POINTS: readonly HookPoint[] = [
  'sandbox:edit-applied',
  'sandbox:edit-rejected',
];

export { AssessmentContext } from './AssessmentContext';
export type { AssessmentContextValue } from './AssessmentContext';

export interface AssessmentProviderProps {
  readonly assessmentScenarioId: string;
  readonly children: ReactNode;
}

function subscribeAssessmentPoint<K extends HookPoint>(
  point: K,
  hookEngine: HookEngine,
  onEvent: (entry: { name: string; payload: unknown; stepIndex: number }) => void,
) {
  return hookEngine.on(
    point,
    async (payload: Parameters<HookMap[K]>[0], next: Parameters<HookMap[K]>[1]) => {
      onEvent({ name: point, payload, stepIndex: -1 });
      await next();
    },
  );
}

export function AssessmentProvider({ assessmentScenarioId, children }: AssessmentProviderProps) {
  const sandbox = useSandbox();
  const netlabContext = useContext(NetlabContext);
  const hookEngine = netlabContext?.hookEngine ?? sharedHookEngine;
  const scenario = scenarioRegistry.get(assessmentScenarioId);
  const runnerRef = useRef<AssessmentRunner | null>(null);
  const eventLogRef = useRef<{ name: string; payload: unknown; stepIndex: number }[]>([]);
  const sessionRef = useRef(sandbox.session);

  if (!scenario) {
    throw new NetlabError({
      code: 'assessment/unknown-scenario',
      message: `[netlab] unknown assessment scenario id: ${assessmentScenarioId}`,
    });
  }

  if (!scenario.assessmentRubric) {
    throw new NetlabError({
      code: 'assessment/missing-rubric',
      message: `[netlab] scenario ${assessmentScenarioId} does not define an assessment rubric`,
    });
  }
  const rubric = scenario.assessmentRubric;

  if (!runnerRef.current) {
    runnerRef.current = new AssessmentRunner(rubric);
  }

  const runner = runnerRef.current;
  const [status, setStatus] = useState<AssessmentStatus>(runner.status);

  useEffect(() => {
    sessionRef.current = sandbox.session;
    runner.onSimulationState(
      sandbox.engine.whatIf.getState(),
      eventLogRef.current,
      sandbox.session,
    );
  }, [runner, sandbox.engine, sandbox.session]);

  useEffect(() => {
    setStatus(runner.status);
    return runner.subscribe(setStatus);
  }, [runner]);

  useEffect(() => {
    const evaluate = () => {
      runner.onSimulationState(
        sandbox.engine.whatIf.getState(),
        eventLogRef.current,
        sessionRef.current,
      );
    };

    evaluate();
    const unsubscribeEngine = sandbox.engine.subscribe(evaluate);
    const unsubscribers = ASSESSMENT_HOOK_POINTS.map((point) =>
      subscribeAssessmentPoint(point, hookEngine, (entry) => {
        const currentStep = sandbox.engine.whatIf.getState().currentStep;
        eventLogRef.current.push({ ...entry, stepIndex: currentStep });
        if (eventLogRef.current.length > 256) {
          eventLogRef.current.splice(0, eventLogRef.current.length - 256);
        }
        if (
          entry.name === 'sandbox:edit-rejected' &&
          typeof entry.payload === 'object' &&
          entry.payload !== null &&
          (entry.payload as { reason?: unknown }).reason === 'assessment-constraint-violated'
        ) {
          runner.failConstraint();
          return;
        }
        evaluate();
      }),
    );

    return () => {
      unsubscribeEngine();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [hookEngine, runner, sandbox.engine]);

  const useHint = useCallback(
    (subgoalId: string) => {
      runner.useHint(subgoalId);
    },
    [runner],
  );

  const exit = useCallback(() => {
    runner.exit();
  }, [runner]);

  const failConstraint = useCallback(() => {
    runner.failConstraint();
  }, [runner]);

  const value = useMemo<AssessmentContextValue>(
    () => ({
      scenarioId: assessmentScenarioId,
      rubric,
      status,
      useHint,
      exit,
      failConstraint,
    }),
    [assessmentScenarioId, exit, failConstraint, rubric, status, useHint],
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}
