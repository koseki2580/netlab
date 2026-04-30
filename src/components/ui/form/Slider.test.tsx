/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

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

describe('Slider', () => {
  it('renders with label and current value', () => {
    render(<Slider label="Speed" min={0} max={100} value={50} onChange={vi.fn()} />);
    const label = document.querySelector('label');
    expect(label?.textContent).toBe('Speed');
    expect(document.body.textContent).toContain('50');
    const input = document.querySelector('input[type="range"]');
    expect(input).toBeTruthy();
  });

  it('calls onChange with new numeric value', () => {
    const handler = vi.fn();
    render(<Slider label="Vol" min={0} max={10} value={5} onChange={handler} />);
    const input = document.querySelector('input[type="range"]') as HTMLInputElement;
    act(() => {
      Object.defineProperty(input, 'value', { writable: true, value: '8' });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(handler).toHaveBeenCalledWith(8);
  });
});
