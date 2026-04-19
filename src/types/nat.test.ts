import { describe, expect, it } from 'vitest';
import type { NatEntry, NatTable, NatType } from './nat';

describe('NatType discriminant', () => {
  it('snat and dnat are the only values', () => {
    const snat: NatType = 'snat';
    const dnat: NatType = 'dnat';
    expect(snat).toBe('snat');
    expect(dnat).toBe('dnat');
  });
});

describe('NatEntry shape', () => {
  it('contains all required fields', () => {
    const entry: NatEntry = {
      id: 'nat-1',
      proto: 'tcp',
      type: 'snat',
      insideLocalIp: '192.168.1.10',
      insideLocalPort: 12345,
      insideGlobalIp: '203.0.113.1',
      insideGlobalPort: 40000,
      outsidePeerIp: '8.8.8.8',
      outsidePeerPort: 443,
      createdAt: 1000,
      lastSeenAt: 2000,
    };
    expect(entry.type).toBe('snat');
    expect(entry.proto).toBe('tcp');
  });
});

describe('NatTable shape', () => {
  it('aggregates entries per router', () => {
    const table: NatTable = {
      routerId: 'router-1',
      entries: [],
    };
    expect(table.entries).toHaveLength(0);
  });
});
