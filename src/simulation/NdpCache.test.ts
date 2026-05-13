import { describe, expect, it } from 'vitest';
import { NdpCache } from './NdpCache';

describe('NdpCache', () => {
  it('canonicalizes IPv6 keys on read and write', () => {
    const cache = new NdpCache();
    cache.set('2001:0db8::0001', '02:00:00:00:00:01');

    expect(cache.get('2001:db8::1')).toBe('02:00:00:00:00:01');
    expect(cache.toJSON()).toEqual({ '2001:db8::1': '02:00:00:00:00:01' });
  });
});
