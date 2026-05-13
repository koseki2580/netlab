/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useOptionalProgress } from './ProgressProvider';
import type { ProgressContextValue } from './ProgressProvider';
import { createMemoryProgressStorage, progressStorageKey } from './storage';
import type { ProgressCompletionInput } from './types';

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }
  act(() => {
    root?.render(ui);
  });
}

function Capture({
  onValue,
}: {
  onValue: (value: ReturnType<typeof useOptionalProgress>) => void;
}) {
  const progress = useOptionalProgress();
  onValue(progress);
  return (
    <div data-enabled={String(progress.enabled)}>{progress.progress?.learnerId ?? 'none'}</div>
  );
}

function requireProgress(value: ProgressContextValue | null): ProgressContextValue {
  if (!value) {
    throw new Error('progress context was not captured');
  }
  return value;
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

describe('ProgressProvider', () => {
  it('is inert without learnerId and does not write storage', () => {
    const storage = createMemoryProgressStorage();
    let current = null as ProgressContextValue | null;
    render(
      <ProgressProvider storage={storage}>
        <Capture onValue={(value) => (current = value)} />
      </ProgressProvider>,
    );
    const captured = requireProgress(current);

    act(() => {
      captured.recordCompletion({ kind: 'tutorial', id: 'sandbox-intro-tcp' });
    });

    expect(captured.enabled).toBe(false);
    expect(storage.keys()).toEqual([]);
  });

  it('records, dedupes, exports, imports, and clears learner completions', () => {
    const storage = createMemoryProgressStorage();
    let current = null as ProgressContextValue | null;
    const completion: ProgressCompletionInput = {
      kind: 'assessment',
      id: 'ospf-convergence',
      score: { passed: 3, total: 3 },
    };

    render(
      <ProgressProvider learnerId="learner-1" storage={storage}>
        <Capture onValue={(value) => (current = value)} />
      </ProgressProvider>,
    );
    const captured = requireProgress(current);

    act(() => {
      captured.recordCompletion(completion);
      captured.recordCompletion(completion);
    });

    expect(requireProgress(current).progress?.completions).toHaveLength(1);
    const stored = storage.get(progressStorageKey('learner-1'));
    expect(stored.ok && stored.value).toContain('ospf-convergence');

    const exported = requireProgress(current).exportJson();
    act(() => {
      requireProgress(current).clear();
    });
    expect(requireProgress(current).progress?.completions).toHaveLength(0);
    expect(storage.get(progressStorageKey('learner-1'))).toEqual({ ok: true, value: null });

    act(() => {
      requireProgress(current).importJson(exported);
    });
    expect(requireProgress(current).progress?.completions).toHaveLength(1);
  });

  it('reloads the active learner when a storage event arrives', () => {
    const storage = createMemoryProgressStorage();
    let current = null as ProgressContextValue | null;
    render(
      <ProgressProvider learnerId="learner-1" storage={storage}>
        <Capture onValue={(value) => (current = value)} />
      </ProgressProvider>,
    );

    storage.set(
      progressStorageKey('learner-1'),
      JSON.stringify({
        schemaVersion: 1,
        learnerId: 'learner-1',
        completions: [
          {
            kind: 'tutorial',
            id: 'sandbox-intro-tcp',
            completedAt: '2026-05-11T00:00:00.000Z',
          },
        ],
        updatedAt: '2026-05-11T00:00:00.000Z',
      }),
    );

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: progressStorageKey('learner-1') }));
    });

    expect(requireProgress(current).isCompleted('sandbox-intro-tcp')).toBe(true);
  });

  it('rejects invalid learner ids and wrong-learner imports', () => {
    expect(() =>
      ProgressProvider({
        learnerId: 'bad id',
        storage: createMemoryProgressStorage(),
        children: <div />,
      }),
    ).toThrow(/invalid learner id/);

    let current = null as ProgressContextValue | null;
    render(
      <ProgressProvider learnerId="learner-1" storage={createMemoryProgressStorage()}>
        <Capture onValue={(value) => (current = value)} />
      </ProgressProvider>,
    );

    act(() => {
      expect(
        current?.importJson(
          JSON.stringify({
            schemaVersion: 1,
            learnerId: 'learner-2',
            completions: [],
            updatedAt: '2026-05-11T00:00:00.000Z',
          }),
        ),
      ).toEqual({ ok: false, reason: 'wrong-learner-id' });
    });
  });
});
