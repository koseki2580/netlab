import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../seeds';
import {
  cidrArb,
  fragmentSetArb,
  inFlightPacketArb,
  interfaceArb,
  ipv4Arb,
  macArb,
  portArb,
  topologyArb,
} from './arbitraries';

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const MAC_RE = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/;

describe('property arbitraries', () => {
  it('generates IPv4 addresses', () => {
    fc.assert(
      fc.property(ipv4Arb(), (ip) => {
        expect(ip).toMatch(IPV4_RE);
        expect(
          ip
            .split('.')
            .map(Number)
            .every((octet) => octet >= 0 && octet <= 255),
        ).toBe(true);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates lowercase colon MAC addresses', () => {
    fc.assert(
      fc.property(macArb(), (mac) => {
        expect(mac).toMatch(MAC_RE);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates valid TCP/UDP ports', () => {
    fc.assert(
      fc.property(portArb(), (port) => {
        expect(port).toBeGreaterThanOrEqual(1);
        expect(port).toBeLessThanOrEqual(65535);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates CIDR strings inside the requested prefix range', () => {
    fc.assert(
      fc.property(cidrArb({ minPrefix: 8, maxPrefix: 24 }), (cidr) => {
        const [ip, prefix] = cidr.split('/');
        expect(ip).toMatch(IPV4_RE);
        expect(Number(prefix)).toBeGreaterThanOrEqual(8);
        expect(Number(prefix)).toBeLessThanOrEqual(24);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates router interfaces with IP, MAC, and prefix', () => {
    fc.assert(
      fc.property(interfaceArb(), (iface) => {
        expect(iface.id).toBeTruthy();
        expect(iface.ipAddress).toMatch(IPV4_RE);
        expect(iface.macAddress).toMatch(MAC_RE);
        expect(iface.prefixLength).toBeGreaterThanOrEqual(1);
        expect(iface.prefixLength).toBeLessThanOrEqual(30);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates connected topologies with edges that reference existing nodes', () => {
    fc.assert(
      fc.property(topologyArb(), (topology) => {
        const nodeIds = new Set(topology.nodes.map((node) => node.id));
        expect(topology.nodes.length).toBeGreaterThanOrEqual(2);
        for (const edge of topology.edges) {
          expect(nodeIds.has(edge.source)).toBe(true);
          expect(nodeIds.has(edge.target)).toBe(true);
        }
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('generates in-flight packets over the provided topology', () => {
    fc.assert(
      fc.property(topologyArb({ minNodes: 2, maxNodes: 4 }), (topology) => {
        fc.assert(
          fc.property(inFlightPacketArb(topology), (packet) => {
            const nodeIds = new Set(topology.nodes.map((node) => node.id));
            expect(nodeIds.has(packet.currentDeviceId)).toBe(true);
            expect(packet.frame.payload.srcIp).toMatch(IPV4_RE);
            expect(packet.frame.payload.dstIp).toMatch(IPV4_RE);
          }),
          { seed: PROPERTY_SEED_DEFAULT, numRuns: 5 },
        );
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: 20 },
    );
  });

  it('generates fragment sets with more than one fragment', () => {
    fc.assert(
      fc.property(fragmentSetArb(), (set) => {
        expect(set.fragments.length).toBeGreaterThan(1);
        expect(
          set.fragments.every((fragment) => fragment.identification === set.identification),
        ).toBe(true);
        expect(set.fragments.every((fragment) => (fragment.totalLength ?? 0) <= set.mtu)).toBe(
          true,
        );
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
