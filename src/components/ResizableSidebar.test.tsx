/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResizableSidebar } from './ResizableSidebar';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

function sidebar(): HTMLElement {
  return container?.firstElementChild as HTMLElement;
}

function handle(): HTMLElement | null {
  return (
    Array.from(sidebar().children as HTMLCollectionOf<HTMLElement>).find(
      (child) => child.style.cursor === 'col-resize',
    ) ?? null
  );
}

function mouse(target: EventTarget, type: string, clientX: number) {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX }));
  });
}

// TC-296
describe('ResizableSidebar', () => {
  it('opens at its default width and never asks for more than its container has', () => {
    act(() => {
      root?.render(<ResizableSidebar defaultWidth={460}>panel</ResizableSidebar>);
    });

    expect(sidebar().style.width).toBe('460px');
    expect(sidebar().style.maxWidth).toBe('100%');
  });

  it('is resized by dragging its left edge, within its limits', () => {
    act(() => {
      root?.render(
        <ResizableSidebar defaultWidth={460} minWidth={200} maxWidth={600}>
          panel
        </ResizableSidebar>,
      );
    });

    mouse(handle()!, 'mousedown', 500);
    mouse(window, 'mousemove', 440);
    expect(sidebar().style.width).toBe('520px');

    mouse(window, 'mousemove', 0);
    expect(sidebar().style.width).toBe('600px');

    mouse(window, 'mousemove', 2000);
    expect(sidebar().style.width).toBe('200px');
    mouse(window, 'mouseup', 2000);
  });
});
