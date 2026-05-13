import { describe, expect, it } from 'vitest';
import { TcpCongestionControl } from './TcpCongestionControl';

describe('TcpCongestionControl', () => {
  it('starts in slow start with IW = 1 MSS', () => {
    const control = new TcpCongestionControl({ mss: 1000 });

    expect(control.state).toMatchObject({
      phase: 'slow-start',
      cwnd: 1000,
      ssthresh: 64000,
      inflight: 0,
    });
  });

  it('records sent segments and reports remaining send allowance', () => {
    const control = new TcpCongestionControl({ mss: 1000 });

    control.onSegmentSent(1, 400, 1);

    expect(control.state.inflight).toBe(400);
    expect(control.allowedBytesToSend()).toBe(600);
    expect(control.events[control.events.length - 1]).toMatchObject({
      type: 'segment-sent',
      seq: 1,
    });
  });

  it('honors the receiver window', () => {
    const control = new TcpCongestionControl({ mss: 1000 });

    control.setRwnd(300);

    expect(control.allowedBytesToSend()).toBe(300);
  });

  it('increases cwnd by MSS during slow start when an ACK arrives', () => {
    const control = new TcpCongestionControl({ mss: 1000 });
    control.onSegmentSent(1, 1000, 1);

    control.onAckReceived(1001, 100, 2);

    expect(control.state.cwnd).toBe(2000);
    expect(control.state.inflight).toBe(0);
    expect(control.events.some((event) => event.type === 'cwnd-update')).toBe(true);
  });

  it('enters congestion avoidance at ssthresh', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 2000 });
    control.onSegmentSent(1, 1000, 1);

    control.onAckReceived(1001, 100, 2);

    expect(control.state.phase).toBe('congestion-avoidance');
    const phaseChangeIndex = control.events.findIndex((event) => event.type === 'phase-change');
    const cwndUpdateIndex = control.events.findIndex((event) => event.type === 'cwnd-update');
    expect(phaseChangeIndex).toBeLessThan(cwndUpdateIndex);
  });

  it('uses additive increase in congestion avoidance', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 1000 });

    control.onAckReceived(1001, 100, 1);

    expect(control.state.cwnd).toBe(2000);
    expect(control.state.phase).toBe('congestion-avoidance');
  });

  it('counts duplicate ACKs', () => {
    const control = new TcpCongestionControl({ mss: 1000 });

    control.onDupAck(1001, 1);
    control.onDupAck(1001, 2);

    expect(control.state.dupAckCount).toBe(2);
  });

  it('fires fast retransmit on the third duplicate ACK', () => {
    const control = new TcpCongestionControl({ mss: 1000 });
    control.onSegmentSent(1001, 4000, 1);

    control.onDupAck(1001, 2);
    control.onDupAck(1001, 3);
    control.onDupAck(1001, 4);

    expect(control.state.phase).toBe('fast-recovery');
    expect(control.events.filter((event) => event.type === 'fast-retransmit')).toHaveLength(1);
  });

  it('inflates cwnd on duplicate ACKs during fast recovery', () => {
    const control = new TcpCongestionControl({ mss: 1000 });
    control.onSegmentSent(1001, 4000, 1);
    control.onDupAck(1001, 2);
    control.onDupAck(1001, 3);
    control.onDupAck(1001, 4);
    const afterFastRetransmit = control.state.cwnd;

    control.onDupAck(1001, 5);

    expect(control.state.cwnd).toBe(afterFastRetransmit + 1000);
  });

  it('deflates cwnd when recovery ACK arrives', () => {
    const control = new TcpCongestionControl({ mss: 1000 });
    control.onSegmentSent(1001, 4000, 1);
    control.onDupAck(1001, 2);
    control.onDupAck(1001, 3);
    control.onDupAck(1001, 4);

    control.onAckReceived(5001, 100, 5);

    expect(control.state.phase).toBe('congestion-avoidance');
    expect(control.state.cwnd).toBe(control.state.ssthresh);
  });

  it('resets cwnd on RTO and preserves ssthresh floor', () => {
    const control = new TcpCongestionControl({ mss: 1000 });
    control.onSegmentSent(1001, 9000, 1);

    control.onRto(1001, 20);

    expect(control.state.phase).toBe('rto');
    expect(control.state.cwnd).toBe(1000);
    expect(control.state.ssthresh).toBeGreaterThanOrEqual(2000);
    expect(control.events[control.events.length - 1]).toMatchObject({
      type: 'rto-fire',
      seq: 1001,
    });
  });
});
