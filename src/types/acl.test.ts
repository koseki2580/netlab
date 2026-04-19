import { describe, expect, it } from 'vitest';
import type { AclMatchInfo, AclRule, ConnTrackEntry, ConnTrackTable } from './acl';

describe('AclRule shape', () => {
  it('accepts a full rule with all optional fields', () => {
    const rule: AclRule = {
      id: 'rule-1',
      priority: 100,
      action: 'permit',
      protocol: 'tcp',
      srcIp: '10.0.0.0/8',
      dstIp: '192.168.1.0/24',
      srcPort: 1024,
      dstPort: { from: 80, to: 443 },
      description: 'Allow HTTP/HTTPS',
    };
    expect(rule.action).toBe('permit');
    expect(rule.protocol).toBe('tcp');
  });

  it('works with minimal required fields', () => {
    const rule: AclRule = {
      id: 'rule-2',
      priority: 200,
      action: 'deny',
      protocol: 'any',
    };
    expect(rule.srcIp).toBeUndefined();
    expect(rule.dstPort).toBeUndefined();
  });
});

describe('AclMatchInfo shape', () => {
  it('can represent a matched rule', () => {
    const info: AclMatchInfo = {
      direction: 'inbound',
      interfaceId: 'eth0',
      interfaceName: 'Ethernet0',
      matchedRule: { id: 'r1', priority: 10, action: 'permit', protocol: 'tcp' },
      action: 'permit',
      byConnTrack: false,
    };
    expect(info.matchedRule).not.toBeNull();
  });

  it('can represent no matched rule (implicit deny)', () => {
    const info: AclMatchInfo = {
      direction: 'outbound',
      interfaceId: 'eth1',
      interfaceName: 'Ethernet1',
      matchedRule: null,
      action: 'deny',
      byConnTrack: false,
    };
    expect(info.matchedRule).toBeNull();
  });
});

describe('ConnTrackTable shape', () => {
  it('contains entries with required fields', () => {
    const entry: ConnTrackEntry = {
      id: 'ct-1',
      proto: 'tcp',
      srcIp: '10.0.0.1',
      srcPort: 12345,
      dstIp: '10.0.0.2',
      dstPort: 80,
      state: 'established',
      createdAt: 1000,
      lastSeenAt: 2000,
    };
    const table: ConnTrackTable = {
      routerId: 'router-1',
      entries: [entry],
    };
    expect(table.entries).toHaveLength(1);
    expect(table.entries[0].state).toBe('established');
  });
});
