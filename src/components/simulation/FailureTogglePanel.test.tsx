/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { FailureProvider } from '../../simulation/FailureContext';

const netlabContextMock = vi.hoisted(() => ({
  topology: {
    nodes: [
      {
        id: 'r1',
        type: 'netlab-node',
        data: {
          role: 'router',
          label: 'Router 1',
          interfaces: [
            { id: 'eth0', name: 'eth0' },
            { id: 'eth1', name: 'eth1' },
          ],
        },
      },
      { id: 'a', type: 'netlab-node', data: { role: 'server', label: 'Server A' } },
      { id: 'b', type: 'netlab-node', data: { role: 'server', label: 'Server B' } },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'r1' },
      { id: 'e2', source: 'r1', target: 'b' },
    ],
  },
  routeTable: new Map(),
  areas: [],
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => netlabContextMock,
}));

import { FailureTogglePanel } from './FailureTogglePanel';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
let container: HTMLDivElement;
let root: Root;

function render(locale = 'en') {
  act(() => {
    root.render(
      <I18nProvider locale={locale}>
        <FailureProvider>
          <FailureTogglePanel />
        </FailureProvider>
      </I18nProvider>,
    );
  });
}

const group = (name: string) =>
  container.querySelector<HTMLButtonElement>(`[data-testid="failure-group-${name}"]`);
const switchLabels = () =>
  Array.from(container.querySelectorAll('[role="switch"]')).map((el) =>
    el.getAttribute('aria-label'),
  );

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// TC-UX-PANEL-03 — every failure switch is reachable: one group of switches at
// a time, in a list of bounded height that scrolls on its own.
describe('FailureTogglePanel groups', () => {
  it('shows one group at a time, starting with the devices', () => {
    render();
    expect(group('nodes')?.getAttribute('aria-pressed')).toBe('true');
    expect(switchLabels()).toEqual(['Toggle Router 1', 'Toggle Server A', 'Toggle Server B']);

    act(() => group('links')?.click());
    expect(switchLabels()).toEqual(['Toggle Server A ↔ Router 1', 'Toggle Router 1 ↔ Server B']);

    act(() => group('interfaces')?.click());
    expect(switchLabels()).toEqual(['Toggle Router 1 / eth0', 'Toggle Router 1 / eth1']);
  });

  it('keeps the switch list to a bounded, scrollable height', () => {
    render();
    const list = container.querySelector<HTMLElement>('[data-testid="failure-toggle-list"]');
    expect(list?.style.overflowY).toBe('auto');
    expect(Number.parseInt(list?.style.maxHeight ?? '', 10)).toBeGreaterThan(0);
  });

  it('shows on a group how many of its parts are down, even when another group is open', () => {
    render('ja');
    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="Router 1 を切り替え"]')?.click();
    });
    act(() => group('links')?.click());
    expect(group('nodes')?.textContent).toContain('1 件停止中');
    expect(group('links')?.textContent).not.toContain('停止中');
  });
});
