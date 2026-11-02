import { describe, expect, it } from 'vitest';
import { TcpCongestionControl } from './TcpCongestionControl';
import {
  advertisedWindowField,
  negotiateTcpOptions,
  planTcpTransfer,
  synAckOptions,
  synOptions,
  usableWindow,
  type TcpTransferPlan,
  type TcpTransferStep,
} from './TcpFlowControl';

const inKind = (plan: TcpTransferPlan, kind: TcpTransferStep['kind']) =>
  plan.steps.filter((step) => step.kind === kind);

describe('the usable window', () => {
  it('TC-1050: is measured against min(cwnd, rwnd), whichever way it is asked', () => {
    expect(usableWindow({ cwnd: 10000, rwnd: 4000, inFlight: 3000 })).toBe(1000);
    const control = new TcpCongestionControl({ mss: 1000, iwSegments: 10 });
    control.setRwnd(4000);
    control.onSegmentSent(0, 3000, 0);
    expect(control.allowedBytesToSend()).toBe(1000);
  });

  it.each([
    ['cwnd is the smaller', { cwnd: 2000, rwnd: 8000, inFlight: 500 }, 1500],
    ['rwnd is the smaller', { cwnd: 8000, rwnd: 2000, inFlight: 500 }, 1500],
    ['full', { cwnd: 2000, rwnd: 8000, inFlight: 2000 }, 0],
    ['a window closed under data in flight', { cwnd: 8000, rwnd: 0, inFlight: 1000 }, 0],
  ])('TC-1051: %s', (_name, state, expected) => {
    expect(usableWindow(state)).toBe(expected);
  });
});

describe('a slow receiver', () => {
  const plan = planTcpTransfer({
    bytes: 8000,
    mss: 1000,
    receiveBuffer: 4000,
    readBytes: () => 500,
    maxRounds: 200,
  });

  it('TC-1052: the window falls and in flight never passes min(cwnd, rwnd)', () => {
    expect(plan.completed).toBe(true);
    expect(plan.delivered).toBe(8000);
    const windows = inKind(plan, 'ack').map((step) => step.window);
    expect(Math.min(...windows)).toBeLessThan(4000);
    for (const step of inKind(plan, 'data')) {
      expect(step.inFlight).toBeLessThanOrEqual(Math.min(step.cwnd, step.rwnd));
    }
  });
});

describe('an application that stops', () => {
  const stopped = planTcpTransfer({
    bytes: 8000,
    mss: 1000,
    receiveBuffer: 4000,
    readBytes: () => 0,
    maxRounds: 40,
  });

  it('TC-1053: data stops at the size of the buffer and the window reads 0', () => {
    expect(stopped.completed).toBe(false);
    expect(stopped.delivered).toBe(4000);
    expect(inKind(stopped, 'data').reduce((sum, step) => sum + step.length, 0)).toBe(4000);
    expect(inKind(stopped, 'ack').pop()?.window).toBe(0);
  });

  it('TC-1054: probes carry one byte at growing gaps, and are answered with 0', () => {
    const probes = inKind(stopped, 'probe');
    expect(probes.length).toBeGreaterThanOrEqual(3);
    expect(probes.every((probe) => probe.length === 1 && probe.seq === 4000)).toBe(true);
    const gaps = probes.slice(1).map((probe, index) => probe.round - probes[index]!.round);
    for (const [index, gap] of gaps.entries()) {
      if (index > 0) expect(gap).toBeGreaterThan(gaps[index - 1]!);
    }
    const answers = inKind(stopped, 'probe-ack');
    expect(answers).toHaveLength(probes.length);
    expect(answers.every((answer) => answer.window === 0 && answer.ack === 4000)).toBe(true);
  });

  it('TC-1055: an update restarts it from the byte it stopped at', () => {
    const resumed = planTcpTransfer({
      bytes: 8000,
      mss: 1000,
      receiveBuffer: 4000,
      readBytes: (round) => (round < 8 ? 0 : 1000),
      maxRounds: 80,
    });
    expect(resumed.completed).toBe(true);
    expect(resumed.delivered).toBe(8000);
    const update = resumed.steps.findIndex((step) => step.kind === 'window-update');
    expect(update).toBeGreaterThan(-1);
    expect(resumed.steps[update]?.window).toBeGreaterThan(0);
    const after = resumed.steps.slice(update).find((step) => step.kind === 'data');
    expect(after?.seq).toBe(4000);
    const data = inKind(resumed, 'data');
    expect(data.map((step) => step.seq)).toEqual(
      data.map((_step, index) => data.slice(0, index).reduce((sum, step) => sum + step.length, 0)),
    );
  });

  it('TC-1056: a little room freed does not open the window', () => {
    const plan = planTcpTransfer({
      bytes: 8000,
      mss: 1000,
      receiveBuffer: 4000,
      readBytes: (round) => (round === 6 ? 300 : 0),
      maxRounds: 30,
    });
    expect(inKind(plan, 'window-update')).toHaveLength(0);
  });

  it('TC-1057: a sender does not send a tiny segment while data is in flight', () => {
    const plan = planTcpTransfer({
      bytes: 8000,
      mss: 1000,
      receiveBuffer: 2500,
      readBytes: () => 2500,
      initialCwndSegments: 3,
      maxRounds: 60,
    });
    expect(plan.completed).toBe(true);
    const short = inKind(plan, 'data').filter(
      (step) => step.length < 1000 && step.inFlight > step.length,
    );
    expect(short).toEqual([]);
  });
});

