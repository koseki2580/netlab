import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { stepsToTransmit } from '../../src/simulation/LinkQueue';
import LinkQosDemo, {
  BURST_PACKET_BYTES,
  burstBreakdown,
  burstOutcome,
  linkQosBrief,
  shaperFromDrafts,
} from './LinkQosDemo';

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

describe('LinkQosDemo latency breakdown (TC-261)', () => {
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
  const delivered = {
    ...base,
    status: 'delivered' as const,
    hops: [
      hop('link:dequeued', { txStartAtStep: 3, txEndAtStep: 15 }),
      hop('link:arrived', { totalLatencySteps: 32 }),
    ],
  };
  const ja = (_english: string, japanese: string) => japanese;

  it('splits the total into sending and propagation time', () => {
    expect(burstBreakdown(delivered, en)).toBe('sending 12 ms + propagation 20 ms = 32 ms');
    expect(burstBreakdown(delivered, ja)).toBe('送り出し 12 ms ＋ 伝搬 20 ms ＝ 32 ms');
  });

  it('leaves the total line as it was', () => {
    expect(burstOutcome(delivered, en)).toBe('Delivered — 32 ms to cross the link.');
  });

  it('gives no breakdown for a packet that never crossed the link', () => {
    expect(burstBreakdown(null, en)).toBeNull();
    expect(
      burstBreakdown(
        { ...base, status: 'dropped', hops: [hop('link:dropped', { reason: 'loss' })] },
        en,
      ),
    ).toBeNull();
  });
});

describe('LinkQosDemo brief (TC-290)', () => {
  const ja = (_english: string, japanese: string) => japanese;

  it('shows the brief on the page', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LinkQosDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('data-testid="lesson-brief"');
    expect(html).toContain('Sending time = packet size × 8 ÷ bandwidth');
  });

  it('says what the time on a link is made of, with the packet the lesson sends', () => {
    const brief = linkQosBrief(en).join(' ');

    expect(brief).toContain('the time to send its bits onto the wire (serialisation)');
    expect(brief).toContain('plus the link’s propagation delay');
    expect(brief).toContain('Sending time = packet size × 8 ÷ bandwidth');
    expect(brief).toContain('1500 × 8 = 12,000 bits');
    expect(brief).toContain('12,000 bits ÷ 1,000,000 bps = 12 ms');
    expect(brief).toContain('only after you press “Apply to the link”');
    expect(brief).toContain('IP packet only');
    expect(brief).toContain('preamble and an inter-frame gap');
    expect(brief).toContain('A packet with no competition is not slowed by a low weight');
  });

  it('says the same in Japanese', () => {
    const brief = linkQosBrief(ja).join(' ');

    expect(brief).toContain('送り出す時間（シリアル化）');
    expect(brief).toContain('伝搬遅延を足したもの');
    expect(brief).toContain('送り出し時間 ＝ パケットサイズ × 8 ÷ 帯域');
    expect(brief).toContain('1500 × 8 ＝ 12,000 ビット');
    expect(brief).toContain('12,000 ビット ÷ 1,000,000 bps ＝ 12 ms');
    expect(brief).toContain('「リンクに適用」を押して初めて');
    expect(brief).toContain('IP パケットだけ');
    expect(brief).toContain('プリアンブル、フレーム間ギャップ');
    expect(brief).toContain('重みが小さくても遅くなりません');
  });

  it('quotes the packet size and time the engine uses', () => {
    expect(BURST_PACKET_BYTES).toBe(1500);
    expect(stepsToTransmit(BURST_PACKET_BYTES, 1_000_000)).toBe(12);
    expect(stepsToTransmit(BURST_PACKET_BYTES, 400_000)).toBe(30);
  });
});
