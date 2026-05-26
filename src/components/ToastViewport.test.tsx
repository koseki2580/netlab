/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastViewport } from './ToastViewport';
import { toast, ToastBus } from './ToastBus';

const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function cards() {
  return container?.querySelectorAll('[data-testid="toast-card"]') ?? [];
}

beforeEach(() => {
  env.IS_REACT_ACT_ENVIRONMENT = true;
  ToastBus._reset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<ToastViewport />));
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  ToastBus._reset();
  env.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('ToastViewport', () => {
  it('renders an emitted toast with its message and level', () => {
    act(() => {
      toast.success('PCAP saved · 482 packets');
    });
    expect(cards()).toHaveLength(1);
    expect(container?.textContent).toContain('PCAP saved · 482 packets');
    expect(cards()[0]?.getAttribute('data-toast-level')).toBe('success');
  });

  it('caps the visible stack at 3 even when more queue', () => {
    act(() => {
      toast.info('1');
      toast.info('2');
      toast.info('3');
      toast.info('4');
    });
    expect(cards()).toHaveLength(3);
    // the bus still holds all four — the 4th is queued, not dropped
    expect(ToastBus.list()).toHaveLength(4);
  });

  it('dismisses the latest non-sticky toast on Escape', () => {
    act(() => {
      toast.error('sticky err'); // sticky
      toast.info('dismiss me'); // non-sticky, latest
    });
    expect(cards()).toHaveLength(2);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container?.textContent).not.toContain('dismiss me');
    expect(container?.textContent).toContain('sticky err');
  });

  it('dismisses a toast when its close button is clicked', () => {
    act(() => {
      toast.info('close me');
    });
    const closeBtn = container?.querySelector(
      '[aria-label="Dismiss notification"]',
    ) as HTMLButtonElement;
    act(() => closeBtn.click());
    expect(cards()).toHaveLength(0);
  });
});
