/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CategoryHero } from './CategoryHero';

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

describe('CategoryHero', () => {
  it('reports progress via role="progressbar" and the matching aria-valuenow', () => {
    act(() => {
      root?.render(
        <CategoryHero
          title="Routing"
          blurb="Path selection"
          accent="var(--netlab-accent-green)"
          doneCount={2}
          totalCount={6}
          pills={[{ tone: 'up', label: 'L3' }]}
        />,
      );
    });
    const bar = container?.querySelector('[role="progressbar"]') as HTMLElement | null;
    expect(bar).not.toBeNull();
    // 2/6 = 33%
    expect(bar?.getAttribute('aria-valuenow')).toBe('33');
    expect(bar?.getAttribute('aria-valuemin')).toBe('0');
    expect(bar?.getAttribute('aria-valuemax')).toBe('100');
  });

  it('renders the supplied pills', () => {
    act(() => {
      root?.render(
        <CategoryHero
          title="Routing"
          blurb="x"
          accent="var(--netlab-accent-green)"
          doneCount={0}
          totalCount={3}
          pills={[
            { tone: 'up', label: 'L3' },
            { tone: 'info', label: '~30m total' },
          ]}
        />,
      );
    });
    expect(container?.textContent).toContain('L3');
    expect(container?.textContent).toContain('~30m total');
  });

  it('handles zero total without dividing by zero', () => {
    act(() => {
      root?.render(
        <CategoryHero
          title="Empty"
          blurb=""
          accent="var(--netlab-accent-green)"
          doneCount={0}
          totalCount={0}
          pills={[]}
        />,
      );
    });
    const bar = container?.querySelector('[role="progressbar"]') as HTMLElement | null;
    expect(bar?.getAttribute('aria-valuenow')).toBe('0');
  });
});
