/**
 * @property-seed 0x5a4b78 CLI property-suite seed assigned by plan/78.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { EditSession } from '../../sandbox/EditSession';
import { encodeSession } from '../../sandbox/session-io/codec';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { runNetlabRun, type CliFormat } from '../runner';

const sessionText = JSON.stringify(
  encodeSession(EditSession.empty(), {
    scenarioId: 'basic-arp',
    initialParameters: DEFAULT_PARAMETERS,
    savedAt: '2026-05-09T00:00:00.000Z',
  }),
);

describe('CLI output determinism', () => {
  it('returns byte-equal output for repeated identical inputs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom<CliFormat>('tap', 'json'), async (format) => {
        const input = {
          scenarioId: 'basic-arp',
          sessionText,
          assertionsText: JSON.stringify([
            {
              kind: 'route-table-contains',
              nodeId: 'router-1',
              destination: '203.0.113.0/24',
              nextHop: 'direct',
            },
          ]),
          format,
        };
        const first = await runNetlabRun(input);
        const second = await runNetlabRun(input);

        expect(second).toEqual(first);
      }),
      { seed: 0x5a4b78, numRuns: 100 },
    );
  });
});
