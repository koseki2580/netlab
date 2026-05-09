import { describe, expect, it } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import { encodeSession } from '../sandbox/session-io/codec';
import { DEFAULT_PARAMETERS } from '../sandbox/types';
import { runNetlabRun } from './runner';

function exportedSessionText() {
  return JSON.stringify(
    encodeSession(EditSession.empty(), {
      scenarioId: 'basic-arp',
      initialParameters: DEFAULT_PARAMETERS,
      savedAt: '2026-05-09T00:00:00.000Z',
    }),
  );
}

describe('runNetlabRun', () => {
  it('returns TAP output and exit code 0 when assertions pass', async () => {
    const result = await runNetlabRun({
      scenarioId: 'basic-arp',
      sessionText: exportedSessionText(),
      assertionsText: JSON.stringify([
        { kind: 'packet-reaches', source: 'client-1', destination: '203.0.113.10', within: 100 },
      ]),
      format: 'tap',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok 1 - packet client-1 reached 203.0.113.10');
  });

  it('uses the assertion failure count as the exit code', async () => {
    const result = await runNetlabRun({
      scenarioId: 'basic-arp',
      sessionText: exportedSessionText(),
      assertionsText: JSON.stringify([
        { kind: 'packet-reaches', source: 'client-1', destination: '203.0.113.10', within: 1 },
        {
          kind: 'route-table-contains',
          nodeId: 'router-1',
          destination: '203.0.113.0/24',
          nextHop: 'direct',
        },
      ]),
      format: 'tap',
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('not ok 1 -');
    expect(result.stdout).toContain('ok 2 -');
  });

  it('returns a JSON summary with deterministic counts', async () => {
    const result = await runNetlabRun({
      scenarioId: 'basic-arp',
      sessionText: exportedSessionText(),
      assertionsText: JSON.stringify([
        {
          kind: 'route-table-contains',
          nodeId: 'router-1',
          destination: '203.0.113.0/24',
          nextHop: 'direct',
        },
      ]),
      format: 'json',
    });

    expect(JSON.parse(result.stdout)).toMatchObject({
      scenarioId: 'basic-arp',
      passCount: 1,
      failCount: 0,
    });
  });
});
