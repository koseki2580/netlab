import { describe, expect, it } from 'vitest';
import { installVpnv4Route, lookupVrfRoute } from './MplsVrf';

const blue = {
  name: 'blue',
  rd: { type: 0, value: '65000:10' },
  importRts: [{ type: 0x0002, value: '65000:10' }],
  exportRts: [{ type: 0x0002, value: '65000:10' }],
  attachedInterfaces: ['ce'],
} as const;

describe('MPLS VRF', () => {
  it('imports only route-target matched VPNv4 routes', () => {
    const imported = installVpnv4Route([blue], {
      rd: blue.rd,
      prefix: '10.10.0.0/24',
      routeTargets: blue.exportRts,
      nextHopPe: '192.0.2.2',
      vpnLabel: 24010,
    });
    const ignored = installVpnv4Route([blue], {
      rd: { type: 0, value: '65000:20' },
      prefix: '10.20.0.0/24',
      routeTargets: [{ type: 0x0002, value: '65000:20' }],
      nextHopPe: '192.0.2.3',
      vpnLabel: 24020,
    });

    expect(lookupVrfRoute(imported[0]!, '10.10.0.5')?.vpnLabel).toBe(24010);
    expect(ignored[0]?.routes).toHaveLength(0);
  });
});
