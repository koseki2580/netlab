/** REQ-406 — NAT traversal: STUN, NAT behaviour, TURN and ICE (TC-2100..TC-2107). */
import { describe, expect, it } from 'vitest';
import {
  NAT_BEHAVIOUR,
  NAT_TYPES,
  Nat,
  RELAY,
  candidatePriority,
  pairPriority,
  pathCost,
  show,
  traverse,
  traverseTypes,
  type NatType,
} from './natTraversal';

const server1 = { ip: '192.0.2.10', port: 3478 };
const server1OtherPort = { ip: '192.0.2.10', port: 3479 };
const server2 = { ip: '192.0.2.99', port: 3478 };

describe('TC-2100: the mapping behaviour decides which public port a destination sees', () => {
  const ports = (mapping: 'EIM' | 'ADM' | 'APDM') => {
    const nat = new Nat({ mapping, filtering: 'APDF' }, '198.51.100.1', 40000);
    return [server1, server1OtherPort, server2, server1].map((dst) => nat.send(dst).port);
  };
  it('endpoint-independent: one public port for every destination', () => {
    expect(ports('EIM')).toEqual([40000, 40000, 40000, 40000]);
  });
  it('address-dependent: a new port for a new IP, the same one for another port on the same IP', () => {
    expect(ports('ADM')).toEqual([40000, 40000, 40001, 40000]);
  });
  it('address-and-port-dependent: a new port for every IP and port', () => {
    expect(ports('APDM')).toEqual([40000, 40001, 40002, 40000]);
  });
});

describe('TC-2101: the filtering behaviour decides who may send back in', () => {
  const accepted = (filtering: 'EIF' | 'ADF' | 'APDF') => {
    const nat = new Nat({ mapping: 'EIM', filtering }, '198.51.100.1', 40000);
    const mine = nat.send(server1);
    return [server1, server1OtherPort, server2].map((src) => nat.accepts(mine, src));
  };
  it('endpoint-independent lets anyone in; address-dependent only the IPs sent to; address-and-port-dependent only the exact address', () => {
    expect(accepted('EIF')).toEqual([true, true, true]);
    expect(accepted('ADF')).toEqual([true, true, false]);
    expect(accepted('APDF')).toEqual([true, false, false]);
  });
  it('nothing comes in on a port the NAT never mapped', () => {
    const nat = new Nat({ mapping: 'EIM', filtering: 'EIF' }, '198.51.100.1', 40000);
    nat.send(server1);
    expect(nat.accepts({ ip: '198.51.100.1', port: 40001 }, server1)).toBe(false);
  });
});

describe('TC-2102: STUN shows the address the NAT used toward the STUN server, which a symmetric NAT does not reuse', () => {
  it('a cone NAT sends to the peer from the reflexive address STUN reported', () => {
    const run = traverseTypes('port-restricted-cone', 'port-restricted-cone', false);
    expect(show(run.reflexive.A)).toBe('198.51.100.1:40000');
    expect(show(run.usedTowardPeer.A)).toBe('198.51.100.1:40000');
  });
  it('a symmetric NAT sends to the peer from a new port, so the address the peer was told is wrong', () => {
    const run = traverseTypes('symmetric', 'port-restricted-cone', false);
    expect(show(run.reflexive.A)).toBe('198.51.100.1:40000');
    expect(show(run.usedTowardPeer.A)).toBe('198.51.100.1:40001');
  });
});

describe('TC-2103: whether hole punching connects two NAT types directly', () => {
  const works = (a: NatType, b: NatType) => traverseTypes(a, b, false).directWorks;
  it('every pair of cone NATs connects', () => {
    for (const a of NAT_TYPES.slice(0, 3))
      for (const b of NAT_TYPES.slice(0, 3)) expect(works(a, b)).toBe(true);
  });
  it('a symmetric NAT connects to a full or restricted cone, but not to a port-restricted cone or another symmetric NAT', () => {
    expect(NAT_TYPES.map((b) => works('symmetric', b))).toEqual([true, true, false, false]);
    expect(NAT_TYPES.map((a) => works(a, 'symmetric'))).toEqual([true, true, false, false]);
  });
  it('symmetric to port-restricted: neither request gets in', () => {
    const run = traverseTypes('symmetric', 'port-restricted-cone', false);
    expect(run.direct).toEqual({
      A: { arrived: false, answered: false },
      B: { arrived: false, answered: false },
    });
  });
  it('address-dependent mapping fails just like symmetric against address-dependent filtering', () => {
    const adm = { mapping: 'ADM', filtering: 'ADF' } as const;
    expect(traverse(adm, adm, false).directWorks).toBe(false);
    expect(traverse(adm, NAT_BEHAVIOUR['full-cone'], false).directWorks).toBe(true);
  });
});

