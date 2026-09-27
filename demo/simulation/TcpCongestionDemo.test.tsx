import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TcpCongestionDemo, { runCongestionScenario } from './TcpCongestionDemo';

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
});
