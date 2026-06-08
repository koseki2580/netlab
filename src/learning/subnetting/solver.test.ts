import { describe, expect, it } from 'vitest';
import { subnetFacts } from './solver';

describe('subnetFacts', () => {
  it('computes a /24 block from any host in it', () => {
    expect(subnetFacts('192.168.1.37', 24)).toEqual({
      cidr: '192.168.1.0/24',
      prefix: 24,
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      networkAddress: '192.168.1.0',
      broadcastAddress: '192.168.1.255',
      firstUsableHost: '192.168.1.1',
      lastUsableHost: '192.168.1.254',
      usableHostCount: 254,
      totalAddresses: 256,
    });
  });

  it('computes a /26 block and snaps the network from a mid-block host', () => {
    const facts = subnetFacts('203.0.113.40', 26);
    expect(facts.networkAddress).toBe('203.0.113.0');
    expect(facts.broadcastAddress).toBe('203.0.113.63');
    expect(facts.firstUsableHost).toBe('203.0.113.1');
    expect(facts.lastUsableHost).toBe('203.0.113.62');
    expect(facts.usableHostCount).toBe(62);
    expect(facts.mask).toBe('255.255.255.192');
  });

  it('computes a /30 point-to-pointish block', () => {
    const facts = subnetFacts('172.16.5.2', 30);
    expect(facts.networkAddress).toBe('172.16.5.0');
    expect(facts.broadcastAddress).toBe('172.16.5.3');
    expect(facts.firstUsableHost).toBe('172.16.5.1');
    expect(facts.lastUsableHost).toBe('172.16.5.2');
    expect(facts.usableHostCount).toBe(2);
    expect(facts.totalAddresses).toBe(4);
  });

  it('reports a /8 large block', () => {
    const facts = subnetFacts('10.20.30.40', 8);
    expect(facts.networkAddress).toBe('10.0.0.0');
    expect(facts.broadcastAddress).toBe('10.255.255.255');
    expect(facts.usableHostCount).toBe(16_777_214);
    expect(facts.totalAddresses).toBe(16_777_216);
  });

  it('handles the default route /0', () => {
    const facts = subnetFacts('8.8.8.8', 0);
    expect(facts.networkAddress).toBe('0.0.0.0');
    expect(facts.mask).toBe('0.0.0.0');
    expect(facts.wildcard).toBe('255.255.255.255');
    expect(facts.broadcastAddress).toBe('255.255.255.255');
    expect(facts.totalAddresses).toBe(4_294_967_296);
    expect(facts.usableHostCount).toBe(4_294_967_294);
  });

  it('treats /31 as having no usable-host range', () => {
    const facts = subnetFacts('192.168.1.5', 31);
    expect(facts.networkAddress).toBe('192.168.1.4');
    expect(facts.broadcastAddress).toBe('192.168.1.5');
    expect(facts.firstUsableHost).toBeNull();
    expect(facts.lastUsableHost).toBeNull();
    expect(facts.usableHostCount).toBe(0);
    expect(facts.totalAddresses).toBe(2);
  });

  it('treats /32 as a single host route', () => {
    const facts = subnetFacts('192.168.1.7', 32);
    expect(facts.networkAddress).toBe('192.168.1.7');
    expect(facts.broadcastAddress).toBe('192.168.1.7');
    expect(facts.mask).toBe('255.255.255.255');
    expect(facts.firstUsableHost).toBeNull();
    expect(facts.usableHostCount).toBe(0);
    expect(facts.totalAddresses).toBe(1);
  });

  it('rejects out-of-range prefixes', () => {
    expect(() => subnetFacts('10.0.0.0', -1)).toThrow(RangeError);
    expect(() => subnetFacts('10.0.0.0', 33)).toThrow(RangeError);
    expect(() => subnetFacts('10.0.0.0', 24.5)).toThrow(RangeError);
  });
});
