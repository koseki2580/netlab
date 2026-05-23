/**
 * @property-seed 0x5a4b12 P-TS-1 EVPN ECMP next-hop determinism and distribution sanity.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { advertiseType5 } from '../../layers/l3-network/tunneling/EvpnControlPlane';
import { cidrArb, ipv4Arb, portArb } from '../../testing/properties/arbitraries';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { EvpnType5 } from '../../types/tunneling';
import { bucketFlow, type FlowKey } from '../../utils/hashFlow';
import { getRequired } from '../../utils/typedAccess';

const flowArb: fc.Arbitrary<FlowKey> = fc.record({
  srcIp: ipv4Arb(),
  dstIp: ipv4Arb(),
  protocol: fc.constantFrom(6, 17),
  srcPort: portArb(),
  dstPort: portArb(),
});

function routesForVteps(vtepIps: readonly string[], prefix = '10.0.0.0/24'): EvpnType5[] {
  return vtepIps.map((originVtepIp, index) =>
    advertiseType5({
      rd: { type: 0, value: `65000:${10_000 + index}` },
      vni: 10_000,
      prefix,
      gatewayIp: '10.0.0.1',
      originVtepIp,
    }),
  );
}

function selectEvpnNextHop(routes: readonly EvpnType5[], flow: FlowKey, seed: number): string {
  const nextHops = routes.map((route) => route.originVtepIp).sort();
  const bucket = bucketFlow(flow, nextHops.length, seed);
  return getRequired(nextHops, bucket, { reason: 'expected EVPN ECMP next-hop', bucket });
}

describe('EVPN ECMP properties', () => {
  it('selects a deterministic VTEP next-hop for a fixed flow tuple', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(ipv4Arb(), { minLength: 2, maxLength: 8 }),
        cidrArb({ minPrefix: 16, maxPrefix: 30 }),
        flowArb,
        fc.integer({ min: 0, max: 0xffff_ffff }),
        (vtepIps, prefix, flow, seed) => {
          const routes = routesForVteps(vtepIps, prefix);

          expect(selectEvpnNextHop(routes, flow, seed)).toBe(selectEvpnNextHop(routes, flow, seed));
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('chooses more than one VTEP across a deterministic source-port sweep', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 0, max: 0xffff_ffff }),
        (vtepCount, seed) => {
          const routes = routesForVteps(
            Array.from({ length: vtepCount }, (_, index) => `192.0.2.${index + 1}`),
          );
          const chosen = new Set<string>();

          for (let srcPort = 10_000; srcPort < 12_000; srcPort += 1) {
            chosen.add(
              selectEvpnNextHop(
                routes,
                {
                  srcIp: '10.0.0.10',
                  dstIp: '203.0.113.10',
                  protocol: 6,
                  srcPort,
                  dstPort: 443,
                },
                seed,
              ),
            );
          }

          expect(chosen.size).toBeGreaterThan(1);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
