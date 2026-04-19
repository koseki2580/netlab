import { describe, expect, it } from 'vitest';
import type {
  ArpEthernetFrame,
  DhcpMessage,
  DnsMessage,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  IgmpMessage,
  IpPacket,
  RawPayload,
  TcpSegment,
  UdpDatagram,
} from './packets';
import {
  isArpFrame,
  isDhcpMessage,
  isDnsMessage,
  isHttpMessage,
  isIcmpMessage,
  isIgmpMessage,
  isPortBearingPayload,
  isTcpSegment,
  isUdpDatagram,
} from './packets';

// ── Fixture helpers ────────────────────────────────────────────

const raw: RawPayload = { layer: 'raw', data: 'hello' };

const icmp: IcmpMessage = {
  layer: 'L4',
  type: 8,
  code: 0,
  checksum: 0,
};

const igmp: IgmpMessage = {
  layer: 'L4',
  igmpType: 'v2-membership-report',
  groupAddress: '239.1.1.1',
};

const tcp: TcpSegment = {
  layer: 'L4',
  srcPort: 12345,
  dstPort: 80,
  seq: 100,
  ack: 0,
  flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
  payload: raw,
};

const http: HttpMessage = {
  layer: 'L7',
  httpVersion: 'HTTP/1.1',
  method: 'GET',
  url: '/',
  headers: {},
};

const dhcp: DhcpMessage = {
  layer: 'L7',
  messageType: 'DISCOVER',
  transactionId: 1,
  clientMac: 'aa:bb:cc:dd:ee:ff',
  options: {},
};

const dns: DnsMessage = {
  layer: 'L7',
  transactionId: 42,
  isResponse: false,
  questions: [{ name: 'example.com', type: 'A' }],
  answers: [],
};

const udp: UdpDatagram = {
  layer: 'L4',
  srcPort: 1024,
  dstPort: 53,
  payload: dns,
};

const payloads: IpPacket['payload'][] = [raw, icmp, igmp, tcp, udp];

// ── isIcmpMessage ──────────────────────────────────────────────

describe('isIcmpMessage', () => {
  it.each([
    { label: 'ICMP', payload: icmp, expected: true },
    { label: 'TCP', payload: tcp, expected: false },
    { label: 'UDP', payload: udp, expected: false },
    { label: 'IGMP', payload: igmp, expected: false },
    { label: 'Raw', payload: raw, expected: false },
  ])('returns $expected for $label', ({ payload, expected }) => {
    expect(isIcmpMessage(payload)).toBe(expected);
  });
});

// ── isIgmpMessage ──────────────────────────────────────────────

describe('isIgmpMessage', () => {
  it.each([
    { label: 'IGMP', payload: igmp, expected: true },
    { label: 'TCP', payload: tcp, expected: false },
    { label: 'UDP', payload: udp, expected: false },
    { label: 'ICMP', payload: icmp, expected: false },
    { label: 'Raw', payload: raw, expected: false },
  ])('returns $expected for $label', ({ payload, expected }) => {
    expect(isIgmpMessage(payload)).toBe(expected);
  });
});

// ── isUdpDatagram ──────────────────────────────────────────────

describe('isUdpDatagram', () => {
  it.each([
    { label: 'UDP', payload: udp, expected: true },
    { label: 'TCP', payload: tcp, expected: false },
    { label: 'ICMP', payload: icmp, expected: false },
    { label: 'IGMP', payload: igmp, expected: false },
    { label: 'Raw', payload: raw, expected: false },
  ])('returns $expected for $label', ({ payload, expected }) => {
    expect(isUdpDatagram(payload)).toBe(expected);
  });
});

// ── isTcpSegment ───────────────────────────────────────────────

describe('isTcpSegment', () => {
  it.each([
    { label: 'TCP', payload: tcp, expected: true },
    { label: 'UDP', payload: udp, expected: false },
    { label: 'ICMP', payload: icmp, expected: false },
    { label: 'IGMP', payload: igmp, expected: false },
    { label: 'Raw', payload: raw, expected: false },
  ])('returns $expected for $label', ({ payload, expected }) => {
    expect(isTcpSegment(payload)).toBe(expected);
  });
});

// ── isDhcpMessage ──────────────────────────────────────────────

