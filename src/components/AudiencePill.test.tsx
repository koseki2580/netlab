/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudiencePill, useAudience } from './AudiencePill';
import type { NetlabAudience } from '../theme';

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

function radio(label: NetlabAudience): HTMLButtonElement {
  const el = container?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!el) throw new Error(`radio ${label} not found`);
  return el;
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  vi.unstubAllGlobals();
});

describe('AudiencePill', () => {
  it('marks the active option with aria-checked', () => {
    render(<AudiencePill value="learner" />);
    expect(radio('learner').getAttribute('aria-checked')).toBe('true');
    expect(radio('pro').getAttribute('aria-checked')).toBe('false');
  });

  it('controlled: reports changes via onChange without self-persisting', () => {
    const onChange = vi.fn();
    render(<AudiencePill value="pro" onChange={onChange} />);
    click(radio('learner'));
    expect(onChange).toHaveBeenCalledWith('learner');
    // Controlled — the parent owns persistence, so the pill must not write storage.
    expect(window.localStorage.getItem('netlab-audience')).toBeNull();
  });

  it('uncontrolled: persists to localStorage, the URL, and broadcasts the event', () => {
    const received: NetlabAudience[] = [];
    const handler = (e: Event) => received.push((e as CustomEvent<NetlabAudience>).detail);
    window.addEventListener('netlab:audience', handler);

    render(<AudiencePill />);
    click(radio('learner'));

    expect(window.localStorage.getItem('netlab-audience')).toBe('learner');
    expect(new URLSearchParams(window.location.search).get('audience')).toBe('learner');
    expect(received).toContain('learner');

    window.removeEventListener('netlab:audience', handler);
  });

  it('useAudience subscribes to the broadcast and reflows live', () => {
    let observed: NetlabAudience | null = null;
    function Probe() {
      observed = useAudience();
      return null;
    }
    render(
      <>
        <AudiencePill />
        <Probe />
      </>,
    );
    expect(observed).toBe('pro');
    click(radio('learner'));
    expect(observed).toBe('learner');
  });
});
