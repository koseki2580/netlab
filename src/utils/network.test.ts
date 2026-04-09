import { describe, expect, it } from 'vitest';
import { deriveDeterministicMac, extractHostname, isIpAddress } from './network';

describe('network utils', () => {
  it('extracts the hostname from an HTTP URL', () => {
    expect(extractHostname('http://web.example.com/api')).toBe('web.example.com');
  });

  it('detects IPv4 literals', () => {
    expect(isIpAddress('10.0.0.1')).toBe(true);
    expect(isIpAddress('web.example.com')).toBe(false);
  });

  it('derives stable locally administered MAC addresses', () => {
    expect(deriveDeterministicMac('client-1')).toBe(deriveDeterministicMac('client-1'));
    expect(deriveDeterministicMac('client-1')).not.toBe(deriveDeterministicMac('client-2'));
    expect(deriveDeterministicMac('client-1').startsWith('02:')).toBe(true);
  });
});