describe('isDhcpMessage', () => {
  it('returns true for DHCP payload', () => {
    expect(isDhcpMessage(dhcp)).toBe(true);
  });

  it('returns false for DNS payload', () => {
    expect(isDhcpMessage(dns)).toBe(false);
  });

  it('returns false for Raw payload', () => {
    expect(isDhcpMessage(raw)).toBe(false);
  });
});

// ── isDnsMessage ───────────────────────────────────────────────

describe('isDnsMessage', () => {
  it('returns true for DNS payload', () => {
    expect(isDnsMessage(dns)).toBe(true);
  });

  it('returns false for DHCP payload', () => {
    expect(isDnsMessage(dhcp)).toBe(false);
  });

  it('returns false for Raw payload', () => {
    expect(isDnsMessage(raw)).toBe(false);
  });
});

// ── isHttpMessage ──────────────────────────────────────────────

describe('isHttpMessage', () => {
  it('returns true for HttpMessage', () => {
    expect(isHttpMessage(http)).toBe(true);
  });

  it('returns false for RawPayload', () => {
    expect(isHttpMessage(raw)).toBe(false);
  });
});

// ── isArpFrame ─────────────────────────────────────────────────

describe('isArpFrame', () => {
  const ipFrame: EthernetFrame = {
    layer: 'L2',
    srcMac: 'aa:bb:cc:dd:ee:ff',
    dstMac: '11:22:33:44:55:66',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      ttl: 64,
      protocol: 1,
      payload: icmp,
    },
  };

  const arpFrame: ArpEthernetFrame = {
    layer: 'L2',
    srcMac: 'aa:bb:cc:dd:ee:ff',
    dstMac: 'ff:ff:ff:ff:ff:ff',
    etherType: 0x0806,
    payload: {
      layer: 'ARP',
      hardwareType: 1,
      protocolType: 0x0800,
      operation: 'request',
      senderMac: 'aa:bb:cc:dd:ee:ff',
      senderIp: '10.0.0.1',
      targetMac: '00:00:00:00:00:00',
      targetIp: '10.0.0.2',
    },
  };

  it('returns true for ARP frame', () => {
    expect(isArpFrame(arpFrame)).toBe(true);
  });

  it('returns false for IP frame', () => {
    expect(isArpFrame(ipFrame)).toBe(false);
  });
});

// ── isPortBearingPayload ───────────────────────────────────────

describe('isPortBearingPayload', () => {
  it.each([
    { label: 'TCP', payload: tcp, expected: true },
    { label: 'UDP', payload: udp, expected: true },
    { label: 'ICMP', payload: icmp, expected: false },
    { label: 'IGMP', payload: igmp, expected: false },
    { label: 'Raw', payload: raw, expected: false },
  ])('returns $expected for $label', ({ payload, expected }) => {
    expect(isPortBearingPayload(payload)).toBe(expected);
  });
});

// ── Compile-time type narrowing verification ───────────────────

describe('type narrowing (compile-time)', () => {
  it('isTcpSegment narrows to TcpSegment', () => {
    const p: IpPacket['payload'] = tcp;
    if (isTcpSegment(p)) {
      // If this compiles, the type guard works at the type level
      const _seq: number = p.seq;
      expect(_seq).toBe(100);
    }
  });

  it('isUdpDatagram narrows to UdpDatagram', () => {
    const p: IpPacket['payload'] = udp;
    if (isUdpDatagram(p)) {
      const _srcPort: number = p.srcPort;
      expect(_srcPort).toBe(1024);
    }
  });

  it('isDhcpMessage narrows to DhcpMessage', () => {
    const p: UdpDatagram['payload'] = dhcp;
    if (isDhcpMessage(p)) {
      const _mt: string = p.messageType;
      expect(_mt).toBe('DISCOVER');
    }
  });

  it('isHttpMessage narrows to HttpMessage', () => {
    const p: TcpSegment['payload'] = http;
    if (isHttpMessage(p)) {
      const _v: string = p.httpVersion;
      expect(_v).toBe('HTTP/1.1');
    }
  });
});

// ── Discriminant field checks ──────────────────────────────────

describe('layer discriminant', () => {
  it('all L4 payloads have layer = L4 except raw', () => {
    for (const p of payloads) {
      if (p === raw) {
        expect(p.layer).toBe('raw');
      } else {
        expect(p.layer).toBe('L4');
      }
    }
  });
});
