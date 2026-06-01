/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useProgress } from '../../src/progress';
import { useLearningMap, type LearningMap, type LearningTrackInput } from './useLearningMap';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const TRACKS: LearningTrackInput[] = [
  {
    id: 'l2',
    name: 'L2',
    steps: [
      { id: 'arp', label: 'ARP', path: '/l2/arp', difficulty: 'beginner' },
      { id: 'switching', label: 'Switching', path: '/l2/switching', difficulty: 'beginner' },
    ],
  },
  {
    id: 'l3',
    name: 'L3',
    steps: [
      { id: 'static', label: 'Static', path: '/l3/static', difficulty: 'beginner' },
      { id: 'ospf', label: 'OSPF', path: '/l3/ospf', difficulty: 'intermediate' },
      { id: 'bgp', label: 'BGP', path: '/l3/bgp', difficulty: 'advanced' },
    ],
  },
];

interface Probe {
  map: LearningMap | null;
  markDone?: (id: string) => void;
}

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
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

function statesOf(map: LearningMap, trackId: string): string[] {
  return map.tracks.find((t) => t.id === trackId)?.steps.map((s) => s.state) ?? [];
}

describe('useLearningMap', () => {
  it('derives done/current/locked per track for a fresh learner', () => {
    const probe: Probe = { map: null };
    function Inner() {
      probe.map = useLearningMap(TRACKS);
      return null;
    }
    mount(
      <ProgressProvider learnerId="m1">
        <Inner />
      </ProgressProvider>,
    );
    const map = probe.map as unknown as LearningMap;
    // First step of each track is current; the tail is locked (never `next`).
    expect(statesOf(map, 'l2')).toEqual(['current', 'locked']);
    expect(statesOf(map, 'l3')).toEqual(['current', 'locked', 'locked']);
    expect(map.doneCount).toBe(0);
    expect(map.totalCount).toBe(5);
    expect(map.conceptsLeft).toBe(2);
    // remaining = 6 + 6 + 6 + 10 + 15 = 43
    expect(map.remainingMinutes).toBe(43);
    // resume = the first current step in track order
    expect(map.resume?.id).toBe('arp');
  });

  it('flips a step to done and unlocks the next when a completion is recorded', () => {
    const probe: Probe = { map: null };
    function Inner() {
      const progress = useProgress();
      probe.markDone = (id) => progress.recordCompletion({ kind: 'tutorial', id });
      probe.map = useLearningMap(TRACKS);
      return null;
    }
    mount(
      <ProgressProvider learnerId="m2">
        <Inner />
      </ProgressProvider>,
    );
    act(() => probe.markDone?.('arp'));
    const map = probe.map as unknown as LearningMap;
    expect(statesOf(map, 'l2')).toEqual(['done', 'current']);
    expect(map.doneCount).toBe(1);
    // l2 still has an incomplete step, so concepts left is unchanged.
    expect(map.conceptsLeft).toBe(2);
  });

  it('drops a fully-completed track from conceptsLeft', () => {
    const probe: Probe = { map: null };
    function Inner() {
      const progress = useProgress();
      probe.markDone = (id) => progress.recordCompletion({ kind: 'tutorial', id });
      probe.map = useLearningMap(TRACKS);
      return null;
    }
    mount(
      <ProgressProvider learnerId="m3">
        <Inner />
      </ProgressProvider>,
    );
    act(() => {
      probe.markDone?.('arp');
      probe.markDone?.('switching');
    });
    const map = probe.map as unknown as LearningMap;
    expect(statesOf(map, 'l2')).toEqual(['done', 'done']);
    expect(map.conceptsLeft).toBe(1);
    // resume now points at the first current step in the remaining track.
    expect(map.resume?.id).toBe('static');
  });
});
