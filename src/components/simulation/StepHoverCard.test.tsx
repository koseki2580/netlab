/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  computeCardPosition,
  resolveStepPreview,
  StepHoverCard,
  type StepPreviewData,
} from './StepHoverCard';
import type { PacketHop } from '../../types/simulation';

function hop(partial: Partial<PacketHop>): PacketHop {
  return {
    step: 0,
    nodeId: 'n1',
    nodeLabel: 'R1',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 'ICMP',
    event: 'forward',
    ...partial,
  } as PacketHop;
}

describe('computeCardPosition', () => {
  const bounds = { left: 0, right: 1000 };

  it('centers the card above the anchor', () => {
    const pos = computeCardPosition({ left: 500, top: 200, width: 12 }, 240, 80, bounds);
    expect(pos.left).toBe(506 - 120); // anchor center 506, minus half card width
    expect(pos.top).toBe(200 - 80 - 14);
    expect(pos.arrow).toBe(120);
  });

  it('clamps to the right edge and keeps the arrow on the anchor', () => {
    const pos = computeCardPosition({ left: 980, top: 200, width: 12 }, 240, 80, bounds);
    expect(pos.left).toBe(1000 - 8 - 240);
    // arrow still points at the anchor center (986) relative to the shifted card
    expect(pos.arrow).toBe(986 - pos.left);
  });

  it('clamps to the left edge', () => {
    const pos = computeCardPosition({ left: 4, top: 200, width: 12 }, 240, 80, bounds);
    expect(pos.left).toBe(8);
  });
});

describe('resolveStepPreview', () => {
  it('maps a forward hop to label + description + delta', () => {
    const p = resolveStepPreview(hop({ step: 3, event: 'forward', nodeLabel: 'R1', ttl: 63 }));
    expect(p.index).toBe(3);
    expect(p.label).toBe('forwarded');
    expect(p.description).toContain('R1');
    expect(p.delta).toContain('ICMP');
    expect(p.delta).toContain('ttl 63');
    expect(p.marker?.shape).toBe('circle');
  });

  it('surfaces the drop reason', () => {
    const p = resolveStepPreview(hop({ event: 'drop', reason: 'no-route', nodeLabel: 'R2' }));
    expect(p.label).toBe('dropped');
    expect(p.description).toContain('no-route');
  });

  it('describes ARP without ttl/protocol pills', () => {
    const p = resolveStepPreview(hop({ event: 'arp-request', dstIp: '10.0.0.9' }));
    expect(p.description).toContain('who-has 10.0.0.9');
    expect(p.delta ?? []).not.toContain('ttl 64');
  });
});

describe('StepHoverCard', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  const STEP: StepPreviewData = {
    index: 3,
    marker: { shape: 'circle', color: 'var(--netlab-accent-green)' },
    label: 'forwarded',
    description: 'forwarded via R1',
    delta: ['ICMP', 'ttl 63'],
  };

  beforeEach(() => {
    env.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
    env.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('renders the step number, label, description, and delta pills', () => {
    act(() =>
      root?.render(<StepHoverCard step={STEP} anchorRect={{ left: 100, top: 200, width: 12 }} />),
    );
    const card = container?.querySelector('[data-testid="step-hover-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('04'); // 0-indexed 3 → "04"
    expect(card?.textContent).toContain('forwarded');
    expect(card?.textContent).toContain('forwarded via R1');
    expect(card?.textContent).toContain('ICMP');
    expect(card?.textContent).toContain('ttl 63');
  });
});
