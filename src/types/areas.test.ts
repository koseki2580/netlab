import { describe, expect, it } from 'vitest';
import type { AreaType, AreaVisualConfig, NetworkArea } from './areas';

describe('AreaType values', () => {
  it('built-in types', () => {
    const types: AreaType[] = ['private', 'public', 'dmz', 'management'];
    expect(types).toHaveLength(4);
  });

  it('accepts custom string (branded open string)', () => {
    const custom: AreaType = 'custom-zone';
    expect(custom).toBe('custom-zone');
  });
});

describe('NetworkArea shape', () => {
  it('requires core fields', () => {
    const area: NetworkArea = {
      id: 'area-1',
      name: 'Private LAN',
      type: 'private',
      subnet: '192.168.1.0/24',
      devices: ['pc1', 'pc2'],
    };
    expect(area.subnet).toBe('192.168.1.0/24');
    expect(area.devices).toHaveLength(2);
  });

  it('visualConfig is optional', () => {
    const area: NetworkArea = {
      id: 'area-2',
      name: 'DMZ',
      type: 'dmz',
      subnet: '10.0.0.0/24',
      devices: [],
    };
    expect(area.visualConfig).toBeUndefined();
  });

  it('accepts visualConfig with optional overrides', () => {
    const vc: AreaVisualConfig = {
      x: 100,
      y: 200,
      width: 400,
      height: 300,
      color: 'rgba(255,0,0,0.1)',
      label: 'DMZ Zone',
    };
    expect(vc.color).toBe('rgba(255,0,0,0.1)');
  });
});
