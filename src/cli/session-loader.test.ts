import { describe, expect, it } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import { encodeSession } from '../sandbox/session-io/codec';
import { DEFAULT_PARAMETERS } from '../sandbox/types';
import { decodeSessionInput } from './session-loader';

describe('decodeSessionInput', () => {
  it('decodes exported session JSON', () => {
    const exported = encodeSession(EditSession.empty().push({ kind: 'noop' }), {
      scenarioId: 'basic-arp',
      initialParameters: DEFAULT_PARAMETERS,
      savedAt: '2026-05-09T00:00:00.000Z',
    });

    const decoded = decodeSessionInput(JSON.stringify(exported));

    expect(decoded.session.edits).toEqual([{ kind: 'noop' }]);
    expect(decoded.exported.scenarioId).toBe('basic-arp');
  });

  it('rejects invalid JSON as an input error', () => {
    expect(() => decodeSessionInput('{')).toThrow(/not valid JSON/);
  });
});
