/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

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

describe('Select', () => {
  it('renders with label', () => {
    render(<Select label="Mode" options={OPTIONS} value="a" onChange={vi.fn()} />);
    const label = document.querySelector('label');
    expect(label?.textContent).toBe('Mode');
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
    expect(label?.htmlFor).toBe(select?.id);
  });

  it('calls onChange when selection changes', () => {
    const handler = vi.fn();
    render(<Select label="Mode" options={OPTIONS} value="a" onChange={handler} />);
    const select = document.querySelector('select') as HTMLSelectElement;
    act(() => {
      Object.defineProperty(select, 'value', { writable: true, value: 'b' });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(handler).toHaveBeenCalled();
  });
});
