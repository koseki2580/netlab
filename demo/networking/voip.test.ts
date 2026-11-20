/** REQ-407 — voice over IP: SIP, SDP offer/answer, RTP bandwidth, jitter buffer (TC-2110..TC-2117). */
import { describe, expect, it } from 'vitest';
import {
  BUFFER_CHOICES_MS,
  bandwidth,
  bestBuffer,
  callSetup,
  jitterBuffer,
  lossFreeBufferMs,
  negotiate,
  sdp,
} from './voip';

describe('TC-2110: the answer keeps the offered codecs the callee supports, and the first is used', () => {
  it('offer [Opus, G.711 µ-law] to a callee with both: Opus', () => {
    expect(negotiate(['opus', 'pcmu'], ['pcmu', 'opus'])).toEqual({
      answered: ['opus', 'pcmu'],
      chosen: 'opus',
      status: 200,
    });
  });
  it('the same offer to a callee with only G.711 µ-law: G.711 µ-law', () => {
    expect(negotiate(['opus', 'pcmu'], ['pcmu'])).toEqual({
      answered: ['pcmu'],
      chosen: 'pcmu',
      status: 200,
    });
  });
});

describe('TC-2111: the SDP offer and answer name each side’s RTP address and port', () => {
  it('the caller offers port 49170 with payload types 111 and 0', () => {
    expect(sdp({ address: '192.0.2.10', port: 49170 }, ['opus', 'pcmu'])).toEqual([
      'v=0',
      'o=- 1 1 IN IP4 192.0.2.10',
      's=-',
      'c=IN IP4 192.0.2.10',
      't=0 0',
      'm=audio 49170 RTP/AVP 111 0',
      'a=rtpmap:111 opus/48000/2',
      'a=rtpmap:0 PCMU/8000',
    ]);
  });
  it('a G.711-only callee answers with payload type 0, and RTP flows to the other side’s port', () => {
    const call = callSetup('pcmu-only');
    expect(call.answerSdp).toContain('m=audio 52000 RTP/AVP 0');
    expect(call.rtp).toEqual({
      callerSendsTo: '198.51.100.20:52000',
      calleeSendsTo: '192.0.2.10:49170',
    });
  });
});

describe('TC-2112: the SIP ladder of an answered call', () => {
  it('INVITE (offer), 100 Trying, 180 Ringing, 200 OK (answer), ACK', () => {
    expect(callSetup('both').ladder.map((m) => [m.from, m.label, m.body])).toEqual([
      ['caller', 'INVITE', 'offer'],
      ['callee', '100 Trying', null],
      ['callee', '180 Ringing', null],
      ['callee', '200 OK', 'answer'],
      ['caller', 'ACK', null],
    ]);
  });
});

describe('TC-2113: with no codec in common the call is refused with 488', () => {
  it('a G.722-only callee: 488 Not Acceptable Here, no answer, no RTP', () => {
    const call = callSetup('g722-only');
    expect(call.status).toBe(488);
    expect(call.chosen).toBeNull();
    expect(call.answerSdp).toBeNull();
    expect(call.rtp).toBeNull();
    expect(call.ladder.map((m) => m.label)).toEqual([
      'INVITE',
      '100 Trying',
      '488 Not Acceptable Here',
      'ACK',
    ]);
  });
});

describe('TC-2114: G.711 at 20 ms is 160 bytes, 50 packets a second, 80 kbit/s on IP', () => {
  it('payload 160 + 40 header bytes per packet; 87.2 kbit/s with Ethernet header and FCS', () => {
    expect(bandwidth('pcmu', 20)).toEqual({
      payloadBytes: 160,
      packetsPerSecond: 50,
      ipBytes: 200,
      ipKbps: 80,
      ethernetKbps: 87.2,
    });
  });
});

describe('TC-2115: Opus at 32 kbit/s, and shorter packets cost more header', () => {
  it('Opus at 20 ms: 80 bytes payload, 48 kbit/s on IP', () => {
    expect(bandwidth('opus', 20)).toMatchObject({ payloadBytes: 80, ipKbps: 48 });
  });
  it('G.711 at 10 ms: 96 kbit/s; at 40 ms: 72 kbit/s', () => {
    expect(bandwidth('pcmu', 10).ipKbps).toBe(96);
    expect(bandwidth('pcmu', 40).ipKbps).toBe(72);
  });
});

describe('TC-2116: a bigger jitter buffer loses fewer late packets but adds delay', () => {
  it('D = 20, 40, 60, 80 ms: 22 %, 6 %, 0 %, 0 % lost; 80, 100, 120, 140 ms mouth to ear', () => {
    expect(BUFFER_CHOICES_MS.map((d) => jitterBuffer(d).lossPct)).toEqual([22, 6, 0, 0]);
    expect(BUFFER_CHOICES_MS.map((d) => jitterBuffer(d).mouthToEarMs)).toEqual([80, 100, 120, 140]);
  });
  it('with 40 ms the packets 14, 23 and 39 come too late', () => {
    expect(jitterBuffer(40).late).toEqual([14, 23, 39]);
  });
});

describe('TC-2117: the least delay that keeps loss under 1 %', () => {
  it('of 20, 40, 60, 80 ms it is 60 ms; nothing is lost from 52 ms', () => {
    expect(bestBuffer(BUFFER_CHOICES_MS)).toBe(60);
    expect(lossFreeBufferMs()).toBe(52);
    expect(jitterBuffer(52).late).toEqual([]);
    expect(jitterBuffer(51).late).toEqual([23]);
  });
});
