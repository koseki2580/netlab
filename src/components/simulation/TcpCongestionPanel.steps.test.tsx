/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TcpCongestionEvent } from '../../types/tcp-congestion';
import { TcpCongestionPanel } from './TcpCongestionPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The congestion lesson's trace, in the order the sender emits it: segments
// 5001 and 6001 are labelled step 6 but are logged after the step-7 and step-8
// duplicate ACKs.
const TRACE: readonly TcpCongestionEvent[] = [
  { type: 'segment-sent', seq: 1001, bytes: 1000, stepIndex: 1 },
  { type: 'ack-received', ackNo: 2001, rttMs: 100, stepIndex: 2 },
  { type: 'cwnd-update', prev: 2000, next: 3000, reason: 'ss-increment', stepIndex: 2 },
  { type: 'segment-sent', seq: 2001, bytes: 1000, stepIndex: 3 },
  { type: 'ack-received', ackNo: 3001, rttMs: 100, stepIndex: 4 },
  { type: 'phase-change', from: 'slow-start', to: 'congestion-avoidance', stepIndex: 4 },
  { type: 'cwnd-update', prev: 3000, next: 4000, reason: 'ss-increment', stepIndex: 4 },
  { type: 'segment-sent', seq: 3001, bytes: 1000, stepIndex: 5 },
  { type: 'segment-sent', seq: 4001, bytes: 1000, stepIndex: 6 },
  { type: 'dup-ack', ackNo: 3001, count: 1, stepIndex: 7 },
  { type: 'segment-sent', seq: 5001, bytes: 1000, stepIndex: 6 },
  { type: 'dup-ack', ackNo: 3001, count: 2, stepIndex: 8 },
  { type: 'segment-sent', seq: 6001, bytes: 1000, stepIndex: 6 },
  { type: 'dup-ack', ackNo: 3001, count: 3, stepIndex: 9 },
  { type: 'phase-change', from: 'congestion-avoidance', to: 'fast-recovery', stepIndex: 9 },
  { type: 'cwnd-update', prev: 4000, next: 5000, reason: 'fast-retransmit', stepIndex: 9 },
  { type: 'fast-retransmit', seq: 3001, stepIndex: 9 },
  { type: 'ack-received', ackNo: 7001, rttMs: 120, stepIndex: 10 },
  { type: 'phase-change', from: 'fast-recovery', to: 'congestion-avoidance', stepIndex: 10 },
  { type: 'cwnd-update', prev: 5000, next: 2000, reason: 'fast-recovery-deflate', stepIndex: 10 },
  { type: 'segment-sent', seq: 9001, bytes: 1000, stepIndex: 11 },
  { type: 'segment-sent', seq: 10001, bytes: 1000, stepIndex: 11 },
  { type: 'phase-change', from: 'congestion-avoidance', to: 'rto', stepIndex: 12 },
  { type: 'cwnd-update', prev: 2000, next: 1000, reason: 'rto-reset', stepIndex: 12 },
  { type: 'rto-fire', seq: 9001, stepIndex: 12 },
];

const SSTHRESH = [
  { stepIndex: 0, ssthresh: 4000 },
  { stepIndex: 9, ssthresh: 2000 },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(): void {
  act(() => {
    root.render(<TcpCongestionPanel events={TRACE} ssthreshByStep={SSTHRESH} />);
  });
}

function chart(): SVGSVGElement {
  const svg = container.querySelector<SVGSVGElement>('[data-testid="tcp-congestion-chart"]');
  if (!svg) throw new Error('chart missing');
  return svg;
}

/** The y of the y-axis tick labelled `bytes`. */
function tickY(bytes: number): number {
  const tick = [...chart().querySelectorAll('[data-testid="tcp-congestion-ytick"]')].find(
    (node) => node.textContent === String(bytes),
  );
  if (!tick) throw new Error(`no tick labelled ${bytes}`);
  return Number(tick.getAttribute('y'));
}

/** Points of a line, as [x, y] pairs, in drawing order. */
function linePoints(testId: string): [number, number][] {
  const line = chart().querySelector(`[data-testid="${testId}"]`);
  const raw = line?.getAttribute('points') ?? '';
  return raw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number) as [number, number]);
}

function readout(): string {
  return container.querySelector('[data-testid="tcp-congestion-readout"]')?.textContent ?? '';
}

