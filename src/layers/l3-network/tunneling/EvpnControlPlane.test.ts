import { describe, expect, it } from 'vitest';
import { advertiseType2, advertiseType5, learnType2 } from './EvpnControlPlane';

describe('EVPN control plane', () => {
  it('advertises and learns Type-2 MAC/IP routes', () => {
    const route = advertiseType2({
      rd: { type: 0, value: '65000:10000' },
      vni: 10000,
      mac: '02:00:00:00:00:0a',
      ip: '10.0.0.10',
      originVtepIp: '192.0.2.1',
    });

    expect(route.kind).toBe('evpn-mac-ip');
    expect(learnType2(route)).toEqual({
      vni: 10000,
      mac: '02:00:00:00:00:0a',
      ip: '10.0.0.10',
      remoteVtepIp: '192.0.2.1',
    });
  });

  it('advertises Type-5 prefixes', () => {
    expect(
      advertiseType5({
        rd: { type: 0, value: '65000:10000' },
        vni: 10000,
        prefix: '10.0.0.0/24',
        gatewayIp: '10.0.0.1',
        originVtepIp: '192.0.2.1',
      }).kind,
    ).toBe('evpn-ip-prefix');
  });
});
