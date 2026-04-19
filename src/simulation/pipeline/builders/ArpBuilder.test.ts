import { describe, expect, it } from 'vitest';
import { ArpBuilder } from './ArpBuilder';

describe('ArpBuilder', () => {
  const builder = new ArpBuilder();

  it('buildRequestFrame creates ARP request with broadcast dstMac', () => {
    const frame = builder.buildRequestFrame(
      { ip: '10.0.0.10', mac: '02:00:00:00:00:10' },
      '10.0.0.1',
    );
    expect(frame.srcMac).toBe('02:00:00:00:00:10');
    expect(frame.dstMac).toBe('ff:ff:ff:ff:ff:ff');
    expect(frame.etherType).toBe(0x0806);
    expect(frame.payload.operation).toBe('request');
    expect(frame.payload.senderIp).toBe('10.0.0.10');
    expect(frame.payload.targetIp).toBe('10.0.0.1');
  });

  it('buildReplyFrame creates ARP reply with correct MACs', () => {
    const frame = builder.buildReplyFrame(
      { ip: '10.0.0.1', mac: '00:00:00:01:00:00' },
      { ip: '10.0.0.10', mac: '02:00:00:00:00:10' },
    );
    expect(frame.srcMac).toBe('00:00:00:01:00:00');
    expect(frame.dstMac).toBe('02:00:00:00:00:10');
    expect(frame.payload.operation).toBe('reply');
    expect(frame.payload.senderIp).toBe('10.0.0.1');
    expect(frame.payload.senderMac).toBe('00:00:00:01:00:00');
    expect(frame.payload.targetIp).toBe('10.0.0.10');
    expect(frame.payload.targetMac).toBe('02:00:00:00:00:10');
  });

  it('buildRequestFrame sets target MAC to zeroes', () => {
    const frame = builder.buildRequestFrame(
      { ip: '192.168.1.10', mac: 'aa:bb:cc:dd:ee:ff' },
      '192.168.1.1',
    );
    expect(frame.payload.targetMac).toBe('00:00:00:00:00:00');
  });
});
