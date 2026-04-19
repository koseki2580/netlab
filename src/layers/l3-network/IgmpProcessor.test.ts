import { beforeEach, describe, expect, it } from 'vitest';
import { IGMP_PROTOCOL } from '../../types/multicast';
import type { IgmpMessage } from '../../types/packets';
import { IgmpProcessor } from './IgmpProcessor';

describe('IgmpProcessor.buildGeneralQuery', () => {
  let processor: IgmpProcessor;

  beforeEach(() => {
    processor = new IgmpProcessor();
  });

  it('builds an IP packet with protocol=2', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    expect(pkt.frame.payload.protocol).toBe(IGMP_PROTOCOL);
  });

  it('sets destination IP to 224.0.0.1', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    expect(pkt.frame.payload.dstIp).toBe('224.0.0.1');
  });

  it('sets destination MAC to 01:00:5e:00:00:01', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    expect(pkt.frame.dstMac).toBe('01:00:5e:00:00:01');
  });

  it('sets TTL=1', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    expect(pkt.frame.payload.ttl).toBe(1);
  });

  it('sets IgmpMessage.igmpType = v2-membership-query', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    const igmp = pkt.frame.payload.payload as IgmpMessage;
    expect(igmp.igmpType).toBe('v2-membership-query');
  });

  it('sets IgmpMessage.groupAddress = 0.0.0.0 for a general query', () => {
    const pkt = processor.buildGeneralQuery({ ip: '10.0.0.1', mac: 'aa:bb:cc:00:00:01' });
    const igmp = pkt.frame.payload.payload as IgmpMessage;
    expect(igmp.groupAddress).toBe('0.0.0.0');
  });
});

describe('IgmpProcessor.buildMembershipReport', () => {
  it('sets destination IP = groupAddress', () => {
    const pkt = IgmpProcessor.buildMembershipReport('10.0.0.100', 'aa:bb:cc:00:00:10', '224.1.2.3');
    expect(pkt.frame.payload.dstIp).toBe('224.1.2.3');
  });

  it('sets destination MAC = multicast MAC of groupAddress', () => {
    const pkt = IgmpProcessor.buildMembershipReport('10.0.0.100', 'aa:bb:cc:00:00:10', '224.1.2.3');
    expect(pkt.frame.dstMac).toBe('01:00:5e:01:02:03');
  });

  it('sets IgmpMessage.igmpType = v2-membership-report', () => {
    const pkt = IgmpProcessor.buildMembershipReport('10.0.0.100', 'aa:bb:cc:00:00:10', '224.1.2.3');
    const igmp = pkt.frame.payload.payload as IgmpMessage;
    expect(igmp.igmpType).toBe('v2-membership-report');
  });
});

describe('IgmpProcessor.buildLeaveGroup', () => {
  it('sets destination IP to 224.0.0.2', () => {
    const pkt = IgmpProcessor.buildLeaveGroup('10.0.0.100', 'aa:bb:cc:00:00:10', '224.1.2.3');
    expect(pkt.frame.payload.dstIp).toBe('224.0.0.2');
  });

  it('sets IgmpMessage.igmpType = v2-leave-group', () => {
    const pkt = IgmpProcessor.buildLeaveGroup('10.0.0.100', 'aa:bb:cc:00:00:10', '224.1.2.3');
    const igmp = pkt.frame.payload.payload as IgmpMessage;
    expect(igmp.igmpType).toBe('v2-leave-group');
  });
});

describe('IgmpProcessor membership state', () => {
  let processor: IgmpProcessor;

  beforeEach(() => {
    processor = new IgmpProcessor();
  });

  it('recordReport adds (interfaceId, groupAddress)', () => {
    processor.recordReport('eth0', '224.1.2.3');
    expect(processor.snapshot()).toEqual([{ interfaceId: 'eth0', group: '224.1.2.3' }]);
  });

  it('recordLeave removes (interfaceId, groupAddress)', () => {
    processor.recordReport('eth0', '224.1.2.3');
    processor.recordLeave('eth0', '224.1.2.3');
    expect(processor.snapshot()).toEqual([]);
  });

  it('snapshot returns sorted rows', () => {
    processor.recordReport('eth1', '224.1.2.3');
    processor.recordReport('eth0', '224.5.6.7');
    processor.recordReport('eth0', '224.1.2.3');
    expect(processor.snapshot()).toEqual([
      { interfaceId: 'eth0', group: '224.1.2.3' },
      { interfaceId: 'eth0', group: '224.5.6.7' },
      { interfaceId: 'eth1', group: '224.1.2.3' },
    ]);
  });
});
