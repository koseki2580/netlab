import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TcpCongestionPanel } from '../../src/components/simulation/TcpCongestionPanel';
import { GalleryLocaleProvider, type GalleryLocale } from '../localeContext';
import TcpCongestionDemo, {
  TcpCongestionDemoInner,
  congestionWorkingText,
  runCongestionScenario,
  runCongestionTrace,
} from './TcpCongestionDemo';

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

  // TC-280, TC-281, TC-282 — each loss event's new threshold is worked out on
  // the page with the trace's own numbers.
  // TC-312 — the rule is RFC 5681 equation (4): half the flight size, never
  // less than two segments. cwnd is not part of it, so the working does not
  // name it.
  describe('the working behind each change of threshold', () => {
    const en = (english: string) => english;
    const ja = (_english: string, japanese: string) => japanese;
    const at = (step: number) => {
      const working = runCongestionTrace().working.find((entry) => entry.stepIndex === step);
      if (!working) throw new Error(`no working at step ${step}`);
      return working;
    };

    it('has working at steps 9, 10 and 12 only', () => {
      expect(runCongestionTrace().working.map((entry) => entry.stepIndex)).toEqual([9, 10, 12]);
    });

    it('works out ssthresh and cwnd at the fast retransmit, step 9', () => {
      expect(congestionWorkingText(at(9), en)).toBe(
        'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(4000 ÷ 2, 2 × 1000) = max(2000, 2000) = 2000 B. cwnd = ssthresh + 3 × MSS = 2000 + 3 × 1000 = 5000 B.',
      );
      expect(congestionWorkingText(at(9), ja)).toBe(
        'ssthresh = max(送信中 ÷ 2, 2 × MSS) = max(4000 ÷ 2, 2 × 1000) = max(2000, 2000) = 2000 B。cwnd = ssthresh + 3 × MSS = 2000 + 3 × 1000 = 5000 B。',
      );
    });

    it('says cwnd deflates to ssthresh at the new ACK, step 10', () => {
      expect(congestionWorkingText(at(10), en)).toBe(
        'The new ACK ends fast recovery: cwnd deflates to ssthresh = 2000 B.',
      );
      expect(congestionWorkingText(at(10), ja)).toBe(
        '新しい ACK で高速リカバリが終わり、cwnd は ssthresh と同じ 2000 B に戻ります。',
      );
    });

    it('works out the unchanged ssthresh and the one-MSS cwnd at the RTO, step 12', () => {
      expect(congestionWorkingText(at(12), en)).toBe(
        'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(2000 ÷ 2, 2 × 1000) = max(1000, 2000) = 2000 B, so it does not change. cwnd = 1 × MSS = 1000 B.',
      );
      expect(congestionWorkingText(at(12), ja)).toBe(
        'ssthresh = max(送信中 ÷ 2, 2 × MSS) = max(2000 ÷ 2, 2 × 1000) = max(1000, 2000) = 2000 B で、変わりません。cwnd = 1 × MSS = 1000 B。',
      );
    });
    // TC-312 — the numbers are the trace's: a sender with a wide window and
    // little outstanding halves what is outstanding, not the window.
    it('halves the bytes in flight, not cwnd, when the two differ', () => {
      expect(
        congestionWorkingText(
          {
            stepIndex: 4,
            kind: 'fast-retransmit',
            mss: 1000,
            inflightBefore: 6000,
            ssthreshBefore: 64000,
            ssthresh: 3000,
            cwnd: 6000,
          },
          en,
        ),
      ).toBe(
        'ssthresh = max(in flight ÷ 2, 2 × MSS) = max(6000 ÷ 2, 2 × 1000) = max(3000, 2000) = 3000 B. cwnd = ssthresh + 3 × MSS = 3000 + 3 × 1000 = 6000 B.',
      );
    });

    it('takes the flight size at both loss events from the trace, where it equals cwnd', () => {
      expect(at(9)).toMatchObject({ inflightBefore: 4000, ssthresh: 2000, cwnd: 5000 });
      expect(at(12)).toMatchObject({ inflightBefore: 2000, ssthresh: 2000, cwnd: 1000 });
    });
  });

  // TC-313 — the trace starts from ssthresh 4000 B and a two-segment window.
  // Neither is what a real stack starts from, and the lesson says so.
  describe('the starting values', () => {
    const textIn = (locale: GalleryLocale) =>
      renderToStaticMarkup(
        <GalleryLocaleProvider locale={locale}>
          <TcpCongestionDemoInner />
        </GalleryLocaleProvider>,
      ).replace(/<[^>]+>/g, '');

    it('are labelled as the lesson’s choice, beside what real stacks use', () => {
      expect(textIn('en')).toContain(
        'These two starting values are chosen small here so that the whole trace fits on the chart: real stacks start with ssthresh effectively unbounded (RFC 5681 says to set it arbitrarily high) and, since RFC 6928, an initial window of up to 10 segments.',
      );
    });

    it('are labelled the same way in Japanese', () => {
      expect(textIn('ja')).toContain(
        'この 2 つの初期値は、トレース全体がグラフに収まるように、ここではあえて小さくしてあります。実際の TCP 実装では、ssthresh の初期値は事実上無制限で (RFC 5681 は任意に大きな値にするよう定めています)、初期ウィンドウは RFC 6928 以降、最大 10 セグメントです。',
      );
    });
  });
});
