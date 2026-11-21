/** REQ-414 — Multipath TCP (TC-2180..TC-2187). */
import { describe, expect, it } from 'vitest';
import {
  LTE,
  PATHS,
  WIFI,
  bottleneckShares,
  download,
  failover,
  handshake,
  schedule,
  tcpWindow,
} from './mptcp';

describe('TC-2180: one TCP connection is limited to one path', () => {
  it('50 MB takes 10 s over Wi-Fi (40 Mbit/s) and 20 s over LTE (20 Mbit/s)', () => {
    expect(download([WIFI]).seconds).toBe(10);
    expect(download([LTE]).seconds).toBe(20);
  });
});

describe('TC-2181: MPTCP over both paths downloads at the sum of their capacities', () => {
  it('50 MB at 60 Mbit/s takes 6.67 s; Wi-Fi carries two thirds of it', () => {
    expect(download(PATHS)).toEqual({ seconds: 6.67, carriedMb: { wifi: 33.33, lte: 16.67 } });
  });
});

describe('TC-2182: the min-RTT scheduler fills the low-RTT path first', () => {
  it('64 KB all goes over Wi-Fi; 200 KB fills Wi-Fi’s 100 KB window, then LTE takes the rest', () => {
    expect(schedule(64)).toEqual({ wifi: 64, lte: 0 });
    expect(schedule(200)).toEqual({ wifi: 100, lte: 100 });
  });
});

describe('TC-2183: when Wi-Fi is lost 4 s in, TCP breaks and MPTCP carries on over LTE', () => {
  it('TCP had 20 MB and the connection breaks', () => {
    expect(failover('tcp', 4)).toMatchObject({
      mode: 'tcp',
      finished: false,
      mbAtLoss: 20,
      finishSeconds: null,
    });
  });
  it('MPTCP had 30 MB; the other 20 MB take 8 s at 20 Mbit/s, finishing at 12 s', () => {
    expect(failover('mptcp', 4)).toMatchObject({
      mode: 'mptcp',
      finished: true,
      mbAtLoss: 30,
      afterLossSeconds: 8,
      finishSeconds: 12,
      mbpsBefore: 60,
      mbpsAfter: 20,
    });
  });
});

describe('TC-2184: the moment of the loss decides what is left', () => {
  it('lost at 8 s: MPTCP had already finished at 6.67 s; TCP breaks with 40 MB', () => {
    expect(failover('mptcp', 8)).toMatchObject({ finished: true, finishSeconds: 6.67 });
    expect(failover('tcp', 8)).toMatchObject({ finished: false, mbAtLoss: 40 });
  });
  it('lost at 10 s or later: TCP had finished too', () => {
    expect(failover('tcp', 10)).toMatchObject({ finished: true, finishSeconds: 10 });
  });
});

describe('TC-2185: uncoupled subflows take more than their share of a shared bottleneck', () => {
  it('two uncoupled subflows and one TCP flow on 30 Mbit/s: MPTCP 20 (67 %), TCP 10', () => {
    expect(bottleneckShares(2, false)).toMatchObject({
      mptcpMbps: 20,
      tcpMbps: 10,
      mptcpPct: 67,
    });
  });
  it('four uncoupled subflows take 80 %', () => {
    expect(bottleneckShares(4, false)).toMatchObject({ mptcpMbps: 24, tcpMbps: 6, mptcpPct: 80 });
  });
});

describe('TC-2186: coupled congestion control (LIA) takes no more than one TCP flow would', () => {
  it('coupled, the split is 15 / 15 whether there are 2 or 4 subflows', () => {
    for (const subflows of [2, 4]) {
      expect(bottleneckShares(subflows, true)).toMatchObject({
        mptcpMbps: 15,
        tcpMbps: 15,
        mptcpPct: 50,
      });
    }
  });
  it('the subflows’ windows together equal the TCP window at the same loss rate', () => {
    const shares = bottleneckShares(3, true);
    expect(shares.mptcpWindow).toBe(shares.tcpWindow);
    expect(shares.tcpWindow).toBe(Math.round(tcpWindow(shares.lossRate)));
  });
});

describe('TC-2187: when a middlebox strips MP_CAPABLE, the connection falls back to TCP', () => {
  it('the handshake ends as plain TCP with no extra subflows', () => {
    expect(handshake(false)).toEqual({ mode: 'tcp', extraSubflows: false });
    expect(handshake(true)).toEqual({ mode: 'mptcp', extraSubflows: true });
  });
  it('a fallen-back connection breaks when Wi-Fi is lost, like TCP', () => {
    expect(failover('mptcp', 4, false)).toMatchObject({
      mode: 'tcp',
      finished: false,
      mbAtLoss: 20,
    });
  });
});