describe('options in the handshake', () => {
  it('TC-1058: default endpoints offer all three', () => {
    const syn = synOptions({});
    expect(syn).toEqual({ mss: 1460, windowScale: 0, sackPermitted: true });
    expect(synAckOptions({}, syn)).toEqual(syn);
  });

  it('TC-1059: a SYN-ACK does not offer what the SYN did not', () => {
    const syn = synOptions({ windowScale: null, sackPermitted: false });
    expect(syn).toEqual({ mss: 1460 });
    const synAck = synAckOptions({ windowScale: 7 }, syn);
    expect(synAck).toEqual({ mss: 1460 });
    expect(negotiateTcpOptions(syn, synAck)).toMatchObject({
      windowScaling: false,
      clientWindowShift: 0,
      serverWindowShift: 0,
      sackPermitted: false,
    });
  });

  it('TC-1060: a shift above 14 counts as 14, and each end keeps its own', () => {
    const syn = synOptions({ windowScale: 7 });
    const synAck = synAckOptions({ windowScale: 20 }, syn);
    expect(negotiateTcpOptions(syn, synAck)).toMatchObject({
      windowScaling: true,
      clientWindowShift: 7,
      serverWindowShift: 14,
    });
  });

  it('TC-1061: each end sends no more than the smaller MSS, or 536 unannounced', () => {
    const syn = synOptions({ mss: 1460 });
    const synAck = synAckOptions({ mss: 1000 }, syn);
    expect(negotiateTcpOptions(syn, synAck)).toMatchObject({
      clientSendMss: 1000,
      serverSendMss: 1000,
    });
    expect(negotiateTcpOptions({}, {})).toMatchObject({ clientSendMss: 536, serverSendMss: 536 });
  });

  it('TC-1062: no data segment carries more than the send MSS', () => {
    const plan = planTcpTransfer({
      bytes: 5500,
      mss: 1000,
      receiveBuffer: 65535,
      readBytes: () => 65535,
    });
    expect(plan.completed).toBe(true);
    expect(Math.max(...inKind(plan, 'data').map((step) => step.length))).toBe(1000);
  });

  it('TC-1063: the field is scaled down, or capped without scaling', () => {
    expect(advertisedWindowField(262144, 4)).toBe(16384);
    expect(advertisedWindowField(262144, 0)).toBe(65535);
  });
});

describe('congestion control in a transfer', () => {
  it('TC-1067: cwnd grows as TcpCongestionControl says', () => {
    const plan = planTcpTransfer({
      bytes: 14000,
      mss: 1000,
      receiveBuffer: 65535,
      readBytes: () => 65535,
    });
    const firstInRound = (round: number) =>
      inKind(plan, 'data').find((step) => step.round === round)?.cwnd;
    expect([firstInRound(0), firstInRound(1), firstInRound(2)]).toEqual([1000, 2000, 4000]);

    const control = new TcpCongestionControl({ mss: 1000 });
    let seq = 0;
    for (const step of inKind(plan, 'data')) {
      control.onSegmentSent(seq, step.length, 0);
      seq += step.length;
    }
    for (const step of inKind(plan, 'ack')) control.onAckReceived(step.ack, 100, 0);
    expect(plan.congestion.cwnd).toBe(control.state.cwnd);
  });
});
