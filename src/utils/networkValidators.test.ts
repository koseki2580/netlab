import { describe, expect, it } from 'vitest';
import {
  validateCidr,
  validateIpAddress,
  validateMacAddress,
  validateNoDuplicateIp,
  validatePrefixLength,
} from './networkValidators';

describe('validateIpAddress', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(validateIpAddress('192.168.1.10')).toBeNull();
    expect(validateIpAddress('0.0.0.0')).toBeNull();
    expect(validateIpAddress('255.255.255.255')).toBeNull();
  });

  it('rejects malformed IPv4 addresses', () => {
    expect(validateIpAddress('300.0.0.1')).toBe('Invalid IPv4 address');
    expect(validateIpAddress('10.0.0')).toBe('Invalid IPv4 address');
    expect(validateIpAddress('abc')).toBe('Invalid IPv4 address');
  });
});

describe('validateMacAddress', () => {
  it('accepts colon-delimited MAC addresses', () => {
    expect(validateMacAddress('aa:bb:cc:dd:ee:ff')).toBeNull();
    expect(validateMacAddress('00:00:00:00:00:00')).toBeNull();
  });

  it('rejects invalid MAC addresses', () => {
    expect(validateMacAddress('aa:bb:cc')).toBe('Invalid MAC address');
    expect(validateMacAddress('gg:00:00:00:00:00')).toBe('Invalid MAC address');
  });
});

describe('validatePrefixLength', () => {
  it('accepts prefix lengths between 0 and 32', () => {
    expect(validatePrefixLength(0)).toBeNull();
    expect(validatePrefixLength(24)).toBeNull();
    expect(validatePrefixLength(32)).toBeNull();
  });

  it('rejects values outside the IPv4 range', () => {
    expect(validatePrefixLength(-1)).toBe('Prefix length must be between 0 and 32');
    expect(validatePrefixLength(33)).toBe('Prefix length must be between 0 and 32');
  });
});

describe('validateCidr', () => {
  it('accepts valid CIDR notation', () => {
    expect(validateCidr('10.0.0.0/24')).toBeNull();
    expect(validateCidr('0.0.0.0/0')).toBeNull();
  });

  it('rejects malformed CIDR values', () => {
    expect(validateCidr('10.0.0.0')).toBe('Invalid CIDR');
    expect(validateCidr('10.0.0.0/33')).toBe('Invalid CIDR');
  });
});

describe('validateNoDuplicateIp', () => {
  it('rejects duplicate configured IP addresses', () => {
    expect(validateNoDuplicateIp('10.0.0.10', ['10.0.0.1', '10.0.0.10'])).toBe(
      'Duplicate IP address',
    );
  });

  it('accepts unique IP addresses', () => {
    expect(validateNoDuplicateIp('10.0.0.11', ['10.0.0.1', '10.0.0.10'])).toBeNull();
  });
});
