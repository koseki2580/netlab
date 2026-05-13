import { describe, expect, it } from 'vitest';
import { distanceMeters, lossPctFromRssi, rssiDbm, wirelessLinkQosFromRssi } from './pathLoss';

describe('wireless path loss helpers', () => {
  it('computes node distance from canvas positions', () => {
    expect(distanceMeters({ x: 0, y: 0 }, { x: 300, y: 400 }, 10)).toBe(50);
  });

  it('maps stronger RSSI to lower deterministic loss', () => {
    const near = rssiDbm({ distanceMeters: 2, frequencyMhz: 2412, txPowerDbm: 20 });
    const far = rssiDbm({ distanceMeters: 300, frequencyMhz: 2412, txPowerDbm: 20 });

    expect(near).toBeGreaterThan(far);
    expect(lossPctFromRssi(near)).toBeLessThan(lossPctFromRssi(far));
  });

  it('produces a LinkQosConfig-compatible loss config', () => {
    expect(wirelessLinkQosFromRssi(-80, 42)).toEqual({
      lossPct: 60,
      lossSeed: 42,
    });
  });
});
