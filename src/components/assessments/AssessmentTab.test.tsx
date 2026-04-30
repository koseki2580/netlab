/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssessmentContext,
  type AssessmentContextValue,
} from '../../assessments/AssessmentProvider';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import type { AssessmentRubric, AssessmentStatus } from '../../assessments/types';
import { AssessmentTab } from './AssessmentTab';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeRubric(overrides: Partial<AssessmentRubric> = {}): AssessmentRubric {
  return {
    id: 'rubric-1',
    goal: 'Make the backup OSPF path deliver traffic.',
    subgoals: [
      {
        id: 'link',
        title: 'Disable the primary link',
        required: true,
        predicate: () => false,
        hints: [
          { tier: 1, content: 'Find the primary path first.' },
          { tier: 2, content: 'Use the link editor.' },
        ],
      },
      {
        id: 'bonus',
        title: 'Avoid static routes',
        required: false,
        predicate: () => false,
        hints: [],
      },
    ],
    constraints: [],
    ...overrides,
  };
}

function makeStatus(overrides: Partial<AssessmentStatus> = {}): AssessmentStatus {
  return {
    status: 'active',
    rubricId: 'rubric-1',
    subgoalResults: [
      { subgoalId: 'link', passed: false },
      { subgoalId: 'bonus', passed: true },
    ],
    hintsUsed: [],
    startedAt: 100,
    passedAt: null,
    ...overrides,
  };
}

function makeSandbox(): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: { parameters: DEFAULT_PARAMETERS } as SandboxContextValue['engine'],
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
    revertToSnapshot: vi.fn(),
    resetAll: vi.fn(),
    setSession: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
  };
}

function renderAssessment(value: Partial<AssessmentContextValue> = {}) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }

  const context: AssessmentContextValue = {
    scenarioId: 'scenario-1',
    rubric: makeRubric(),
    status: makeStatus(),
    useHint: vi.fn(),
    exit: vi.fn(),
    failConstraint: vi.fn(),
    ...value,
  };

  act(() => {
    root?.render(
      <SandboxContext.Provider value={makeSandbox()}>
        <AssessmentContext.Provider value={context}>
          <AssessmentTab />
        </AssessmentContext.Provider>
      </SandboxContext.Provider>,
    );
  });

  return context;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
});

describe('AssessmentTab', () => {
  it('renders the rubric goal and status', () => {
    renderAssessment();

    expect(container?.textContent).toContain('Make the backup OSPF path deliver traffic.');
    expect(container?.textContent).toContain('Active');
  });

  it('renders progress for passed subgoals', () => {
    renderAssessment();

    const progress = container?.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('1');
    expect(progress?.getAttribute('aria-valuemax')).toBe('2');
    expect(container?.textContent).toContain('1 / 2 sub-goals');
  });

  it('labels required and optional subgoals separately', () => {
    renderAssessment();

    expect(container?.textContent).toContain('Required');
    expect(container?.textContent).toContain('Bonus');
  });

  it('renders pass/fail text for each subgoal', () => {
    renderAssessment();

    expect(container?.textContent).toContain('Not yet');
    expect(container?.textContent).toContain('Passed');
  });

  it('calls useHint when the hint button is clicked', () => {
    const context = renderAssessment();

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('button[data-subgoal-id="link"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(context.useHint).toHaveBeenCalledWith('link');
  });

  it('reveals used hint content inline', () => {
    renderAssessment({
      status: makeStatus({ hintsUsed: [{ subgoalId: 'link', tier: 1 }] }),
    });

    expect(container?.textContent).toContain('Find the primary path first.');
  });

  it('disables the hint button when all hints are used', () => {
    renderAssessment({
      status: makeStatus({
        hintsUsed: [
          { subgoalId: 'link', tier: 1 },
          { subgoalId: 'link', tier: 2 },
        ],
      }),
    });

    expect(
      container?.querySelector<HTMLButtonElement>('button[data-subgoal-id="link"]')?.disabled,
    ).toBe(true);
  });

  it('omits hint buttons for subgoals without hints', () => {
    renderAssessment();

    expect(container?.querySelector('button[data-subgoal-id="bonus"]')).toBeNull();
  });

  it('shows passed status copy when the rubric passes', () => {
    renderAssessment({ status: makeStatus({ status: 'passed', passedAt: 200 }) });

    expect(container?.textContent).toContain('Passed');
    expect(container?.textContent).toContain('Ready to submit');
  });

  it('shows failed status copy when a constraint fails', () => {
    renderAssessment({ status: makeStatus({ status: 'failed-constraint' }) });

    expect(container?.textContent).toContain('Constraint failed');
  });
});
