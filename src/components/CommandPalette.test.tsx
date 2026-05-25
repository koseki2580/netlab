/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPaletteView,
  CommandPalette,
  filterCommandPaletteItems,
  labelMatchIndices,
  loadRecents,
  recordRecent,
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
  window.localStorage.clear();
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

  it('records executed commands and surfaces them under Recents on reopen', () => {
    const onClose = vi.fn();
    act(() => {
      root?.render(<CommandPalette open items={ITEMS} onClose={onClose} />);
    });
    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement;
    act(() => {
      input.value = 'keyboard';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(loadRecents()).toEqual(['command:help']);

    // Reopen with an empty query: a Recents group leads, holding the command.
    act(() => root?.render(<CommandPalette open={false} items={ITEMS} onClose={onClose} />));
    act(() => root?.render(<CommandPalette open items={ITEMS} onClose={onClose} />));

    const groups = Array.from(
      container?.querySelectorAll('[data-testid="command-palette-group"]') ?? [],
    ).map((el) => el.textContent);
    expect(groups[0]).toBe('recents');
    const firstOption = container?.querySelector('[data-testid="command-palette-option"]');
    expect(firstOption?.textContent).toContain('Show keyboard shortcuts');
  });

  it('highlights matched characters in the label', () => {
    act(() => {
      root?.render(<CommandPalette open items={ITEMS} onClose={vi.fn()} />);
    });
    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement;
    act(() => {
      input.value = 'oconv';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container?.textContent).toContain('OSPF Convergence');
    expect(container?.querySelectorAll('[data-match]').length ?? 0).toBeGreaterThan(0);
  });
});

describe('recents store', () => {
  beforeEach(() => window.localStorage.clear());

  it('prepends, de-dups, and caps at 5 (LRU)', () => {
    recordRecent('a');
    recordRecent('b');
    recordRecent('a'); // moves a to front
    expect(loadRecents()).toEqual(['a', 'b']);
    recordRecent('c');
    recordRecent('d');
    recordRecent('e');
    recordRecent('f'); // pushes oldest (b) out
    expect(loadRecents()).toEqual(['f', 'e', 'd', 'c', 'a']);
  });

  it('tolerates corrupt storage', () => {
    window.localStorage.setItem('nl_palette_recents', '{not json');
    expect(loadRecents()).toEqual([]);
  });
});

describe('labelMatchIndices', () => {
  it('returns subsequence positions in the original label', () => {
    expect(labelMatchIndices('OSPF Convergence', 'oconv')).toEqual([0, 5, 6, 7, 8]);
  });
  it('returns [] when the label is not a subsequence match (keyword-only match)', () => {
    expect(labelMatchIndices('ARP Basics', 'xyz')).toEqual([]);
  });
});

describe('buildPaletteView', () => {
  it('with a query returns one flat result section', () => {
    const view = buildPaletteView(ITEMS, 'ospf', []);
    expect(view.sections).toHaveLength(1);
    expect(view.sections[0]?.label).toBeNull();
    expect(view.ordered.map((i) => i.id)).toEqual(['scenario:ospf']);
  });

  it('with no query leads with Recents then groups, de-duping recents', () => {
    const view = buildPaletteView(ITEMS, '', ['command:help']);
    expect(view.sections[0]?.label).toBe('recents');
    expect(view.sections[0]?.items.map((i) => i.id)).toEqual(['command:help']);
    // command:help is not repeated in any non-recents section
    const nonRecents = view.sections.filter((s) => s.label !== 'recents');
    expect(nonRecents.some((s) => s.items.some((i) => i.id === 'command:help'))).toBe(false);
    // nav order is the flattened sections
    expect(view.ordered[0]?.id).toBe('command:help');
  });
});
