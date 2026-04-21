/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorialOverlay } from './TutorialOverlay';

vi.mock('./TutorialStepPanel', async () => {
  const React = await import('react');

  return {
    TutorialStepPanel: () =>
      React.createElement('div', { 'data-testid': 'tutorial-step-panel' }, 'tutorial-step-panel'),
  };
});

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

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }
});

describe('TutorialOverlay', () => {
  it('renders a non-modal dialog wrapper around the step panel', () => {
    render(<TutorialOverlay />);

    const overlay = container?.querySelector('[data-testid="tutorial-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(overlay?.getAttribute('aria-modal')).toBe('false');
    expect(overlay?.getAttribute('aria-labelledby')).toBe('netlab-tutorial-title');
    expect(overlay?.querySelector('[data-testid="tutorial-step-panel"]')).not.toBeNull();
  });
});
