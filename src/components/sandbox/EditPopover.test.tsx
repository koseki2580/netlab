/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeRef } from '../../sandbox/types';
import { EditPopover } from './EditPopover';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const anchor: NodeRef = { kind: 'node', nodeId: 'router-1' };

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function makeAnchorElement(): HTMLElement {
  const element = document.createElement('button');
  element.textContent = 'anchor';
  element.getBoundingClientRect = () =>
    ({
      x: 50,
      y: 70,
      top: 70,
      left: 50,
      right: 90,
      bottom: 110,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(element);
  return element;
}

function renderPopover(onDismiss = vi.fn()) {
  const anchorElement = makeAnchorElement();
  render(
    <EditPopover
      anchor={anchor}
      anchorElement={anchorElement}
      labelledBy="popover-heading"
      onDismiss={onDismiss}
    >
      <h2 id="popover-heading">Edit router</h2>
      <button type="button">First</button>
      <button type="button">Second</button>
    </EditPopover>,
  );
  return { anchorElement, onDismiss };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('EditPopover', () => {
  it('positions against the anchor rect', () => {
    renderPopover();

    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.style.left).toBe('50px');
    expect(dialog?.style.top).toBe('118px');
  });

  it('renders non-modal dialog semantics with caller heading', () => {
    renderPopover();

    const dialog = container?.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('false');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('popover-heading');
  });

  it('renders children verbatim', () => {
    renderPopover();

    expect(container?.textContent).toContain('Edit router');
    expect(container?.textContent).toContain('First');
    expect(container?.textContent).toContain('Second');
  });

  it('dismisses on Escape', () => {
    const onDismiss = vi.fn();
    renderPopover(onDismiss);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on click outside', () => {
    const onDismiss = vi.fn();
    renderPopover(onDismiss);

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when clicking inside the popover', () => {
    const onDismiss = vi.fn();
    renderPopover(onDismiss);
    const first = container?.querySelector<HTMLButtonElement>('button');

    act(() => {
      first?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('cycles Tab from the last focusable element to the first', () => {
    renderPopover();
    const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const first = buttons[0];
    const second = buttons[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    second.focus();
    act(() => {
      second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(document.activeElement).toBe(first);
  });

  it('cycles Shift+Tab from the first focusable element to the last', () => {
    renderPopover();
    const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const first = buttons[0];
    const second = buttons[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    first.focus();
    act(() => {
      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      );
    });

    expect(document.activeElement).toBe(second);
  });
});
