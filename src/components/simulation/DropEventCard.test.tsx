/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacketHop } from '../../types/simulation';
import { DropEventCard } from './DropEventCard';
import { getDropLesson } from './dropLessons';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
}

function q(testid: string): HTMLElement | null {
  return container?.querySelector(`[data-testid="${testid}"]`) ?? null;
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function makeDropHop(reason: string, overrides: Partial<PacketHop> = {}): PacketHop {
  return {
    step: 2,
    nodeId: 'r1',
    nodeLabel: 'R1',
    srcIp: '10.0.0.10',
    dstIp: '10.4.0.10',
    ttl: 0,
    protocol: 'TCP',
    event: 'drop',
    reason,
    timestamp: 0,
    ...overrides,
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('getDropLesson', () => {
  it('resolves authored reasons and aliases', () => {
    expect(getDropLesson('acl-deny')?.cause.kind).toBe('acl');
    expect(getDropLesson('no-route')?.cause.kind).toBe('route');
    expect(getDropLesson('ttl-exceeded')?.cause.kind).toBe('ttl');
    // `ttl-expired` is an alias of `ttl-exceeded`.
    expect(getDropLesson('ttl-expired')).toBe(getDropLesson('ttl-exceeded'));
  });

  it('returns undefined for unknown or missing reasons', () => {
    expect(getDropLesson('queue-full')).toBeUndefined();
    expect(getDropLesson(undefined)).toBeUndefined();
  });
});

describe('DropEventCard', () => {
  it('renders cause / response / why for a known drop reason', () => {
    render(<DropEventCard hop={makeDropHop('acl-deny')} />);
    const card = q('drop-event-card');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('role')).toBe('dialog');
    const text = card?.textContent ?? '';
    expect(text).toContain('Denied by an inbound ACL rule');
    expect(text).toContain('administratively prohibited');
    expect(text).toContain('access-control rule matched');
    expect(text).toContain('step 3'); // hop.step is 0-indexed; card shows step+1
  });

  it('renders nothing for a non-drop hop or an unknown reason', () => {
    render(<DropEventCard hop={makeDropHop('acl-deny', { event: 'forward' })} />);
    expect(q('drop-event-card')).toBeNull();
    render(<DropEventCard hop={makeDropHop('queue-full')} />);
    expect(q('drop-event-card')).toBeNull();
  });

  it('routes a tab ref through onNavigate with the dropping node', () => {
    const onNavigate = vi.fn();
    render(
      <DropEventCard hop={makeDropHop('acl-deny', { nodeId: 'r2' })} onNavigate={onNavigate} />,
    );
    click(q('drop-ref-acl') as HTMLElement);
    expect(onNavigate).toHaveBeenCalledWith({ nodeId: 'r2', tab: 'acl' });
  });

  it('opens an external ref via window.open', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DropEventCard hop={makeDropHop('acl-deny')} />);
    click(q('drop-ref-link') as HTMLElement);
    expect(open).toHaveBeenCalledWith(
      'https://datatracker.ietf.org/doc/html/rfc792',
      '_blank',
      'noopener',
    );
  });

  it('shows the sandbox fix only when editable, and fires onApply', () => {
    const onApply = vi.fn();
    const fix = { label: 'permit this traffic', onApply };

    // Read-only (editable=false): the fix is hidden even when supplied.
    render(<DropEventCard hop={makeDropHop('acl-deny')} fix={fix} />);
    expect(q('drop-fix')).toBeNull();

    // Editable (sandbox): the fix renders and fires its action.
    render(<DropEventCard hop={makeDropHop('acl-deny')} fix={fix} editable />);
    const fixButton = q('drop-fix');
    expect(fixButton).not.toBeNull();
    expect(fixButton?.textContent).toContain('permit this traffic');
    click(fixButton as HTMLElement);
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('closes on the close button and on Escape', () => {
    const onClose = vi.fn();
    render(<DropEventCard hop={makeDropHop('no-route')} onClose={onClose} />);
    click(q('drop-event-close') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
