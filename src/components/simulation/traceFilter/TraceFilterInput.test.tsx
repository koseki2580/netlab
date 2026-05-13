/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TraceFilterInput } from './TraceFilterInput';
import type { TraceFilterResult } from './parser';

let container: HTMLDivElement;
let root: Root;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(onParse = vi.fn()) {
  act(() => {
    root.render(<TraceFilterInput onParse={onParse} />);
  });
  return onParse;
}

function searchbox(): HTMLInputElement {
  const input = container.querySelector('[role="searchbox"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('searchbox was not rendered');
  }
  return input;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  window.history.replaceState({}, '', '/?sandbox=1');
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('TraceFilterInput', () => {
  it('debounces parsing and persists valid filters in the URL', () => {
    const onParse = render();

    act(() => {
      setInputValue(searchbox(), 'protocol == tcp');
    });
    expect(onParse).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onParse).toHaveBeenCalledTimes(1);
    const result = onParse.mock.calls[0]?.[0] as TraceFilterResult | undefined;
    expect(result?.ok).toBe(true);
    expect(window.location.search).toContain('sandbox=1');
    expect(window.location.search).toContain('trace_filter=protocol+%3D%3D+tcp');
  });

  it('marks invalid filters with aria-invalid and keeps the previous URL value', () => {
    render();

    act(() => {
      setInputValue(searchbox(), 'unknown == 1');
      vi.advanceTimersByTime(300);
    });

    expect(searchbox().getAttribute('aria-invalid')).toBe('true');
    expect(container.textContent).toContain('column 0');
    expect(window.location.search).not.toContain('trace_filter=');
  });

  it('restores the initial filter from the URL and clears it on Escape', () => {
    window.history.replaceState({}, '', '/?trace_filter=protocol+%3D%3D+arp');
    const onParse = render();

    expect(searchbox().value).toBe('protocol == arp');

    act(() => {
      searchbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      vi.advanceTimersByTime(300);
    });

    expect(searchbox().value).toBe('');
    expect(window.location.search).toBe('');
    const result = onParse.mock.calls[onParse.mock.calls.length - 1]?.[0] as
      | TraceFilterResult
      | undefined;
    expect(result?.ok).toBe(true);
  });
});
