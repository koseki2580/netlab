/* @vitest-environment jsdom */
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { stepsToTransmit } from '../../src/simulation/LinkQueue';
import type { LinkQosConfig } from '../../src/types/link';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import LinkQosDemo, {
  BURST_PACKET_BYTES,
  QosFields,
  burstSettings,
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

const LINK: LinkQosConfig = {
  bandwidthBps: 1_000_000,
  propagationDelayMs: 20,
  lossPct: 5,
  queueDepthSegments: 100,
  lossSeed: 42,
};

/** The fields as the lesson mounts them: re-read whenever the link changes. */
function Fields({ locale }: { locale: GalleryLocale }) {
  const [link, setLink] = useState(LINK);
  return (
    <GalleryLocaleProvider locale={locale}>
      <QosFields key={JSON.stringify(link)} link={link} onQosChange={setLink} />
    </GalleryLocaleProvider>
  );
}

function mountFields(locale: GalleryLocale = 'en') {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Fields locale={locale} />));
  const find = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const type = (id: string, value: string) => {
    const input = find(id) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const press = (id: string) => act(() => find(id)!.click());
  return { find, type, press };
}

describe('LinkQosDemo unapplied settings (TC-309, TC-311)', () => {
  it('TC-309: shows no marker while the fields match the link', () => {
    const { find } = mountFields();
    expect(find('link-qos-unapplied')).toBeNull();
    expect(find('link-qos-classes-unapplied')).toBeNull();
  });

  it('TC-309: marks an edited link field as not applied until it is applied', () => {
    const { find, type, press } = mountFields();
    type('link-qos-bandwidth', '400000');
    const marker = find('link-qos-unapplied')!;
    expect(marker.textContent).toBe('Not applied yet: the link still has the earlier settings.');
    expect(marker.getAttribute('role')).toBe('status');
    expect(find('link-qos-classes-unapplied')).toBeNull();

    press('link-qos-apply');
    expect(find('link-qos-unapplied')).toBeNull();
    expect((find('link-qos-bandwidth') as HTMLInputElement).value).toBe('400000');
  });

  it('TC-309: marks a change to the delay or the loss, and clears when it is put back', () => {
    const { find, type } = mountFields();
    type('link-qos-delay', '35');
    expect(find('link-qos-unapplied')).not.toBeNull();
    type('link-qos-delay', '20');
    expect(find('link-qos-unapplied')).toBeNull();
    type('link-qos-loss', '0');
    expect(find('link-qos-unapplied')).not.toBeNull();
  });

  it('TC-311: marks edited classes as not applied until they are applied', () => {
    const { find, type, press } = mountFields();
    type('link-qos-class-0-weight', '70');
    type('link-qos-class-1-weight', '30');
    const marker = find('link-qos-classes-unapplied')!;
    expect(marker.textContent).toBe('Not applied yet: the link still has the earlier classes.');
    expect(marker.getAttribute('role')).toBe('status');
    expect(find('link-qos-unapplied')).toBeNull();

    press('link-qos-apply-classes');
    expect(find('link-qos-classes-unapplied')).toBeNull();
    expect((find('link-qos-class-0-weight') as HTMLInputElement).value).toBe('70');
  });

  it('TC-309, TC-311: the markers are in Japanese for a Japanese learner', () => {
    const { find, type } = mountFields('ja');
    type('link-qos-bandwidth', '400000');
    type('link-qos-class-0-queue', '4');
    expect(find('link-qos-unapplied')!.textContent).toBe(
      '未適用: リンクはまだ前の設定のままです。',
    );
    expect(find('link-qos-classes-unapplied')!.textContent).toBe(
      '未適用: リンクはまだ前のクラスのままです。',
    );
  });
});

describe('LinkQosDemo settings a result was measured with (TC-310)', () => {
  const ja = (_english: string, japanese: string) => japanese;

  it('names the bandwidth, delay and loss on the link when the packet was sent', () => {
    expect(burstSettings(LINK, en)).toBe('Measured at 1,000,000 bps, 20 ms delay, 5% loss.');
    expect(burstSettings({ ...LINK, bandwidthBps: 400_000, lossPct: 0 }, en)).toBe(
      'Measured at 400,000 bps, 20 ms delay, 0% loss.',
    );
  });

  it('says the same in Japanese', () => {
    expect(burstSettings(LINK, ja)).toBe(
      '測定時の設定: 帯域 1,000,000 bps、伝搬遅延 20 ms、損失率 5%',
    );
  });
});
