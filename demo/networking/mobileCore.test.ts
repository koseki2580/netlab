/** REQ-438 — 5G user plane: N3 GTP-U overhead and handover (TC-2490..TC-2494). */
import { describe, expect, it } from 'vitest';
import { SESSION, changed, handover, innerSizes, n3Overhead } from './mobileCore';

describe('TC-2490: N3 over IPv4 with a PDU Session Container costs 44 bytes', () => {
  it('20 IPv4 + 8 UDP + 8 GTP-U + 4 optional + 4 container', () => {
    expect(n3Overhead('ipv4', true)).toEqual({
      outerIp: 20,
      udp: 8,
      gtpMandatory: 8,
      gtpOptional: 4,
      pduSessionContainer: 4,
      total: 44,
    });
  });
  it('without any extension header the GTP-U header is 8 bytes: 36 in all', () => {
    expect(n3Overhead('ipv4', false).total).toBe(36);
  });
});

describe('TC-2491: a 1500-byte transport leaves an inner MTU of 1456 and an MSS of 1416', () => {
  it('with the container', () => {
    expect(innerSizes(1500, 'ipv4', true)).toMatchObject({ innerMtu: 1456, tcpMss: 1416 });
  });
  it('without it, 1464 and 1424', () => {
    expect(innerSizes(1500, 'ipv4', false)).toMatchObject({ innerMtu: 1464, tcpMss: 1424 });
  });
});

describe('TC-2492: an IPv6 transport adds 20 bytes; a larger transport MTU gives them back', () => {
  it('IPv6 outer: 64 bytes, inner MTU 1436', () => {
    expect(innerSizes(1500, 'ipv6', true)).toMatchObject({
      overhead: { total: 64 },
      innerMtu: 1436,
      tcpMss: 1396,
    });
  });
  it('a 1544-byte transport carries a full 1500-byte inner packet over IPv4', () => {
    expect(innerSizes(1544, 'ipv4', true).innerMtu).toBe(1500);
  });
});

describe('TC-2493: a handover between gNBs moves only the downlink tunnel end', () => {
  it('the UE keeps 10.45.0.7 and UPF1 stays the anchor', () => {
    const after = handover(SESSION, 'gnb2');
    expect(after.ueIp).toBe('10.45.0.7');
    expect(after.anchor).toBe('UPF1');
    expect(after.downlink).toEqual({ node: 'gNB2', address: '192.0.2.12', teid: '0x00000b07' });
    expect(changed(SESSION, after)).toEqual(['downlink']);
  });
});

describe('TC-2494: handing back to the first gNB restores the first tunnel end', () => {
  it('two handovers change nothing overall', () => {
    const back = handover(handover(SESSION, 'gnb2'), 'gnb1');
    expect(changed(SESSION, back)).toEqual([]);
  });
});