describe('TC-2104: the RFC 8445 candidate priority formula', () => {
  it('host 2130706431, peer-reflexive 1862270975, server-reflexive 1694498815, relay 16777215', () => {
    expect(['host', 'prflx', 'srflx', 'relay'].map((t) => candidatePriority(t as 'host'))).toEqual([
      2130706431, 1862270975, 1694498815, 16777215,
    ]);
  });
  it('component 2 is one less; local preference 0 drops 2^8 × 65535', () => {
    expect(candidatePriority('host', 65535, 2)).toBe(2130706430);
    expect(candidatePriority('host', 0, 1)).toBe(2113929471);
  });
});

describe('TC-2105: the pair priority formula, and the order of the check list', () => {
  it('2^32 × min + 2 × max + (controlling higher ? 1 : 0)', () => {
    expect(pairPriority(2130706431, 2130706431)).toBe(9151314442783293438n);
    expect(pairPriority(2130706431, 1694498815)).toBe(7277816997797167103n);
    expect(pairPriority(2130706431, 16777215)).toBe(72057594004373503n);
    expect(pairPriority(16777215, 2130706431)).toBe(72057594004373502n);
  });
  it('A checks from host and relay (its reflexive candidate is pruned to its host base), highest first', () => {
    const run = traverseTypes('full-cone', 'full-cone');
    expect(run.pairs.map((p) => `${p.local.type}>${p.remote.type}`)).toEqual([
      'host>host',
      'host>srflx',
      'host>relay',
      'relay>host',
      'relay>srflx',
      'relay>relay',
    ]);
  });
});

describe('TC-2106: ICE uses the highest-priority pair that works', () => {
  const chosen = (a: NatType, b: NatType) => {
    const pair = traverseTypes(a, b).selected!;
    return `${pair.local.type}>${pair.remote.type} ${show(pair.remote.address)}`;
  };
  it('two cone NATs: straight to the peer’s reflexive address; private addresses never work', () => {
    const run = traverseTypes('full-cone', 'port-restricted-cone');
    expect(chosen('full-cone', 'port-restricted-cone')).toBe('host>srflx 203.0.113.1:50000');
    expect(run.pairs.filter((p) => p.remote.type === 'host').every((p) => !p.works)).toBe(true);
  });
  it('full cone to symmetric: B’s check reaches A from a new port, which A learns as peer-reflexive and uses', () => {
    expect(chosen('full-cone', 'symmetric')).toBe('host>prflx 203.0.113.1:50002');
  });
  it('symmetric to port-restricted, or two symmetric NATs: through one relay, B’s', () => {
    expect(chosen('symmetric', 'port-restricted-cone')).toBe(`host>relay ${show(RELAY.B)}`);
    expect(chosen('symmetric', 'symmetric')).toBe(`host>relay ${show(RELAY.B)}`);
  });
  it('a relay pair works whatever the NATs', () => {
    for (const a of NAT_TYPES)
      for (const b of NAT_TYPES)
        expect(traverseTypes(a, b).pairs.find((p) => p.remote.type === 'relay')!.works).toBe(true);
  });
});

describe('TC-2107: a relay costs round-trip time and server bandwidth', () => {
  it('direct: 40 ms and nothing through TURN; through B’s relay: 110 ms and 2 × 2000 kbit/s on the server', () => {
    const direct = traverseTypes('full-cone', 'full-cone').selected!;
    const relayed = traverseTypes('symmetric', 'symmetric').selected!;
    expect(pathCost(direct, 2000)).toEqual({ relayed: false, rttMs: 40, turnKbps: 0 });
    expect(pathCost(relayed, 2000)).toEqual({ relayed: true, rttMs: 110, turnKbps: 4000 });
    expect(pathCost(relayed, 500).turnKbps).toBe(1000);
  });
  it('relay to relay passes the server twice', () => {
    const both = traverseTypes('symmetric', 'symmetric').pairs.find(
      (p) => p.local.type === 'relay' && p.remote.type === 'relay',
    )!;
    expect(pathCost(both, 2000).turnKbps).toBe(8000);
  });
});
