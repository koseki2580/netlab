/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorSidebar } from './EditorSidebar';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
}

function click(id: string) {
  act(() => testid(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

function render() {
  act(() =>
    root?.render(
      <EditorSidebar
        node={<p data-testid="probe-node">node editor</p>}
        validation={<p data-testid="probe-validation">checks</p>}
        traces={[]}
      />,
    ),
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
});

describe('EditorSidebar', () => {
  it('shows one tab at a time and unmounts the others', () => {
    render();
    expect(testid('probe-node')).not.toBeNull();
    // The other panels must not merely be hidden: a docked NodeEditorPanel and
    // ValidationPanel both render form controls, and duplicated controls in the
    // accessibility tree is what the tabs exist to avoid.
    expect(testid('probe-validation')).toBeNull();

    click('editor-sidebar-tab-validation');
    expect(testid('probe-validation')).not.toBeNull();
    expect(testid('probe-node')).toBeNull();
  });

  it('reports the selected tab to assistive tech', () => {
    render();
    expect(testid('editor-sidebar-tab-node')!.getAttribute('aria-selected')).toBe('true');
    expect(testid('editor-sidebar-tab-history')!.getAttribute('aria-selected')).toBe('false');

    click('editor-sidebar-tab-history');
    expect(testid('editor-sidebar-tab-history')!.getAttribute('aria-selected')).toBe('true');
    expect(testid('editor-sidebar-tab-node')!.getAttribute('aria-selected')).toBe('false');
  });

  it('the run tab holds the results and the packet history', () => {
    render();
    click('editor-sidebar-tab-history');
    expect(testid('editor-results')).not.toBeNull();
    expect(testid('editor-history-empty')).not.toBeNull();
  });
});
