/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

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

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Enable feature" checked={false} onChange={vi.fn()} />);
    const label = document.querySelector('label');
    expect(label?.textContent).toContain('Enable feature');
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it('calls onChange when clicked', () => {
    const handler = vi.fn();
    render(<Checkbox label="Toggle" checked={false} onChange={handler} />);
    const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    act(() => {
      input.click();
    });
    expect(handler).toHaveBeenCalledWith(true);
  });
});
