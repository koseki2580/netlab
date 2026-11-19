/** REQ-393 — QUIC connection migration and 0-RTT (TC-1970..TC-1975). */
import { describe, expect, it } from 'vitest';
import {
  ISSUED_CIDS,
  arrive,
  interruption,
  mayUseZeroRtt,
  roundTripsBeforeRequest,
  timeToFirstByte,
} from './quicMigration';

describe('TC-1970: the server finds a TCP connection by its 4-tuple, so any address or port change misses', () => {
  it('a move to mobile data and a NAT rebinding both miss; no change still hits', () => {
    expect(arrive('tcp', 'new-network')).toEqual({
      knownKey: '198.51.100.20:51000 → 203.0.113.10:443',
      arrivingKey: '192.0.2.77:40123 → 203.0.113.10:443',
      matched: false,
    });
    expect(arrive('tcp', 'port-only').arrivingKey).toBe('198.51.100.20:62011 → 203.0.113.10:443');
    expect(arrive('tcp', 'port-only').matched).toBe(false);
    expect(arrive('tcp', 'none').matched).toBe(true);
  });
});

describe('TC-1971: the server finds a QUIC connection by its connection ID, whatever the address', () => {
  it('both changes still hit the same connection', () => {
    expect(arrive('quic', 'new-network').matched).toBe(true);
    expect(arrive('quic', 'port-only').matched).toBe(true);
  });
  it('moving networks uses a fresh connection ID; a NAT rebinding the phone cannot see keeps the old one', () => {
    expect(arrive('quic', 'new-network').arrivingKey).toBe(ISSUED_CIDS[1]);
    expect(arrive('quic', 'port-only').arrivingKey).toBe(ISSUED_CIDS[0]);
    expect(arrive('quic', 'new-network').arrivingKey).not.toBe(arrive('quic', 'none').arrivingKey);
  });
});

describe('TC-1972: a broken TCP connection costs a new TCP handshake, TLS handshake and request', () => {
  it('Wi-Fi to mobile (60 ms): 3 round trips = 180 ms', () => {
    const lost = interruption('tcp', 'new-network');
    expect(lost.survives).toBe(false);
    expect(lost.steps.map((s) => s.step)).toEqual(['tcp-handshake', 'tls-handshake', 'request']);
    expect(lost.totalMs).toBe(180);
    expect(lost.slowStartAgain).toBe(true);
  });
  it('NAT rebinding on Wi-Fi (20 ms): an RST first, then 3 round trips = 80 ms', () => {
    const lost = interruption('tcp', 'port-only');
    expect(lost.steps.map((s) => s.step)).toEqual([
      'rst',
      'tcp-handshake',
      'tls-handshake',
      'request',
    ]);
    expect(lost.totalMs).toBe(80);
  });
});

describe('TC-1973: a migrated QUIC connection waits one round trip for path validation', () => {
  it('60 ms on mobile, 20 ms after a NAT rebinding, nothing without a change', () => {
    expect(interruption('quic', 'new-network').totalMs).toBe(60);
    expect(interruption('quic', 'port-only').totalMs).toBe(20);
    expect(interruption('quic', 'none').totalMs).toBe(0);
    expect(interruption('quic', 'new-network').steps.map((s) => s.step)).toEqual([
      'path-validation',
    ]);
  });
  it('QUIC restarts congestion control on a new network but not when only the port changed', () => {
    expect(interruption('quic', 'new-network').slowStartAgain).toBe(true);
    expect(interruption('quic', 'port-only').slowStartAgain).toBe(false);
  });
});

describe('TC-1974: time to the first response byte is (round trips before the request + 1) × RTT', () => {
  it('TCP + TLS 1.3: 2 + 1; QUIC: 1 + 1; TCP + TLS 0-RTT: 1 + 1; QUIC 0-RTT: 0 + 1', () => {
    expect(timeToFirstByte('tcp-tls', 50)).toEqual({
      roundTripsBeforeRequest: 2,
      requestLeavesMs: 100,
      firstByteMs: 150,
    });
    expect(timeToFirstByte('quic', 50).firstByteMs).toBe(100);
    expect(timeToFirstByte('tcp-tls-0rtt', 50).firstByteMs).toBe(100);
    expect(timeToFirstByte('quic-0rtt', 50)).toEqual({
      roundTripsBeforeRequest: 0,
      requestLeavesMs: 0,
      firstByteMs: 50,
    });
  });
  it('scales with the RTT: 20 ms and 200 ms', () => {
    expect(timeToFirstByte('tcp-tls', 20).firstByteMs).toBe(60);
    expect(timeToFirstByte('quic-0rtt', 20).firstByteMs).toBe(20);
    expect(timeToFirstByte('tcp-tls', 200).firstByteMs).toBe(600);
    expect(timeToFirstByte('quic', 200).firstByteMs).toBe(400);
  });
});

describe('TC-1975: only replay-safe requests go out as 0-RTT data', () => {
  it('GET and HEAD may; POST may not', () => {
    expect(mayUseZeroRtt('GET')).toBe(true);
    expect(mayUseZeroRtt('HEAD')).toBe(true);
    expect(mayUseZeroRtt('POST')).toBe(false);
  });
  it('a POST on a resumed QUIC connection waits for the handshake: 2 round trips, not 1', () => {
    expect(roundTripsBeforeRequest('quic-0rtt', 'POST')).toBe(1);
    expect(timeToFirstByte('quic-0rtt', 60, 'POST').firstByteMs).toBe(120);
    expect(timeToFirstByte('tcp-tls-0rtt', 60, 'POST').firstByteMs).toBe(180);
  });
});
