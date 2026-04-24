/* @vitest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SandboxIntroOverlay } from './SandboxIntroOverlay';

const introState = vi.hoisted(() => ({
  value: {
    intro: {
      title: 'Sandbox intro',
      summary: 'intro summary',
    },
    status: 'pending',
    currentStepIndex: 0,
    totalSteps: 5,
    currentStep: {
      title: 'Open the Node tab',
      description: 'Use the node tab.',
    },
    start: vi.fn(),
    skip: vi.fn(),
    restart: vi.fn(),
  },
}));

vi.mock('../../sandbox/intro/useSandboxIntro', () => ({
  useSandboxIntro: () => introState.value,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: ReactNode) {
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

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  introState.value.start.mockReset();
  introState.value.skip.mockReset();
  introState.value.restart.mockReset();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('SandboxIntroOverlay', () => {
  it('renders the pending intro state with start and skip actions', () => {
    introState.value = {
      ...introState.value,
      status: 'pending',
    };

    render(<SandboxIntroOverlay />);

    expect(container?.querySelector('[data-testid="sandbox-intro-overlay"]')).not.toBeNull();
    expect(container?.textContent).toContain('Sandbox intro');
    expect(container?.textContent).toContain('Start Intro');
    expect(container?.textContent).toContain('Skip Intro');
  });

  it('renders the active intro state with restart action', () => {
    introState.value = {
      ...introState.value,
      status: 'active',
    };

    render(<SandboxIntroOverlay />);

    expect(container?.textContent).toContain('Open the Node tab');
    expect(container?.textContent).toContain('Restart Intro');
    expect(
      container
        ?.querySelector('[data-testid="sandbox-intro-step-panel"]')
        ?.getAttribute('data-intro-status'),
    ).toBe('active');
  });

  it('returns null once the intro is passed', () => {
    introState.value = {
      ...introState.value,
      status: 'passed',
    };

    render(<SandboxIntroOverlay />);

    expect(container?.querySelector('[data-testid="sandbox-intro-overlay"]')).toBeNull();
  });
});
