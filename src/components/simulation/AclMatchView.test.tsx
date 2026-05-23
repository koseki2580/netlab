import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AclMatchInfo, AclRule } from '../../types/acl';
import { AclMatchView, formatAclRule } from './AclMatchView';

const PERMIT_RULE: AclRule = {
  id: 'r-permit',
  priority: 10,
  action: 'permit',
  protocol: 'tcp',
  srcIp: '10.0.0.0/24',
  dstIp: '203.0.113.10',
  dstPort: 443,
};

const DENY_RULE: AclRule = {
  id: 'r-deny',
  priority: 20,
  action: 'deny',
  protocol: 'udp',
  srcIp: '198.51.100.0/24',
  dstPort: { from: 1000, to: 2000 },
};

describe('AclMatchView', () => {
  it('renders a permit match with the matched rule formatted', () => {
    const aclMatch: AclMatchInfo = {
      direction: 'inbound',
      interfaceId: 'eth0',
      interfaceName: 'eth0',
      matchedRule: PERMIT_RULE,
      action: 'permit',
      byConnTrack: false,
    };

    const html = renderToStaticMarkup(<AclMatchView aclMatch={aclMatch} />);

    expect(html).toContain('ACL FILTER');
    expect(html).toContain('INBOUND');
    expect(html).toContain('eth0');
    expect(html).toContain(formatAclRule(PERMIT_RULE));
    expect(html).toContain('PERMIT');
  });

  it('renders a deny match with the deny accent color', () => {
    const aclMatch: AclMatchInfo = {
      direction: 'outbound',
      interfaceId: 'eth1',
      interfaceName: 'eth1',
      matchedRule: DENY_RULE,
      action: 'deny',
      byConnTrack: false,
    };

    const html = renderToStaticMarkup(<AclMatchView aclMatch={aclMatch} />);

    expect(html).toContain('OUTBOUND');
    expect(html).toContain(formatAclRule(DENY_RULE));
    expect(html).toContain('DENY');
    expect(html).toContain('--netlab-accent-red');
  });

  it('renders the default-policy hint when no rule matched', () => {
    const aclMatch: AclMatchInfo = {
      direction: 'inbound',
      interfaceId: 'eth0',
      interfaceName: 'eth0',
      matchedRule: null,
      action: 'deny',
      byConnTrack: false,
    };

    const html = renderToStaticMarkup(<AclMatchView aclMatch={aclMatch} />);

    expect(html).toContain('(default policy)');
    expect(html).toContain('--netlab-text-muted');
  });

  it('annotates conn-track returns even when no rule matched', () => {
    const aclMatch: AclMatchInfo = {
      direction: 'inbound',
      interfaceId: 'eth0',
      interfaceName: 'eth0',
      matchedRule: null,
      action: 'permit',
      byConnTrack: true,
    };

    const html = renderToStaticMarkup(<AclMatchView aclMatch={aclMatch} />);

    expect(html).toContain('stateful return traffic');
    expect(html).toContain('(conn-track)');
  });
});

describe('formatAclRule', () => {
  it('emits priority, action, protocol, and endpoints in order', () => {
    expect(formatAclRule(PERMIT_RULE)).toBe('#10 permit tcp 10.0.0.0/24 203.0.113.10 dst 443');
  });

  it('expands port ranges', () => {
    expect(formatAclRule(DENY_RULE)).toBe('#20 deny udp 198.51.100.0/24 any dst 1000-2000');
  });
});
