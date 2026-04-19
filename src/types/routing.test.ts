import { describe, expect, it } from 'vitest';
import type { PortForwardingRule, RouteEntry, StaticRouteConfig } from './routing';
import { ADMIN_DISTANCES } from './routing';

describe('ADMIN_DISTANCES', () => {
  it('contains expected protocol distances', () => {
    expect(ADMIN_DISTANCES.static).toBe(1);
    expect(ADMIN_DISTANCES.ebgp).toBe(20);
    expect(ADMIN_DISTANCES.ospf).toBe(110);
    expect(ADMIN_DISTANCES.rip).toBe(120);
    expect(ADMIN_DISTANCES.ibgp).toBe(200);
  });

  it('static < ospf < rip (lower = preferred)', () => {
    expect(ADMIN_DISTANCES.static).toBeLessThan(ADMIN_DISTANCES.ospf);
    expect(ADMIN_DISTANCES.ospf).toBeLessThan(ADMIN_DISTANCES.rip);
  });

  it('ebgp < ibgp', () => {
    expect(ADMIN_DISTANCES.ebgp).toBeLessThan(ADMIN_DISTANCES.ibgp);
  });
});

describe('RouteEntry shape', () => {
  it('satisfies interface with required fields', () => {
    const route: RouteEntry = {
      destination: '10.0.0.0/24',
      nextHop: '10.0.0.1',
      metric: 10,
      protocol: 'ospf',
      adminDistance: 110,
      nodeId: 'router-1',
    };
    expect(route.destination).toBe('10.0.0.0/24');
    expect(route.protocol).toBe('ospf');
  });
});

describe('StaticRouteConfig shape', () => {
  it('metric is optional', () => {
    const cfg: StaticRouteConfig = {
      destination: '0.0.0.0/0',
      nextHop: '10.0.0.1',
    };
    expect(cfg.metric).toBeUndefined();
  });
});

describe('PortForwardingRule shape', () => {
  it('accepts tcp and udp proto', () => {
    const rule: PortForwardingRule = {
      proto: 'tcp',
      externalPort: 8080,
      internalIp: '192.168.1.10',
      internalPort: 80,
    };
    expect(rule.proto).toBe('tcp');
  });
});
