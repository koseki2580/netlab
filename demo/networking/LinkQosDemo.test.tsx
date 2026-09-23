import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LinkQosDemo, { burstOutcome, shaperFromDrafts } from './LinkQosDemo';

describe('LinkQosDemo', () => {
  it('renders the QoS demo shell and controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LinkQosDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Per-Link QoS');
    expect(html).toContain('Send QoS burst');
    expect(html).toContain('LINK QOS');
  });
});

const en = (english: string) => english;

describe('LinkQosDemo labelled class fields', () => {
  const ef = { name: 'ef', weight: '80', queue: '8', dscp: '46', isDefault: false };
  const be = { name: 'be', weight: '20', queue: '8', dscp: '', isDefault: true };

  it('builds the shaper the text grammar described from the fields', () => {
    expect(shaperFromDrafts([ef, be], en)).toEqual({
      shaper: {
        classes: [
          { id: 'ef', weightPct: 80, queueDepthSegments: 8, dscp: [46] },
          { id: 'be', weightPct: 20, queueDepthSegments: 8, dscp: [], default: true },
        ],
      },
    });
  });

  it('says in words why a set of classes cannot be applied', () => {
    expect(shaperFromDrafts([{ ...ef, weight: '70' }, be], en)).toEqual({
      error: 'Weights add up to 90; make them 100.',
    });
    expect(shaperFromDrafts([ef, { ...be, isDefault: false }], en)).toEqual({
      error: 'Choose exactly one default class.',
    });
    expect(shaperFromDrafts([ef, { ...be, dscp: '46' }], en)).toEqual({
      error: 'DSCP 46 is in more than one class.',
    });
  });
});

describe('LinkQosDemo burst result', () => {
  const base = { packetId: 'p', srcNodeId: 'client-1', dstNodeId: 'server-1' };
  const hop = (action: string, linkQos: Record<string, unknown>) =>
    ({
      step: 0,
      nodeId: 'r2',
      nodeLabel: 'R2',
      srcIp: '10.0.0.10',
      dstIp: '10.0.4.10',
      ttl: 64,
      protocol: 'UDP',
      event: 'forward',
      action,
      linkQos: { edgeId: 'e-r2-r3', segSeq: 1, queueDepth: 0, ...linkQos },
      timestamp: 0,
    }) as never;

  it('reports the time to cross the link for a delivered packet', () => {
    expect(
      burstOutcome(
        { ...base, status: 'delivered', hops: [hop('link:arrived', { totalLatencySteps: 32 })] },
        en,
      ),
    ).toBe('Delivered — 32 ms to cross the link.');
  });

  it('names random loss as the reason a packet was dropped', () => {
    expect(
      burstOutcome(
        { ...base, status: 'dropped', hops: [hop('link:dropped', { reason: 'loss' })] },
        en,
      ),
    ).toBe('Dropped on the link by random loss.');
  });
});
