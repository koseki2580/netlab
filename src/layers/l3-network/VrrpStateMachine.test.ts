import { describe, expect, it } from 'vitest';
import {
  electVrrpMaster,
  masterDownIntervalMs,
  transitionVrrpState,
  virtualRouterMac,
} from './VrrpStateMachine';

describe('VrrpStateMachine', () => {
  it('derives VRRPv3 and HSRP virtual MAC addresses', () => {
    expect(virtualRouterMac({ vrid: 10, virtualIp: '192.0.2.1', priority: 110 })).toBe(
      '00:00:5e:00:01:0a',
    );
    expect(virtualRouterMac({ vrid: 10, virtualIp: '2001:db8::1', priority: 110 })).toBe(
      '00:00:5e:00:02:0a',
    );
    expect(
      virtualRouterMac({ vrid: 10, virtualIp: '192.0.2.1', priority: 110, hsrpMode: true }),
    ).toBe('00:00:0c:07:ac:0a');
  });

  it('elects the highest priority member and breaks ties by real IP', () => {
    expect(
      electVrrpMaster([
        {
          nodeId: 'r1',
          interfaceId: 'eth0',
          realIp: '192.0.2.2',
          config: { vrid: 1, virtualIp: '192.0.2.1', priority: 110 },
        },
        {
          nodeId: 'r2',
          interfaceId: 'eth0',
          realIp: '192.0.2.3',
          config: { vrid: 1, virtualIp: '192.0.2.1', priority: 110 },
        },
      ])?.nodeId,
    ).toBe('r2');
  });

  it('promotes backup after master-down timer expiry', () => {
    const state = transitionVrrpState(
      { role: 'backup', remainingMs: 0 },
      { type: 'masterDownTimerExpire' },
      { vrid: 1, virtualIp: '192.0.2.1', priority: 100 },
    );

    expect(state.role).toBe('master');
    expect(masterDownIntervalMs({ vrid: 1, virtualIp: '192.0.2.1', priority: 100 })).toBe(3609);
  });
});
