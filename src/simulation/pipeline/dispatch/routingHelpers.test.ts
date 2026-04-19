import { describe, expect, it } from 'vitest';
import type { RouteEntry } from '../../../types/routing';
import { makeRouteEntry } from '../../__fixtures__/helpers';
import {
  bestRoute,
  buildRoutingDecision,
  isPortBearingPayload,
  protocolName,
} from './routingHelpers';

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
        type: 'echo-request' as const,
        code: 0,
        payload: { layer: 'raw' as const, data: '' },
      };
      expect(isPortBearingPayload(icmp)).toBe(false);
    });
  });
});
