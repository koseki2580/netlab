import { describe, expect, it } from 'vitest';
import type { RouteEntry } from '../../../types/routing';
import { makeRouteEntry } from '../../__fixtures__/helpers';
import {
  bestRoute,
  buildRoutingDecision,
  isPortBearingPayload,
  protocolName,
  routingVerdict,
} from './routingHelpers';
import { createTranslator } from '../../../i18n/createTranslator';
import { en } from '../../../i18n/locales/en';
import { ja } from '../../../i18n/locales/ja';

describe('routingHelpers', () => {
  describe('bestRoute', () => {
    it('returns the most specific matching route', () => {
      const routes: RouteEntry[] = [
        makeRouteEntry('r1', '10.0.0.0/8', '192.168.1.1'),
        makeRouteEntry('r1', '10.0.0.0/24', '192.168.1.2'),
      ];
      const route = bestRoute('10.0.0.5', routes);
      expect(route).not.toBeNull();
      expect(route!.nextHop).toBe('192.168.1.2');
    });

    it('returns null when no route matches', () => {
      const routes: RouteEntry[] = [makeRouteEntry('r1', '10.0.0.0/24', '192.168.1.1')];
      expect(bestRoute('172.16.0.1', routes)).toBeNull();
    });

    it('returns default route when nothing else matches', () => {
      const routes: RouteEntry[] = [makeRouteEntry('r1', '0.0.0.0/0', '192.168.1.1')];
      const route = bestRoute('8.8.8.8', routes);
      expect(route).not.toBeNull();
      expect(route!.destination).toBe('0.0.0.0/0');
    });
  });

  describe('buildRoutingDecision', () => {
    it('returns routing decision with matched route', () => {
      const routes: RouteEntry[] = [makeRouteEntry('r1', '10.0.0.0/24', 'direct')];
      const decision = buildRoutingDecision('10.0.0.5', routes, routes[0]);
      expect(decision.winner).not.toBeNull();
      expect(decision.winner?.destination).toBe('10.0.0.0/24');
    });

    it('returns routing decision with no matched route', () => {
      const decision = buildRoutingDecision('10.0.0.5', [], null);
      expect(decision.winner).toBeNull();
    });
  });

  describe('protocolName', () => {
    it('returns ICMP for protocol 1', () => {
      expect(protocolName(1)).toBe('ICMP');
    });

    it('returns TCP for protocol 6', () => {
      expect(protocolName(6)).toBe('TCP');
    });

    it('returns UDP for protocol 17', () => {
      expect(protocolName(17)).toBe('UDP');
    });

    it('returns numeric string for unknown protocol', () => {
      expect(protocolName(255)).toBe('255');
    });
  });

  describe('isPortBearingPayload', () => {
    it('returns true for TCP segment', () => {
      const tcp = {
        layer: 'L4' as const,
        srcPort: 12345,
        dstPort: 80,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw' as const, data: '' },
      };
      expect(isPortBearingPayload(tcp)).toBe(true);
    });

    it('returns true for UDP datagram', () => {
      const udp = {
        layer: 'L4' as const,
        srcPort: 12345,
        dstPort: 53,
        payload: { layer: 'raw' as const, data: '' },
      };
      expect(isPortBearingPayload(udp)).toBe(true);
    });

    it('returns false for ICMP message', () => {
      const icmp = {
        layer: 'L4' as const,
        type: 8,
        code: 0,
        checksum: 0,
      };
      expect(isPortBearingPayload(icmp)).toBe(false);
    });
  });

  // TC-UX-PANEL-06 — the routing verdict can be read in Japanese, while the
  // English reading stays exactly the text the engine has always produced.
  describe('routingVerdict', () => {
    const toEn = createTranslator('en', en);
    const toJa = createTranslator('ja', ja);
    const primary = makeRouteEntry('r1', '203.0.113.0/24', '192.168.1.2');
    const backup = makeRouteEntry('r1', '0.0.0.0/0', '192.168.1.9');
    const cases = [
      ['a matched route', buildRoutingDecision('203.0.113.5', [primary], primary)],
      ['a fallback route', buildRoutingDecision('203.0.113.5', [primary, backup], backup)],
      ['no reachable route', buildRoutingDecision('203.0.113.5', [primary], null)],
      ['no matching route', buildRoutingDecision('198.51.100.1', [primary])],
    ] as const;

    it.each(cases)('reads %s in English exactly as the explanation does', (_name, decision) => {
      const verdict = routingVerdict(decision);
      expect(toEn(verdict.key, verdict.params)).toBe(decision.explanation);
    });

    it.each(cases)('reads %s in Japanese', (_name, decision) => {
      const verdict = routingVerdict(decision);
      const text = toJa(verdict.key, verdict.params);
      expect(text).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      expect(text).not.toContain('{{');
    });

    it('names the matched route in the English verdict', () => {
      const decision = buildRoutingDecision('203.0.113.5', [primary], primary);
      const verdict = routingVerdict(decision);
      expect(toEn(verdict.key, verdict.params)).toBe(
        'Matched 203.0.113.0/24 via 192.168.1.2 (static, AD=1)',
      );
    });
  });
});
