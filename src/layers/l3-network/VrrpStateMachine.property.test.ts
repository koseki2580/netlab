import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { electVrrpMaster, masterDownIntervalMs, transitionVrrpState } from './VrrpStateMachine';

describe('VRRP properties', () => {
  it('elects at most one master per group deterministically', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 254 }), { minLength: 1, maxLength: 6 }),
        (priorities) => {
          const members = priorities.map((priority, index) => ({
            nodeId: `r${index}`,
            interfaceId: 'eth0',
            realIp: `192.0.2.${index + 1}`,
            config: { vrid: 7, virtualIp: '192.0.2.254', priority },
          }));
          const first = electVrrpMaster(members);
          const second = electVrrpMaster([...members].reverse());

          expect(first).toEqual(second);
        },
      ),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });

  it('promotes backups only after a finite master-down interval', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 254 }),
        fc.integer({ min: 100, max: 30_000 }),
        (priority, advertIntervalMs) => {
          const config = { vrid: 7, virtualIp: '192.0.2.254', priority, advertIntervalMs };
          const interval = masterDownIntervalMs(config);
          const promoted = transitionVrrpState(
            { role: 'backup', remainingMs: 0 },
            { type: 'masterDownTimerExpire' },
            config,
          );

          expect(interval).toBeGreaterThanOrEqual(3 * advertIntervalMs);
          expect(promoted.role).toBe('master');
        },
      ),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
