import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TcpCongestionEvent } from '../../types/tcp-congestion';
import { TcpCongestionPanel } from './TcpCongestionPanel';

function render(events: readonly TcpCongestionEvent[]): string {
  return renderToStaticMarkup(<TcpCongestionPanel events={events} />);
}

describe('TcpCongestionPanel', () => {
  it('renders an empty state', () => {
    const html = render([]);

    expect(html).toContain('TCP CONGESTION');
    expect(html).toContain('No congestion events');
  });

  it('renders a slow-start trajectory', () => {
    const html = render([
      { type: 'cwnd-update', prev: 1460, next: 2920, reason: 'ss-increment', stepIndex: 1 },
      { type: 'cwnd-update', prev: 2920, next: 4380, reason: 'ss-increment', stepIndex: 2 },
    ]);

    expect(html).toContain('Slow Start');
    expect(html).toContain('cwnd');
    expect(html).toContain('4380 B');
  });

  it('renders congestion avoidance phase markers', () => {
    const html = render([
      {
        type: 'phase-change',
        from: 'slow-start',
        to: 'congestion-avoidance',
        stepIndex: 3,
      },
      { type: 'cwnd-update', prev: 4380, next: 5840, reason: 'ca-increment', stepIndex: 3 },
    ]);

    expect(html).toContain('Congestion Avoidance');
  });

  it('renders fast recovery markers', () => {
    const html = render([
      { type: 'dup-ack', ackNo: 1001, count: 3, stepIndex: 4 },
      { type: 'phase-change', from: 'congestion-avoidance', to: 'fast-recovery', stepIndex: 4 },
      { type: 'fast-retransmit', seq: 1001, stepIndex: 4 },
    ]);

    expect(html).toContain('Fast Recovery');
    expect(html).toContain('fast-retransmit');
  });

  it('renders RTO reset markers', () => {
    const html = render([
      { type: 'phase-change', from: 'fast-recovery', to: 'rto', stepIndex: 8 },
      { type: 'cwnd-update', prev: 5840, next: 1460, reason: 'rto-reset', stepIndex: 8 },
      { type: 'rto-fire', seq: 1001, stepIndex: 8 },
    ]);

    expect(html).toContain('RTO');
    expect(html).toContain('rto-fire');
  });

  it('adds accessible SVG labels', () => {
    const html = render([
      { type: 'segment-sent', seq: 1001, bytes: 1460, stepIndex: 1 },
      { type: 'ack-received', ackNo: 2461, rttMs: 120, stepIndex: 2 },
    ]);

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="TCP congestion window timeline"');
    expect(html).toContain('<title>TCP congestion window timeline</title>');
  });
});
