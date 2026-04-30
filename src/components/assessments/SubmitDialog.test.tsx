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
import { SubmitDialog } from './SubmitDialog';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeAssessment(
  status: AssessmentContextValue['status']['status'],
): AssessmentContextValue {
  return {
    scenarioId: 'scenario-1',
    rubric: {
      id: 'rubric-1',
      goal: 'goal',
      subgoals: [],
      constraints: [],
    },
    status: {
      status,
      rubricId: 'rubric-1',
      subgoalResults: [],
      hintsUsed: [],
      startedAt: 100,
      passedAt: status === 'passed' ? 200 : null,
    },
    useHint: vi.fn(),
    exit: vi.fn(),
    failConstraint: vi.fn(),
  };
}

function makeSandbox(): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty().push({ kind: 'noop' }),
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

function renderDialog(
  assessment = makeAssessment('passed'),
  download = vi.fn(),
  onClose = vi.fn(),
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <SandboxContext.Provider value={makeSandbox()}>
        <AssessmentContext.Provider value={assessment}>
          <SubmitDialog open scenarioId="scenario-1" onClose={onClose} download={download} />
        </AssessmentContext.Provider>
      </SandboxContext.Provider>,
    );
  });
  return { download, onClose };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  root?.unmount();
  root = null;
  container?.remove();
  container = null;
  window.history.replaceState({}, '', '/');
});

describe('SubmitDialog', () => {
  it('renders notes input and submit action', () => {
    renderDialog();

    expect(container?.querySelector('[role="dialog"]')?.textContent).toContain('Submit assessment');
    expect(container?.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      'Submission notes',
    );
  });

  it('downloads a submission when passed', () => {
    const { download, onClose } = renderDialog();

    act(() => {
      container
        ?.querySelector('textarea')
        ?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'Solved' }));
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Download assessment submission"]')
        ?.click();
    });

    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'assessment-submission', rubricId: 'rubric-1' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when status is not passed', () => {
    renderDialog(makeAssessment('active'));

    expect(
      container?.querySelector<HTMLButtonElement>('[aria-label="Download assessment submission"]')
        ?.disabled,
    ).toBe(true);
  });

  it('does not render when closed', () => {
    const { download } = renderDialog();
    act(() => {
      root?.render(
        <SandboxContext.Provider value={makeSandbox()}>
          <AssessmentContext.Provider value={makeAssessment('passed')}>
            <SubmitDialog
              open={false}
              scenarioId="scenario-1"
              onClose={vi.fn()}
              download={download}
            />
          </AssessmentContext.Provider>
        </SandboxContext.Provider>,
      );
    });

    expect(container?.querySelector('[role="dialog"]')).toBeNull();
  });
});
