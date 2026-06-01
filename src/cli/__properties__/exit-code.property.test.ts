/**
 * @property-seed 0x5a4b78 CLI property-suite seed.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { EditSession } from '../../sandbox/EditSession';
import { encodeSession } from '../../sandbox/session-io/codec';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { runNetlabRun } from '../runner';

const sessionText = JSON.stringify(
  encodeSession(EditSession.empty(), {
    scenarioId: 'basic-arp',
    initialParameters: DEFAULT_PARAMETERS,
    savedAt: '2026-05-09T00:00:00.000Z',
  }),
);

describe('CLI exit code', () => {
  it('equals the failure count for assertion batches', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 5 }), async (failureCount) => {
        const assertions = [
          ...Array.from({ length: failureCount }, () => ({
            kind: 'route-table-contains',
            nodeId: 'router-1',
            destination: '203.0.113.0/24',
            nextHop: 'missing',
          })),
          {
            kind: 'route-table-contains',
            nodeId: 'router-1',
            destination: '203.0.113.0/24',
            nextHop: 'direct',
          },
        ];

        const result = await runNetlabRun({
          scenarioId: 'basic-arp',
          sessionText,
          assertionsText: JSON.stringify(assertions),
          format: 'json',
        });

        expect(result.exitCode).toBe(failureCount);
      }),
      { seed: 0x5a4b78, numRuns: 100 },
    );
  });
});
