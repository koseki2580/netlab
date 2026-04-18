import { describe, expect, it } from 'vitest';
import {
  IPV4_DEFAULT_PMTU,
  IPV4_MIN_PMTU,
  PathMtuCache,
} from './PathMtuCache';

describe('PathMtuCache', () => {
  describe('get', () => {
    it('returns IPV4_DEFAULT_PMTU when dstIp is not cached', () => {
      const cache = new PathMtuCache();

      expect(cache.get('203.0.113.10')).toBe(IPV4_DEFAULT_PMTU);
    });

    it('returns the cached value when set', () => {
      const cache = new PathMtuCache();

      cache.update('203.0.113.10', 1200);

      expect(cache.get('203.0.113.10')).toBe(1200);
    });
  });

  describe('update', () => {
    it('caches a new destination on first update', () => {
      const cache = new PathMtuCache();

      cache.update('203.0.113.10', 1200);

      expect(cache.get('203.0.113.10')).toBe(1200);
      expect(cache.size()).toBe(1);
    });

    it('overwrites when the new value is strictly smaller', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1300);

      cache.update('203.0.113.10', 1200);

      expect(cache.get('203.0.113.10')).toBe(1200);
    });

    it('does NOT overwrite when the new value is greater than the cached value', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1200);

      cache.update('203.0.113.10', 1300);

      expect(cache.get('203.0.113.10')).toBe(1200);
    });

    it('does NOT overwrite when the new value is equal to the cached value', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1200);

      cache.update('203.0.113.10', 1200);

      expect(cache.get('203.0.113.10')).toBe(1200);
      expect(cache.size()).toBe(1);
    });

    it('clamps values below IPV4_MIN_PMTU up to IPV4_MIN_PMTU', () => {
      const cache = new PathMtuCache();

      cache.update('203.0.113.10', 32);

      expect(cache.get('203.0.113.10')).toBe(IPV4_MIN_PMTU);
    });

    it('ignores zero values', () => {
      const cache = new PathMtuCache();

      cache.update('203.0.113.10', 0);

      expect(cache.get('203.0.113.10')).toBe(IPV4_DEFAULT_PMTU);
      expect(cache.size()).toBe(0);
    });

    it('ignores negative values', () => {
      const cache = new PathMtuCache();

      cache.update('203.0.113.10', -1);

      expect(cache.get('203.0.113.10')).toBe(IPV4_DEFAULT_PMTU);
      expect(cache.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('empties the cache', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1200);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('203.0.113.10')).toBe(IPV4_DEFAULT_PMTU);
    });
  });

  describe('snapshot', () => {
    it('returns a plain object for rendering', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1200);
      cache.update('198.51.100.5', 900);

      expect(cache.snapshot()).toEqual({
        '203.0.113.10': 1200,
        '198.51.100.5': 900,
      });
    });

    it('is a copy and mutating the result does not affect the cache', () => {
      const cache = new PathMtuCache();
      cache.update('203.0.113.10', 1200);

      const snapshot = cache.snapshot();
      snapshot['203.0.113.10'] = 68;
      snapshot['198.51.100.5'] = 576;

      expect(cache.snapshot()).toEqual({
        '203.0.113.10': 1200,
      });
    });
  });
});
