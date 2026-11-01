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

  // TC-312 — RFC 5681 equation (4): ssthresh = max(FlightSize / 2, 2 * SMSS).
  // FlightSize is the data outstanding; cwnd is not part of it, so a sender
  // that has not filled its window gets the lower threshold.
  describe('the threshold a loss sets, for a sender whose flight size is below cwnd', () => {
    const senderWith = (outstandingBytes: number) => {
      const control = new TcpCongestionControl({ mss: 1000, iwSegments: 8 });
      for (let sent = 0; sent < outstandingBytes; sent += 1000) {
        control.onSegmentSent(1001 + sent, 1000, 1);
      }
      expect(control.state.cwnd).toBe(8000);
      expect(control.state.inflight).toBe(outstandingBytes);
      return control;
    };
    const thirdDupAck = (control: TcpCongestionControl) => {
      control.onDupAck(1001, 2);
      control.onDupAck(1001, 3);
      control.onDupAck(1001, 4);
    };

    it.each([
      [3000, 2000],
      [6000, 3000],
      [0, 2000],
    ])('on three duplicate ACKs with %i B outstanding sets ssthresh %i B', (outstanding, want) => {
      const control = senderWith(outstanding);

      thirdDupAck(control);

      expect(control.state.phase).toBe('fast-recovery');
      expect(control.state.ssthresh).toBe(want);
      expect(control.state.cwnd).toBe(want + 3000);
    });

    it.each([
      [3000, 2000],
      [6000, 3000],
      [0, 2000],
    ])('on a timeout with %i B outstanding sets ssthresh %i B', (outstanding, want) => {
      const control = senderWith(outstanding);

      control.onRto(1001, 2);

      expect(control.state.phase).toBe('rto');
      expect(control.state.ssthresh).toBe(want);
      expect(control.state.cwnd).toBe(1000);
    });
  });
});

/** A sender whose window has `segments` full segments in flight, each acknowledged in turn. */
function sendAndAck(
  control: TcpCongestionControl,
  firstSeq: number,
  segments: number,
  mss: number,
) {
  for (let i = 0; i < segments; i += 1) control.onSegmentSent(firstSeq + i * mss, mss, i);
  for (let i = 0; i < segments; i += 1) control.onAckReceived(firstSeq + (i + 1) * mss, 100, i);
}

// TC-1040 — regression: congestion avoidance grew cwnd by a whole MSS per ACK,
// the same as slow start. RFC 5681 §3.1: cwnd += SMSS*SMSS/cwnd per ACK (at
// least one byte), about one SMSS per round trip.
describe('congestion avoidance grows about one MSS per round trip (TC-1040)', () => {
  it('adds MSS*MSS/cwnd for one ACK', () => {
    const control = new TcpCongestionControl({ mss: 1000, iwSegments: 4, initialSsthresh: 4000 });
    expect(control.state.phase).toBe('congestion-avoidance');
    control.onSegmentSent(1, 1000, 1);
    control.onAckReceived(1001, 100, 2);
    expect(control.state.cwnd).toBe(4250);
  });

  it('adds about one MSS over a round trip of ACKs', () => {
    const control = new TcpCongestionControl({ mss: 1000, iwSegments: 4, initialSsthresh: 4000 });
    sendAndAck(control, 1, 4, 1000);
    expect(control.state.cwnd).toBeGreaterThanOrEqual(4800);
    expect(control.state.cwnd).toBeLessThanOrEqual(5000);
  });

  it('never adds less than one byte', () => {
    const control = new TcpCongestionControl({ mss: 10, iwSegments: 200, initialSsthresh: 10 });
    control.onSegmentSent(1, 10, 1);
    control.onAckReceived(11, 100, 2);
    expect(control.state.cwnd).toBe(2001);
  });
});

// TC-1041 — regression: slow start added a whole MSS for any new ACK. RFC 5681
// §3.1: cwnd += min(N, SMSS), N the bytes the ACK newly acknowledges.
describe('slow start grows by the bytes an ACK acknowledges, up to one MSS (TC-1041)', () => {
  it('adds 500 for an ACK of 500 bytes', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 64000 });
    control.onSegmentSent(1, 500, 1);
    control.onAckReceived(501, 100, 2);
    expect(control.state.cwnd).toBe(1500);
  });

  it('adds nothing for an ACK that acknowledges no new bytes', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 64000 });
    control.onAckReceived(1, 100, 1);
    expect(control.state.cwnd).toBe(1000);
  });

  it('adds one MSS for an ACK that covers two segments', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 64000 });
    control.onSegmentSent(1, 1000, 1);
    control.onSegmentSent(1001, 1000, 2);
    control.onAckReceived(2001, 100, 3);
    expect(control.state.cwnd).toBe(2000);
  });
});

// TC-1042 — regression: after a retransmission timeout the phase stayed "rto"
// and no ACK ever grew cwnd again. RFC 5681 §3.1: the sender slow-starts from
// one segment up to the new ssthresh, then avoids congestion.
describe('after a timeout the sender slow-starts again (TC-1042)', () => {
  it('grows from one MSS by slow start, then switches at the new ssthresh', () => {
    const control = new TcpCongestionControl({ mss: 1000, initialSsthresh: 64000 });
    for (let i = 0; i < 4; i += 1) control.onSegmentSent(1 + i * 1000, 1000, i);
    control.onRto(1, 5);
    expect(control.state).toMatchObject({ cwnd: 1000, ssthresh: 2000 });

    // Slow start: one whole MSS, which brings cwnd up to the new ssthresh.
    control.onAckReceived(1001, 100, 6);
    expect(control.state).toMatchObject({ phase: 'congestion-avoidance', cwnd: 2000 });
    // Congestion avoidance from there: 1000 × 1000 / 2000 = 500.
    control.onAckReceived(2001, 100, 7);
    expect(control.state.cwnd).toBe(2500);
  });
});
