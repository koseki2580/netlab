/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../../sandbox/SandboxContext';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';
import { DEFAULT_PARAMETERS } from '../../../sandbox/types';
import { AnnotationEditorPopover } from './AnnotationEditorPopover';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const scenarioAnnotation: TraceAnnotation = {
  id: 'scenario-note',
  traceEventId: 'trace-1:0',
  author: 'scenario',
  content: 'Locked note',
  createdAt: 0,
};

function sandboxValue(
  overrides: Partial<SandboxContextValue> = {},
  snapshotAnnotations: readonly TraceAnnotation[] = [scenarioAnnotation],
): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      snapshot: {
        annotations: snapshotAnnotations,
        capturedAt: 7,
        parameters: DEFAULT_PARAMETERS,
      },
      parameters: DEFAULT_PARAMETERS,
    } as unknown as BranchedSimulationEngine,
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
    ...overrides,
  };
}

function renderPopover(value: SandboxContextValue, annotationId?: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <SandboxContext.Provider value={value}>
        <AnnotationEditorPopover
          traceEventId="trace-1:0"
          {...(annotationId !== undefined ? { annotationId } : {})}
          onClose={vi.fn()}
        />
      </SandboxContext.Provider>,
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  container?.remove();
  container = null;
});

describe('AnnotationEditorPopover', () => {
  it('dispatches add edits on save', () => {
    const pushEdit = vi.fn();
    renderPopover(sandboxValue({ pushEdit }, []));

    act(() => {
      const textarea = container?.querySelector<HTMLTextAreaElement>('textarea');
      if (textarea) {
        textarea.value = 'test **bold**';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Save annotation"]')?.click();
    });

    expect(pushEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'trace.annotate.add',
        annotation: expect.objectContaining({
          traceEventId: 'trace-1:0',
          author: 'user',
          content: 'test **bold**',
          createdAt: 7,
        }),
      }),
    );
  });

  it('shows locked copy for scenario annotations', () => {
    renderPopover(sandboxValue(), 'scenario-note');

    expect(container?.textContent).toContain('Scenario annotations are locked');
    expect(container?.querySelector('textarea')).toBeNull();
  });
});
