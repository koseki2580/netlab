/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningMap } from './LearningMap';
import type { LearningMap as LearningMapData } from '../hooks/useLearningMap';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
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

const MAP: LearningMapData = {
  doneCount: 1,
  totalCount: 3,
  remainingMinutes: 75, // 1h 15m
  conceptsLeft: 1,
  resume: { id: 'ospf', path: '/l3/ospf', label: 'OSPF' },
  tracks: [
    {
      id: 'l3',
      name: 'L3',
      steps: [
        { id: 'static', label: 'Static', path: '/l3/static', minutes: 6, state: 'done' },
        { id: 'ospf', label: 'OSPF', path: '/l3/ospf', minutes: 10, state: 'current' },
        { id: 'bgp', label: 'BGP', path: '/l3/bgp', minutes: 15, state: 'locked' },
      ],
    },
  ],
};

function render(node: React.ReactElement) {
  act(() => {
    root?.render(<MemoryRouter>{node}</MemoryRouter>);
  });
}

describe('LearningMap', () => {
  it('renders progress counts and remaining time', () => {
    render(<LearningMap map={MAP} />);
    const text = container?.textContent ?? '';
    expect(text).toContain('1 / 3 scenarios');
    expect(text).toContain('~1h 15m left');
    expect(text).toContain('1 concepts left');
  });

  it('renders locked steps as non-link, disabled nodes', () => {
    render(<LearningMap map={MAP} />);
    const locked = container?.querySelector('[data-testid="learning-step-bgp"]');
    expect(locked?.tagName).toBe('SPAN');
    expect(locked?.getAttribute('aria-disabled')).toBe('true');
    // Non-locked steps are links.
    const current = container?.querySelector('[data-testid="learning-step-ospf"]');
    expect(current?.tagName).toBe('A');
  });

  it('fires onOpen for a non-locked step and onResume for the resume affordance', () => {
    const onOpen = vi.fn();
    const onResume = vi.fn();
    render(<LearningMap map={MAP} onOpen={onOpen} onResume={onResume} />);

    const current = container?.querySelector(
      '[data-testid="learning-step-ospf"]',
    ) as HTMLAnchorElement;
    act(() => current.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
    expect(onOpen).toHaveBeenCalledWith('ospf', '/l3/ospf');

    const resume = container?.querySelector('[data-testid="learning-resume"]') as HTMLAnchorElement;
    act(() => resume.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
    expect(onResume).toHaveBeenCalledWith('ospf', '/l3/ospf');
  });

  it('hides the track grid in compact mode but keeps the resume', () => {
    render(<LearningMap map={MAP} compact />);
    expect(container?.querySelector('[data-testid="learning-step-ospf"]')).toBeNull();
    expect(container?.querySelector('[data-testid="learning-resume"]')).not.toBeNull();
  });
});
