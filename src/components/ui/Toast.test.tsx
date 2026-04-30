/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './Toast';

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

function PushButton() {
  const { push } = useToast();
  return <button onClick={() => push({ title: 'Hello', kind: 'info' })}>push</button>;
}

describe('Toast', () => {
  it('renders a toast when pushed', () => {
    render(
      <ToastProvider>
        <PushButton />
      </ToastProvider>,
    );
    const buttons = document.querySelectorAll('button');
    const pushButton = Array.from(buttons).find((b) => b.textContent === 'push');
    expect(pushButton).toBeTruthy();
    if (pushButton) {
      act(() => {
        pushButton.click();
      });
    }
    expect(document.body.textContent).toContain('Hello');
  });

  it('useToast throws outside provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<PushButton />);
    }).toThrow();
    errorSpy.mockRestore();
  });
});
