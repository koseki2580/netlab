import { describe, expect, it } from 'vitest';
import { bucketFlow, hashFlow, serializeFlowKey, type FlowKey } from './hashFlow';

const FLOW: FlowKey = {
  srcIp: '10.0.0.10',
  dstIp: '203.0.113.10',
  protocol: 6,
  srcPort: 12345,
  dstPort: 443,
};

describe('hashFlow', () => {
  it('serializes the canonical 5-tuple without locale-sensitive formatting', () => {
    expect(serializeFlowKey(FLOW)).toBe('10.0.0.10|203.0.113.10|6|12345|443');
  });

  it('is stable for the same flow and seed', () => {
    expect(hashFlow(FLOW, 0x81e)).toBe(hashFlow(FLOW, 0x81e));
  });

  it('uses the router seed in bucket selection', () => {
    const left = bucketFlow(FLOW, 4, 0x1111);
    const right = bucketFlow(FLOW, 4, 0x2222);

    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeLessThan(4);
    expect(right).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThan(4);
    expect(hashFlow(FLOW, 0x1111)).not.toBe(hashFlow(FLOW, 0x2222));
  });
});
