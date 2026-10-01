import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TcpCongestionPanel } from '../../src/components/simulation/TcpCongestionPanel';
import TcpCongestionDemo, { runCongestionScenario, runCongestionTrace } from './TcpCongestionDemo';

describe('TcpCongestionDemo', () => {
  it('opens waiting to be run, rather than with the trace already drawn', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TcpCongestionDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('TCP Congestion Control');
    expect(html).toContain('TCP CONGESTION');
    // The walkthrough belongs to the run, not to the page load: the trace is
    // deterministic, so drawing it at mount left the run button with nothing
    // to change. `e2e/tcp-congestion.spec.ts` presses it and reads the chart.
    expect(html).toContain('tcp-congestion-empty');
    expect(html).not.toContain('rto-fire');
  });

  // TC-221 — the terms the chart uses are explained in words, and no raw
  // markdown backticks reach the learner.
  it('glosses cwnd, ssthresh, MSS and RTO in plain words', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TcpCongestionDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('congestion window');
    expect(html).toContain('slow-start threshold');
    expect(html).toContain('maximum segment size');
    expect(html).toContain('retransmission timeout');
    expect(html).not.toContain('`');
  });

  // TC-214 — the trace sent a fourth segment while cwnd was 3000, so a
  // learner who read the window off the chart was taught a sender no real
  // stack would be.
  it('never has more bytes in flight than cwnd allows', () => {
    const events = runCongestionScenario();
    const firstUpdate = events.find((event) => event.type === 'cwnd-update');
    let cwnd = firstUpdate?.type === 'cwnd-update' ? firstUpdate.prev : 0;
    let outstanding: { seq: number; bytes: number }[] = [];
    for (const event of events) {
      if (event.type === 'cwnd-update') cwnd = event.next;
      if (event.type === 'ack-received') {
        outstanding = outstanding.filter((segment) => segment.seq + segment.bytes > event.ackNo);
      }
      if (event.type === 'segment-sent') {
        outstanding.push({ seq: event.seq, bytes: event.bytes });
        const inFlight = outstanding.reduce((sum, segment) => sum + segment.bytes, 0);
        expect(
          inFlight,
          `after sending ${event.seq} at step ${event.stepIndex}`,
        ).toBeLessThanOrEqual(cwnd);
      }
    }
  });

  // TC-255 — step 11 sent one 2000-byte "segment" on a connection whose MSS
  // is 1000 bytes. A segment carries at most one MSS.
  it('never sends a segment larger than the 1000-byte MSS', () => {
    const sent = runCongestionScenario().filter((event) => event.type === 'segment-sent');
    for (const event of sent) {
      expect(event.bytes, `segment ${event.seq} at step ${event.stepIndex}`).toBeLessThanOrEqual(
        1000,
      );
    }
    expect(sent.filter((event) => event.stepIndex === 11)).toEqual([
      { type: 'segment-sent', seq: 9001, bytes: 1000, stepIndex: 11 },
      { type: 'segment-sent', seq: 10001, bytes: 1000, stepIndex: 11 },
    ]);
  });

  // TC-256 — the readout said "in flight 0 B" when the timer fired, although
  // the 2000 bytes sent at step 11 were still unacknowledged. A new trace
  // opens on its last step, the timeout.
  it('still counts the unacknowledged bytes as in flight when the RTO fires', () => {
    const run = runCongestionTrace();
    const text = renderToStaticMarkup(
      <TcpCongestionPanel events={run.events} ssthreshByStep={run.ssthreshByStep} />,
    ).replace(/<[^>]+>/g, '');

    expect(text).toContain('Step 12 of 12RTOcwnd 1000 Bssthresh 2000 Bin flight 2000 B');
    expect(text).toContain(
      'Step 11 · Congestion Avoidance · cwnd 2000 B · ssthresh 2000 B · in flight 2000 B',
    );
    // RFC 5681: what is resent is the oldest segment not yet acknowledged.
    expect(text).toContain('oldest unacknowledged segment, 9001');
  });
});
