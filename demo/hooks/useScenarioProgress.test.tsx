/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useProgress } from '../../src/progress';
import { useScenarioProgress } from './useScenarioProgress';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

interface ProbeApi {
  states: string[];
  doneCount: number;
  totalCount: number;
  totalMinutes: number;
  markDone?: (id: string) => void;
}

const ITEMS = [
  { id: 'a', difficulty: 'beginner' as const },
  { id: 'b', difficulty: 'intermediate' as const },
  { id: 'c', difficulty: 'advanced' as const },
];

function mount(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  }
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('useScenarioProgress', () => {
  it('marks the first incomplete item as current and rest as next', () => {
    const api: ProbeApi = { states: [], doneCount: 0, totalCount: 0, totalMinutes: 0 };
    function Probe() {
      const out = useScenarioProgress(ITEMS);
      api.states = out.items.map((i) => i.state);
      api.doneCount = out.doneCount;
      api.totalCount = out.totalCount;
      api.totalMinutes = out.totalMinutes;
      return null;
    }
    mount(
      <ProgressProvider learnerId="t1">
        <Probe />
      </ProgressProvider>,
    );
    expect(api.states).toEqual(['current', 'next', 'next']);
    expect(api.doneCount).toBe(0);
    expect(api.totalCount).toBe(3);
    expect(api.totalMinutes).toBe(31); // 6 + 10 + 15
  });

  it('promotes done items based on completions recorded via the progress provider', () => {
    const api: ProbeApi = { states: [], doneCount: 0, totalCount: 0, totalMinutes: 0 };
    function Probe() {
      const progress = useProgress();
      api.markDone = (id: string) => progress.recordCompletion({ kind: 'tutorial', id });
      const out = useScenarioProgress(ITEMS);
      api.states = out.items.map((i) => i.state);
      api.doneCount = out.doneCount;
      return null;
    }
    mount(
      <ProgressProvider learnerId="t2">
        <Probe />
      </ProgressProvider>,
    );
    expect(api.states).toEqual(['current', 'next', 'next']);
    act(() => {
      api.markDone?.('a');
    });
    expect(api.states).toEqual(['done', 'current', 'next']);
    expect(api.doneCount).toBe(1);
  });

  it('explicit estMinutes overrides difficulty-derived defaults', () => {
    const api: ProbeApi = { states: [], doneCount: 0, totalCount: 0, totalMinutes: 0 };
    function Probe() {
      const out = useScenarioProgress([{ id: 'x', difficulty: 'beginner', estMinutes: 99 }]);
      api.totalMinutes = out.totalMinutes;
      return null;
    }
    mount(
      <ProgressProvider learnerId="t3">
        <Probe />
      </ProgressProvider>,
    );
    expect(api.totalMinutes).toBe(99);
  });

  it('falls back to 10 minutes when neither estMinutes nor difficulty is provided', () => {
    const api: ProbeApi = { states: [], doneCount: 0, totalCount: 0, totalMinutes: 0 };
    function Probe() {
      const out = useScenarioProgress([{ id: 'x' }]);
      api.totalMinutes = out.totalMinutes;
      return null;
    }
    mount(
      <ProgressProvider learnerId="t4">
        <Probe />
      </ProgressProvider>,
    );
    expect(api.totalMinutes).toBe(10);
  });
});
