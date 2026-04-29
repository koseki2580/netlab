/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';
import { TraceAnnotationCallout } from './TraceAnnotationCallout';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const annotation: TraceAnnotation = {
  id: 'a1',
  traceEventId: 'trace-1:0',
  author: 'scenario',
  content: 'Fragmentation starts',
  createdAt: 0,
  color: 'warning',
};

function render(ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(ui));
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  container?.remove();
  container = null;
  vi.restoreAllMocks();
});

describe('TraceAnnotationCallout', () => {
  it('renders an accessible annotation button', () => {
    render(<TraceAnnotationCallout annotation={annotation} />);

    const button = container?.querySelector<HTMLButtonElement>('button');
    expect(button?.getAttribute('aria-label')).toBe('Annotation by scenario');
    expect(button?.textContent).toBe('!');
  });

  it('calls onClick when activated', () => {
    const onClick = vi.fn();
    render(<TraceAnnotationCallout annotation={annotation} onClick={onClick} />);

    act(() => {
      container?.querySelector<HTMLButtonElement>('button')?.click();
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders cluster counts as +N', () => {
    render(<TraceAnnotationCallout annotation={annotation} count={12} />);

    expect(container?.textContent).toBe('+12');
  });
});
