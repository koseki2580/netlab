/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CommandPalette,
  filterCommandPaletteItems,
  type CommandPaletteItem,
} from './CommandPalette';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const ITEMS: CommandPaletteItem[] = [
  {
    id: 'scenario:ospf',
    label: 'OSPF Convergence',
    subtitle: 'routing scenario',
    keywords: ['ospf-convergence', 'spf'],
    group: 'Scenarios',
    onSelect: vi.fn(),
  },
  {
    id: 'scenario:arp',
    label: 'ARP Basics',
    subtitle: 'layer 2',
    keywords: ['basic-arp'],
    group: 'Scenarios',
    onSelect: vi.fn(),
  },
  {
    id: 'command:help',
    label: 'Show keyboard shortcuts',
    keywords: ['help', 'shortcuts'],
    group: 'Commands',
    onSelect: vi.fn(),
  },
];

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
  vi.clearAllMocks();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('filterCommandPaletteItems', () => {
  it('fuzzy matches labels, ids, subtitles, and keywords', () => {
    expect(filterCommandPaletteItems(ITEMS, 'ospf').map((item) => item.id)).toEqual([
      'scenario:ospf',
    ]);
    expect(filterCommandPaletteItems(ITEMS, 'spf').map((item) => item.id)).toEqual([
      'scenario:ospf',
    ]);
    expect(filterCommandPaletteItems(ITEMS, 'keyboard').map((item) => item.id)).toEqual([
      'command:help',
    ]);
  });

  it('ranks direct scenario matches before weak fuzzy matches', () => {
    const results = filterCommandPaletteItems(
      [
        {
          id: 'scenario:basic-arp',
          label: 'Basic ARP',
          subtitle: 'Resolve the first-hop MAC before forwarding',
          keywords: ['arp'],
          group: 'Scenarios',
          onSelect: () => {},
        },
        {
          id: 'scenario:ospf-convergence',
          label: 'OSPF Convergence',
          subtitle: 'Recompute routed paths',
          keywords: ['ospf'],
          group: 'Scenarios',
          onSelect: () => {},
        },
      ],
      'ospf',
    );

    expect(results.map((item) => item.id)).toEqual([
      'scenario:ospf-convergence',
      'scenario:basic-arp',
    ]);
  });
});

describe('CommandPalette', () => {
  it('renders filtered command items and executes the highlighted command with Enter', () => {
    const onClose = vi.fn();
    act(() => {
      root?.render(<CommandPalette open items={ITEMS} onClose={onClose} />);
    });

    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    act(() => {
      input!.value = 'ospf';
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container?.textContent).toContain('OSPF Convergence');
    expect(container?.textContent).not.toContain('ARP Basics');

    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(ITEMS[0]?.onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('supports arrow navigation and closes on Escape', () => {
    const onClose = vi.fn();
    act(() => {
      root?.render(<CommandPalette open items={ITEMS} onClose={onClose} />);
    });

    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement | null;

    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(ITEMS[1]?.onSelect).toHaveBeenCalledOnce();

    act(() => {
      root?.render(<CommandPalette open items={ITEMS} onClose={onClose} />);
    });
    const nextInput = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement | null;
    act(() => {
      nextInput!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    act(() => {
      root?.render(<CommandPalette open={false} items={ITEMS} onClose={vi.fn()} />);
    });

    expect(container?.querySelector('[data-netlab-command-palette]')).toBeNull();
  });
});
