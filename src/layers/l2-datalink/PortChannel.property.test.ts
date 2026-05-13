import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { PortChannel } from './PortChannel';

describe('PortChannel properties', () => {
  it('chooses only active members and rebalances after member removal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 1, max: 65535 }),
        (memberCount, srcPort) => {
          const members = Array.from({ length: memberCount }, (_, index) => `p${index + 1}`);
          const channel = new PortChannel({ id: 'po1', activeMemberPortIds: members });
          const flow = {
            srcIp: '192.0.2.10',
            dstIp: '198.51.100.20',
            protocol: 6,
            srcPort,
            dstPort: 443,
          };

          expect(members).toContain(channel.selectMember(flow).memberPortId);
          expect(members.slice(1)).toContain(
            channel.withoutMember('p1').selectMember(flow).memberPortId,
          );
        },
      ),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
