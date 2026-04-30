/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

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

describe('Modal', () => {
  it('renders title and children when open', () => {
    render(
      <Modal open title="Test modal" onClose={vi.fn()}>
        <p>modal body</p>
      </Modal>,
    );
    expect(document.body.textContent).toContain('Test modal');
    expect(document.body.textContent).toContain('modal body');
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        <p>hidden content</p>
      </Modal>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="ESC test" onClose={onClose}>
        <p>body</p>
      </Modal>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button has aria-label="Close"', () => {
    render(
      <Modal open title="A11y" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    );
    const closeButton = document.querySelector('button[aria-label="Close"]');
    expect(closeButton).toBeTruthy();
  });
});