function selectStep(step: number): void {
  const slider = container.querySelector<HTMLInputElement>('[data-testid="tcp-congestion-step"]');
  if (!slider) throw new Error('step slider missing');
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(slider, String(step));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('TcpCongestionPanel on the lesson trace', () => {
  // TC-219 — the chart has labelled byte ticks, the window starts at its real
  // 2000 bytes rather than at zero, and every line moves forward in step order.
  it('labels the byte axis and starts cwnd at its initial window', () => {
    mount();

    for (const bytes of [0, 1000, 2000, 3000, 4000, 5000]) {
      expect(tickY(bytes), `tick ${bytes}`).toBeGreaterThan(0);
    }
    const cwnd = linePoints('tcp-congestion-cwnd-line');
    expect(cwnd[0]?.[1], 'the cwnd line starts at the 2000-byte tick').toBeCloseTo(tickY(2000), 0);
    expect(cwnd[0]?.[1]).not.toBeCloseTo(tickY(0), 0);
  });

  it('draws the cwnd and in-flight lines in step order', () => {
    mount();

    for (const testId of ['tcp-congestion-cwnd-line', 'tcp-congestion-inflight-line']) {
      const xs = linePoints(testId).map(([x]) => x);
      for (let index = 1; index < xs.length; index += 1) {
        expect(xs[index], `${testId} point ${index}`).toBeGreaterThanOrEqual(xs[index - 1] ?? 0);
      }
    }
    // All four segments of the step-5/6 burst are out by step 6.
    const inflight = linePoints('tcp-congestion-inflight-line');
    const cwnd = linePoints('tcp-congestion-cwnd-line');
    const step6 = inflight[6];
    expect(step6?.[1]).toBeCloseTo(tickY(4000), 0);
    expect(cwnd[6]?.[1]).toBeCloseTo(tickY(4000), 0);
  });

  it('gives each point its cwnd and ssthresh in bytes', () => {
    mount();

    const titles = [
      ...chart().querySelectorAll('[data-testid^="tcp-congestion-point-"] title'),
    ].map((node) => node.textContent);
    expect(titles[0]).toContain('cwnd 2000 B');
    expect(titles[0]).toContain('ssthresh 4000 B');
    expect(titles[9]).toContain('cwnd 5000 B');
    expect(titles[9]).toContain('ssthresh 2000 B');
  });

  // TC-220 — the learner moves through the steps and the header reads the
  // state at the step shown, not only the final one.
  it('updates the header readout as the step is moved', () => {
    mount();

    expect(readout()).toContain('RTO');
    expect(readout()).toContain('1000 B');
    // TC-256 — the timer firing acknowledges nothing: both step-11 segments
    // are still out.
    expect(readout()).toContain('in flight 2000 B');

    selectStep(0);
    expect(readout()).toContain('Step 0');
    expect(readout()).toContain('Slow Start');
    expect(readout()).toContain('cwnd 2000 B');
    expect(readout()).toContain('ssthresh 4000 B');

    selectStep(9);
    expect(readout()).toContain('Fast Recovery');
    expect(readout()).toContain('cwnd 5000 B');
    expect(readout()).toContain('ssthresh 2000 B');

    const marker = chart().querySelector('[data-testid="tcp-congestion-marker"]');
    const cwnd = linePoints('tcp-congestion-cwnd-line');
    expect(Number(marker?.getAttribute('x1'))).toBeCloseTo(cwnd[9]?.[0] ?? -1, 0);
  });

  // TC-221 — the event list reads in words, not in the trace's identifiers.
  it('names the events in words', () => {
    mount();

    const list = container.querySelector('[data-testid="tcp-congestion-event-9-fast-retransmit"]');
    expect(list?.textContent).toContain('Fast retransmit');
    const rto = container.querySelector('[data-testid="tcp-congestion-event-12-rto-fire"]');
    expect(rto?.textContent).toContain('Retransmission timeout');
    const phase = container.querySelector('[data-testid="tcp-congestion-event-4-phase-change"]');
    expect(phase?.textContent).toContain('Congestion Avoidance');
    const visible = container.textContent ?? '';
    for (const raw of ['phase-change', 'fast-retransmit', 'rto-fire', '`']) {
      expect(visible, raw).not.toContain(raw);
    }
  });
});
