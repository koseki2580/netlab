/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Scenario } from '../scenarios/types';
import { getRecommendedNext, NextScenarioRail } from './NextScenarioRail';

/** Minimal Scenario stub — only the fields getRecommendedNext reads. */
function scenario(
  id: string,
  difficulty: Scenario['metadata']['difficulty'],
  opts: { topologyGroup?: string; protocols?: string[] } = {},
): Scenario {
  return {
    metadata: {
      id,
      title: id,
      summary: '',
      objective: '',
      difficulty,
      protocols: opts.protocols ?? [],
      prerequisiteIds: [],
    },
    ...(opts.topologyGroup ? { topologyGroup: opts.topologyGroup } : {}),
  } as unknown as Scenario;
}

const OSPF = scenario('ospf-convergence', 'advanced', {
  topologyGroup: 'convergence-4router',
  protocols: ['ospf'],
});
const RIP = scenario('rip-convergence', 'advanced', {
  topologyGroup: 'convergence-4router',
  protocols: ['rip'],
});
const TCP = scenario('tcp-handshake', 'core', { protocols: ['tcp'] });
const ARP = scenario('basic-arp', 'intro', { protocols: ['arp'] });

describe('getRecommendedNext', () => {
  it('prefers a same-topology-group sibling first', () => {
    const next = getRecommendedNext(OSPF, [OSPF, RIP, TCP, ARP]);
    expect(next[0]?.metadata.id).toBe('rip-convergence');
  });

  it('always excludes the current scenario', () => {
    const next = getRecommendedNext(OSPF, [OSPF, RIP, TCP, ARP]);
    expect(next.map((s) => s.metadata.id)).not.toContain('ospf-convergence');
  });

  it('falls back to same difficulty when no topology-group sibling exists', () => {
    const core = scenario('stp-loop', 'core', { protocols: ['stp'] });
    const next = getRecommendedNext(TCP, [TCP, core, ARP]);
    // stp-loop shares difficulty 'core' with tcp-handshake; arp is 'intro'.
    expect(next[0]?.metadata.id).toBe('stp-loop');
  });

  it('does not duplicate a scenario that matches multiple tiers', () => {
    const next = getRecommendedNext(OSPF, [OSPF, RIP, TCP, ARP]);
    const ids = next.map((s) => s.metadata.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('caps the result at the requested limit', () => {
    const next = getRecommendedNext(OSPF, [OSPF, RIP, TCP, ARP], 2);
    expect(next).toHaveLength(2);
  });
});

describe('NextScenarioRail (render)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  function render(ui: React.ReactElement) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root?.render(ui));
  }

  it('renders nothing when there are no recommendations', () => {
    render(<NextScenarioRail next={[]} onOpen={() => {}} />);
    expect(container?.querySelector('[data-testid="next-scenario-rail"]')).toBeNull();
  });

  it('renders a focusable button per scenario and opens on click', () => {
    const onOpen = vi.fn();
    render(<NextScenarioRail next={[RIP, TCP]} onOpen={onOpen} />);

    const cards = container?.querySelectorAll('button[role="listitem"]');
    expect(cards?.length).toBe(2);
    expect(container?.textContent).toContain('up next');

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[data-testid="next-scenario-rip-convergence"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpen).toHaveBeenCalledWith('rip-convergence');
  });
});
