/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProgressProvider } from '../../src/progress';
import { CategoryLanding, type CategoryLandingDemo } from './CategoryLanding';

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

const DEMOS: CategoryLandingDemo[] = [
  {
    id: 'static-routes',
    title: 'Static Routes',
    desc: 'Single hop',
    path: '/routing/static',
    difficulty: 'beginner',
    layer: 'L3',
    sandboxReady: true,
  },
  {
    id: 'multi-hop',
    title: 'Multi-Hop',
    desc: 'Two routers',
    path: '/routing/multi-hop',
    difficulty: 'intermediate',
  },
  {
    id: 'ospf-conv',
    title: 'OSPF Convergence',
    desc: 'Drop primary',
    path: '/routing/ospf-convergence',
    difficulty: 'advanced',
    sandboxReady: true,
  },
];

describe('CategoryLanding', () => {
  it('renders the hero with title, blurb, and the recommended-order rows', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <ProgressProvider learnerId="t1">
            <CategoryLanding
              trackId="routing"
              title="Routing"
              blurb="Path selection"
              accent="var(--netlab-accent-green)"
              demos={DEMOS}
            />
          </ProgressProvider>
        </MemoryRouter>,
      );
    });
    expect(container?.textContent).toContain('Routing');
    expect(container?.textContent).toContain('Path selection');
    const rows = container?.querySelectorAll('[role="listitem"]');
    expect(rows?.length).toBe(3);
  });

  it('aggregates layer pills + sandbox count from the demos', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <ProgressProvider learnerId="t2">
            <CategoryLanding
              trackId="routing"
              title="Routing"
              blurb=""
              accent="var(--netlab-accent-green)"
              demos={DEMOS}
            />
          </ProgressProvider>
        </MemoryRouter>,
      );
    });
    // 2 demos are sandbox-ready
    expect(container?.textContent).toContain('2 sandbox-ready');
    // beginner(6) + intermediate(10) + advanced(15) = 31m
    expect(container?.textContent).toContain('~31m total');
    expect(container?.textContent).toContain('L3');
  });
});
