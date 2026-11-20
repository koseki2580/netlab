/** REQ-399 — DHCP relay (TC-2030..TC-2035). */
import { describe, expect, it } from 'vitest';
import { POOLS, relay, scenario, selectPool, type Network } from './dhcpRelay';

const run = (id: Parameters<typeof scenario>[0], options = {}) => {
  const { network, clientVlan } = scenario(id);
  return relay(network, clientVlan, options);
};

describe('TC-2030: the server picks the pool that contains giaddr, not the first pool', () => {
  it('a VLAN 20 client relayed with giaddr 10.0.20.1 is offered 10.0.20.100', () => {
    const result = run('working');
    expect(result).toMatchObject({
      outcome: 'offered',
      offered: '10.0.20.100',
      pool: '10.0.20.0',
      selectedBy: 'giaddr',
    });
  });
  it('the same server offers 10.0.10.100 when giaddr is 10.0.10.1', () => {
    const { network } = scenario('working');
    expect(relay(network, 10).offered).toBe('10.0.10.100');
    expect(selectPool(POOLS, '10.0.10.1')?.subnet).toBe('10.0.10.0');
    expect(selectPool(POOLS, '10.0.30.1')).toBeNull();
  });
});

describe('TC-2031: each hop has its own addresses, ports and giaddr', () => {
  it('broadcast in, unicast to the server, unicast back to giaddr on port 67, then to the client', () => {
    const rows = run('working').packets.map((p) => [
      p.leg,
      p.message,
      `${p.src}:${p.srcPort}`,
      `${p.dst}:${p.dstPort}`,
      p.giaddr,
    ]);
    expect(rows).toEqual([
      ['client-to-relay', 'DISCOVER', '0.0.0.0:68', '255.255.255.255:67', '0.0.0.0'],
      ['relay-to-server', 'DISCOVER', '10.0.100.1:67', '10.0.100.5:67', '10.0.20.1'],
      ['server-to-relay', 'OFFER', '10.0.100.5:67', '10.0.20.1:67', '10.0.20.1'],
      ['relay-to-client', 'OFFER', '10.0.20.1:67', '10.0.20.100:68', '10.0.20.1'],
    ]);
  });
  it('with the BROADCAST flag the relay broadcasts the OFFER on the client VLAN', () => {
    const last = run('working', { broadcastFlag: true }).packets[3]!;
    expect(`${last.dst}:${last.dstPort}`).toBe('255.255.255.255:68');
  });
});

describe('TC-2032: the relay adds 1 to hops; the server reply carries 0', () => {
  it('hops go 0, 1, 0, 0', () => {
    expect(run('working').packets.map((p) => p.hops)).toEqual([0, 1, 0, 0]);
  });
});

describe('TC-2033: no helper address on the client VLAN: the DISCOVER stops at the router', () => {
  it('with no relay anywhere, and with a relay only on VLAN 10, a VLAN 20 client gets nothing', () => {
    for (const id of ['no-relay', 'vlan10-only'] as const) {
      const result = run(id);
      expect(result.outcome).toBe('no-helper');
      expect(result.offered).toBeNull();
      expect(result.packets.map((p) => p.leg)).toEqual(['client-to-relay']);
    }
  });
  it('the VLAN 10 relay still works for VLAN 10 clients', () => {
    const { network } = scenario('vlan10-only');
    expect(relay(network, 10).offered).toBe('10.0.10.100');
  });
});

describe('TC-2034: giaddr in a subnet the server has no pool for: no OFFER', () => {
  it('a VLAN 30 client is relayed with giaddr 10.0.30.1 and the server stays silent', () => {
    const result = run('no-pool');
    expect(result.outcome).toBe('no-pool');
    expect(result.offered).toBeNull();
    expect(result.packets.map((p) => [p.leg, p.giaddr])).toEqual([
      ['client-to-relay', '0.0.0.0'],
      ['relay-to-server', '10.0.30.1'],
    ]);
  });
});

describe('TC-2035: option 82 lets the server pick by switch port', () => {
  it('a reserved port Gi1/0/7 gets 10.0.20.50; another port gets the pool address', () => {
    expect(run('working', { circuitId: 'Gi1/0/7' })).toMatchObject({
      offered: '10.0.20.50',
      selectedBy: 'circuit-id',
    });
    expect(run('working', { circuitId: 'Gi1/0/5' })).toMatchObject({
      offered: '10.0.20.100',
      selectedBy: 'giaddr',
    });
  });
  it('the circuit ID travels to the server and back, and is removed before the client', () => {
    const ids = run('working', { circuitId: 'Gi1/0/7' }).packets.map((p) => p.circuitId);
    expect(ids).toEqual([null, 'Gi1/0/7', 'Gi1/0/7', null]);
  });
  it('a reservation outside the giaddr subnet is not used', () => {
    const { network } = scenario('working');
    const elsewhere: Network = { ...network, reservations: { 'Gi1/0/7': '10.0.10.50' } };
    expect(relay(elsewhere, 20, { circuitId: 'Gi1/0/7' }).offered).toBe('10.0.20.100');
  });
});
