/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useOptionalProgress } from '../../progress/ProgressProvider';
import { createMemoryProgressStorage } from '../../progress/storage';
import { ProgressBadge } from './ProgressBadge';
import { ProgressPanel } from './ProgressPanel';

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) throw new Error('missing container');
  act(() => {
    root?.render(ui);
  });
}

function Recorder() {
  const progress = useOptionalProgress();
  return (
    <button
      type="button"
      onClick={() =>
        progress.recordCompletion({
          kind: 'assessment',
          id: 'ospf-convergence',
          label: 'OSPF convergence',
          score: { passed: 3, total: 3 },
        })
      }
    >
      record
    </button>
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
});

describe('ProgressPanel and ProgressBadge', () => {
  it('renders an inert message when progress persistence is disabled', () => {
    render(
      <ProgressProvider storage={createMemoryProgressStorage()}>
        <ProgressPanel />
      </ProgressProvider>,
    );

    expect(container?.textContent).toContain('Progress persistence is disabled');
  });

  it('shows completions, export/import controls, and completed badges', () => {
    render(
      <ProgressProvider learnerId="learner-1" storage={createMemoryProgressStorage()}>
        <Recorder />
        <ProgressPanel />
        <ProgressBadge targetId="ospf-convergence" />
      </ProgressProvider>,
    );

    act(() => {
      container?.querySelector('button')?.click();
    });

    expect(container?.textContent).toContain('OSPF convergence');
    expect(container?.textContent).toContain('3/3');
    expect(container?.textContent).toContain('Completed');

    act(() => {
      Array.from(container?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Export JSON')
        ?.click();
    });

    const exported = container?.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Exported progress JSON"]',
    );
    expect(exported?.value).toContain('ospf-convergence');
  });
});
