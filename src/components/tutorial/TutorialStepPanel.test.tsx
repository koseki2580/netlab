/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorialStepPanel } from './TutorialStepPanel';

const useTutorialRunner = vi.fn();

vi.mock('../../tutorials', () => ({
  useTutorialRunner: () => useTutorialRunner(),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
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

function mockState(status: 'pending' | 'active' | 'failed' | 'passed' | 'exited') {
  const controls = {
    start: vi.fn(),
    exit: vi.fn(),
    restart: vi.fn(),
  };

  useTutorialRunner.mockReturnValue({
    tutorial: {
      id: 'arp-basics',
      scenarioId: 'basic-arp',
      title: 'ARP Basics',
      summary: 'summary',
      difficulty: 'intro',
      steps: [
        {
          id: 'step-1',
          title: 'Send the first packet',
          description: 'Send one packet to trigger ARP.',
          predicate: () => false,
          hint: 'Use the Send button.',
        },
      ],
    },
    state: {
      status,
      tutorialId: 'arp-basics',
      currentStepIndex: 0,
      stepsCompleted: status === 'passed' ? 1 : 0,
      ...(status === 'failed' ? { lastHint: 'Use the Send button.' } : {}),
    },
    ...controls,
  });

  return controls;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  useTutorialRunner.mockReset();

  if (container) {
    container.remove();
    container = null;
  }
});

describe('TutorialStepPanel', () => {
  it('renders the pending tutorial CTA', () => {
    mockState('pending');
    render(<TutorialStepPanel />);

    expect(container?.textContent).toContain('Start Tutorial');
    expect(container?.textContent).toContain('ARP Basics');
  });

  it('renders the active step content', () => {
    mockState('active');
    render(<TutorialStepPanel />);

    expect(container?.textContent).toContain('Send the first packet');
    expect(container?.textContent).toContain('Step 1 / 1');
    expect(container?.textContent).toContain('Exit Tutorial');
  });

  it('renders the failure hint when failed', () => {
    mockState('failed');
    render(<TutorialStepPanel />);

    expect(container?.textContent).toContain('Hint: Use the Send button.');
    expect(container?.textContent).toContain('Restart Step Flow');
  });

  it('renders the completion card when passed', () => {
    mockState('passed');
    render(<TutorialStepPanel />);

    expect(container?.textContent).toContain('DONE');
    expect(container?.textContent).toContain('Restart');
  });

  it('renders the exited reopen state', () => {
    mockState('exited');
    render(<TutorialStepPanel />);

    expect(container?.textContent).toContain('Tutorial dismissed');
    expect(container?.textContent).toContain('Reopen Tutorial');
  });
});
