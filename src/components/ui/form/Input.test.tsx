/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

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

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" value="" onChange={vi.fn()} />);
    const label = document.querySelector('label');
    expect(label?.textContent).toBe('Username');
    const input = document.querySelector('input');
    expect(input).toBeTruthy();
    expect(label?.htmlFor).toBe(input?.id);
  });

  it('calls onChange with new value', () => {
    const handler = vi.fn();
    render(<Input label="Field" value="" onChange={handler} />);
    const input = document.querySelector('input') as HTMLInputElement;
    act(() => {
      Object.defineProperty(input, 'value', { writable: true, value: 'abc' });
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // React uses onChange which maps to 'change' event in jsdom
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(handler).toHaveBeenCalled();
  });

  it('is disabled when disabled prop set', () => {
    render(<Input label="Disabled" value="x" onChange={vi.fn()} disabled />);
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
