/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreFlightBrief } from './PreFlightBrief';
import type { ScenarioBrief } from '../scenarios/types';

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

function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

const BRIEF: ScenarioBrief = {
  goal: 'Watch OSPF recompute a backup path.',
  est: '~3 min',
  prereq: [{ id: 'basic-arp', label: 'arp', done: true }],
  watchPoints: [
    { step: 1, kind: 'route', label: 'prefer R2' },
    { step: 3, kind: 'spf', label: 'recompute' },
  ],
  conclusion: {
    headline: 'OSPF converged onto the backup.',
    detail: 'No static reconfiguration needed.',
    actions: [
      { id: 'gallery', label: 'browse more →', kind: 'primary' },
      { id: 'next', label: 'next →' },
    ],
  },
};

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  vi.useRealTimers();
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
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('PreFlightBrief', () => {
  it('renders the full card for an unseen learner', () => {
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="learner" />);
    const card = q('preflight-fullcard');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('role')).toBe('dialog');
    expect(card?.textContent ?? '').toContain('Watch OSPF recompute a backup path.');
    expect(q('preflight-strip')).toBeNull();
  });

  it('renders the compact strip for audience=pro from the start', () => {
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="pro" />);
    expect(q('preflight-strip')).not.toBeNull();
    expect(q('preflight-fullcard')).toBeNull();
  });

  it('shows the strip on a repeat visit (localStorage flag already set)', () => {
    window.localStorage.setItem('nl_brief_seen_ospf', '1');
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="learner" />);
    expect(q('preflight-strip')).not.toBeNull();
    expect(q('preflight-fullcard')).toBeNull();
  });

  it('persists dismissal and calls onStart when the start button is clicked', () => {
    const onStart = vi.fn();
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="learner" onStart={onStart} />);
    const startButton = q('preflight-start');
    expect(startButton).not.toBeNull();
    click(startButton as HTMLElement);
    expect(window.localStorage.getItem('nl_brief_seen_ospf')).toBe('1');
    expect(onStart).toHaveBeenCalledTimes(1);
    // After dismissal the full card is replaced by the strip.
    expect(q('preflight-fullcard')).toBeNull();
    expect(q('preflight-strip')).not.toBeNull();
  });

  it('dismisses the full card on Escape', () => {
    const onStart = vi.fn();
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="learner" onStart={onStart} />);
    expect(q('preflight-fullcard')).not.toBeNull();
    pressKey('Escape');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('nl_brief_seen_ospf')).toBe('1');
    expect(q('preflight-fullcard')).toBeNull();
  });

  it('expands the full card from the strip and collapses it again', () => {
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="pro" />);
    click(q('preflight-strip') as HTMLElement);
    expect(q('preflight-fullcard')).not.toBeNull();
    // Collapsing must not re-trigger persistence semantics — pro stays a strip.
    click(q('preflight-start') as HTMLElement);
    expect(q('preflight-fullcard')).toBeNull();
    expect(q('preflight-strip')).not.toBeNull();
  });

  it('renders the conclusion card on the final step and fires action callbacks', () => {
    const onAction = vi.fn();
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} isLastStep onAction={onAction} />);
    const conclusion = q('preflight-conclusion');
    expect(conclusion).not.toBeNull();
    expect(conclusion?.textContent ?? '').toContain('OSPF converged onto the backup.');
    expect(q('preflight-fullcard')).toBeNull();
    click(q('preflight-action-gallery') as HTMLElement);
    expect(onAction).toHaveBeenCalledWith('gallery');
  });

  it('renders nothing when the scenario has no brief', () => {
    render(<PreFlightBrief scenarioId="does-not-exist" />);
    expect(container?.textContent ?? '').toBe('');
  });

  it('reopens the brief from the strip when B is pressed (P11)', () => {
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="pro" />);
    expect(q('preflight-strip')).not.toBeNull();
    expect(q('preflight-fullcard')).toBeNull();

    pressKey('b');
    expect(q('preflight-fullcard')).not.toBeNull();
  });

  it('does not reopen on B while a text field is focused (P11)', () => {
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="pro" />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    });
    expect(q('preflight-fullcard')).toBeNull();
    input.remove();
  });

  it('does not reopen on B while the command palette is open (P11)', () => {
    const palette = document.createElement('div');
    palette.setAttribute('data-netlab-command-palette', '');
    document.body.appendChild(palette);
    render(<PreFlightBrief scenarioId="ospf" brief={BRIEF} audience="pro" />);

    pressKey('b');
    expect(q('preflight-fullcard')).toBeNull();
    palette.remove();
  });
});
