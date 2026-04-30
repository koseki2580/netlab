/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
}

function cleanup() {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No nodes yet" description="Drop a router to start." />);
    const title = document.body.textContent;
    expect(title).toContain('No nodes yet');
    expect(title).toContain('Drop a router to start.');
  });

  it('renders action button and calls onClick', () => {
    const handler = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Add node', onClick: handler }} />);
    const button = document.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toBe('Add node');
    if (button) {
      act(() => {
        button.click();
      });
    }
    expect(handler).toHaveBeenCalledOnce();
  });

  it('applies error variant without crashing', () => {
    render(<EmptyState title="Error" variant="error" />);
    expect(document.body.textContent).toContain('Error');
  });
});
