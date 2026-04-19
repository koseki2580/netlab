import { describe, expect, it } from 'vitest';
import { compareBridgeId, formatBridgeId, makeBridgeId } from './BridgeId';

describe('BridgeId', () => {
  describe('makeBridgeId', () => {
    it('uses the given priority', () => {
      const bridgeId = makeBridgeId(4096, [{ macAddress: '02:00:00:10:00:01' }]);

      expect(bridgeId.priority).toBe(4096);
    });

    it('selects the lowest MAC across all ports', () => {
      const bridgeId = makeBridgeId(32768, [
        { macAddress: '02:00:00:10:00:ff' },
        { macAddress: '02:00:00:10:00:0a' },
        { macAddress: '02:00:00:10:00:80' },
      ]);

      expect(bridgeId.mac).toBe('02:00:00:10:00:0a');
    });

    it('normalizes MAC to lowercase colon-form', () => {
      const bridgeId = makeBridgeId(32768, [{ macAddress: '0200.0010.00AF' }]);

      expect(bridgeId.mac).toBe('02:00:00:10:00:af');
    });

    it('throws when ports array is empty', () => {
      expect(() => makeBridgeId(32768, [])).toThrow('BridgeId requires at least one port MAC');
    });
  });

  describe('compareBridgeId', () => {
    it('lower priority wins regardless of MAC', () => {
      expect(
        compareBridgeId(
          { priority: 4096, mac: 'ff:ff:ff:ff:ff:ff' },
          { priority: 8192, mac: '00:00:00:00:00:00' },
        ),
      ).toBeLessThan(0);
    });

    it('same priority: lower MAC wins', () => {
      expect(
        compareBridgeId(
          { priority: 32768, mac: '00:00:00:00:00:01' },
          { priority: 32768, mac: '00:00:00:00:00:02' },
        ),
      ).toBeLessThan(0);
    });

    it('identical priority and MAC returns 0', () => {
      expect(
        compareBridgeId(
          { priority: 32768, mac: 'aa:bb:cc:dd:ee:ff' },
          { priority: 32768, mac: 'aa:bb:cc:dd:ee:ff' },
        ),
      ).toBe(0);
    });

    it('normalizes MAC forms before comparing', () => {
      expect(
        compareBridgeId(
          { priority: 32768, mac: 'AABB.CCDD.EEFF' },
          { priority: 32768, mac: 'aa:bb:cc:dd:ee:ff' },
        ),
      ).toBe(0);
    });

    it('priority comparison overrides MAC', () => {
      expect(
        compareBridgeId(
          { priority: 4096, mac: 'ff:ff:ff:ff:ff:ff' },
          { priority: 32768, mac: '00:00:00:00:00:00' },
        ),
      ).toBeLessThan(0);
    });
  });

  describe('formatBridgeId', () => {
    it('renders as `${priority}/${mac}`', () => {
      expect(
        formatBridgeId({
          priority: 32768,
          mac: 'aa:bb:cc:dd:ee:01',
        }),
      ).toBe('32768/aa:bb:cc:dd:ee:01');
    });
  });
});
