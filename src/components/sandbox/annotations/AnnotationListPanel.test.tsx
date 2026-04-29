/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../../sandbox/SandboxContext';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';
import { DEFAULT_PARAMETERS } from '../../../sandbox/types';
import { AnnotationListPanel } from './AnnotationListPanel';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const annotations: readonly TraceAnnotation[] = [
  {
    id: 'scenario-note',
    traceEventId: 'trace-1:0',
    author: 'scenario',
    content: 'Expected **fragmentation**',
    createdAt: 0,
  },
  {
    id: 'user-note',
    traceEventId: 'trace-1:1',
    author: 'user',
    content: 'I saw ARP here',
    createdAt: 1,
  },
];

function sandboxValue(): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      snapshot: {
        annotations,
        parameters: DEFAULT_PARAMETERS,
      },
      whatIf: { getState: () => ({ traces: [], currentTraceId: null }) },
      parameters: DEFAULT_PARAMETERS,
    } as unknown as BranchedSimulationEngine,
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
    resetAll: vi.fn(),
    setSession: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
  };
}

function renderPanel() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <SandboxContext.Provider value={sandboxValue()}>
        <AnnotationListPanel />
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

describe('AnnotationListPanel', () => {
  it('renders all annotations with author labels', () => {
    renderPanel();

    expect(container?.textContent).toContain('scenario');
    expect(container?.textContent).toContain('user');
    expect(container?.textContent).toContain('Expected fragmentation');
    expect(container?.querySelectorAll('[data-testid="annotation-list-item"]')).toHaveLength(2);
  });

  it('filters by author', () => {
    renderPanel();

    act(() => {
      const select = container?.querySelector<HTMLSelectElement>(
        '[aria-label="Filter annotations"]',
      );
      if (select) {
        select.value = 'user';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(container?.textContent).toContain('I saw ARP here');
    expect(container?.textContent).not.toContain('Expected fragmentation');
  });

  it('searches annotation content case-insensitively', () => {
    renderPanel();

    act(() => {
      const input = container?.querySelector<HTMLInputElement>('[aria-label="Search annotations"]');
      if (input) {
        input.value = 'arp';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(container?.textContent).toContain('I saw ARP here');
    expect(container?.textContent).not.toContain('Expected fragmentation');
  });
});
