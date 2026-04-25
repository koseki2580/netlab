import { describe, expect, it } from 'vitest';
import { NetlabError } from '../../errors';
import { EditSession } from '../EditSession';
import type { Edit } from '../edits';
import { DEFAULT_PARAMETERS } from '../types';
import { decodeSession, encodeSession, readExportedSession } from './codec';

const mtuEdit: Edit = {
  kind: 'interface.mtu',
  target: { kind: 'interface', nodeId: 'router-r1', ifaceId: 'tun0' },
  before: 1500,
  after: 500,
};

describe('sandbox session JSON codec', () => {
  it('exports backing history, head cursor, schema version, parameters, and metadata', () => {
    const session = EditSession.empty().push({ kind: 'noop' }).push(mtuEdit).undo();

    expect(
      encodeSession(session, {
        scenarioId: 'fragmented-echo',
        initialParameters: DEFAULT_PARAMETERS,
        savedAt: '2026-04-21T10:30:00.000Z',
        toolVersion: 'test-version',
      }),
    ).toEqual({
      schemaVersion: 1,
      scenarioId: 'fragmented-echo',
      initialScenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      backing: [{ kind: 'noop' }, mtuEdit],
      head: 1,
      savedAt: '2026-04-21T10:30:00.000Z',
      toolVersion: 'test-version',
    });
  });

  it('round-trips redo-tail history structurally', () => {
    const session = EditSession.empty().push({ kind: 'noop' }).push(mtuEdit).undo();
    const exported = encodeSession(session, {
      scenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      savedAt: '2026-04-21T10:30:00.000Z',
    });

    expect(decodeSession(exported)).toEqual(session);
  });

  it('rejects unsupported schema versions with a session-io error code', () => {
    const payload = {
      schemaVersion: 99,
      scenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      backing: [],
      head: 0,
      savedAt: '2026-04-21T10:30:00.000Z',
      toolVersion: 'test-version',
    };

    expect(() => decodeSession(payload)).toThrow(NetlabError);
    try {
      decodeSession(payload);
    } catch (error) {
      expect(NetlabError.isInstance(error) ? error.code : null).toBe(
        'session-io/unsupported-schema',
      );
    }
  });

  it('rejects sessions over the file import edit cap', () => {
    const payload = {
      schemaVersion: 1,
      scenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      backing: Array.from({ length: 5001 }, () => ({ kind: 'noop' })),
      head: 5001,
      savedAt: '2026-04-21T10:30:00.000Z',
      toolVersion: 'test-version',
    };

    expect(() => decodeSession(payload)).toThrow(/at most 5000 edits/);
  });

  it('rejects invalid edits with a session-io error code', () => {
    const payload = {
      schemaVersion: 1,
      scenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      backing: [{ kind: 'noop' }, { kind: 'param.set', key: 'unknown', before: 1, after: 2 }],
      head: 2,
      savedAt: '2026-04-21T10:30:00.000Z',
      toolVersion: 'test-version',
    };

    expect(() => readExportedSession(payload)).toThrow(/invalid edits/);
  });
});
