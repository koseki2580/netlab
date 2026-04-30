import { describe, expect, it } from 'vitest';
import { NetlabError } from '../../errors';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { fromEngine } from '../SimulationSnapshot';
import type { SimulationSnapshot } from '../types';
import { isRecordedSession, validateRecordedSession } from './schema';
import {
  RECORDING_EVENT_LIMIT,
  RECORDING_SCHEMA_VERSION,
  RECORDING_TITLE_MAX_LENGTH,
  type RecordedEvent,
  type RecordedSession,
} from './types';

function snapshot(): SimulationSnapshot {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function metadata(overrides: Partial<RecordedSession['metadata']> = {}) {
  return {
    title: 'demo',
    author: 'tester',
    recordedAt: '2026-04-21T00:00:00.000Z',
    durationMs: 1000,
    toolVersion: '0.1.0',
    scenarioId: 'mtu',
    ...overrides,
  };
}

function validRecording(overrides: Partial<RecordedSession> = {}): RecordedSession {
  const initialSnapshot = snapshot();
  const events: RecordedEvent[] = [
    {
      seq: 0,
      kind: 'paused',
      stepIndex: 0,
      wallDeltaMs: 0,
      payload: {},
      resultingSnapshotId: '',
    },
  ];
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot,
    events,
    metadata: metadata(),
    ...overrides,
  };
}

function expectInvalidCode(action: () => void, code: string): void {
  try {
    action();
  } catch (error) {
    expect(NetlabError.isInstance(error)).toBe(true);
    if (NetlabError.isInstance(error)) {
      expect(error.code).toBe(code);
    }
    return;
  }
  throw new Error('expected validateRecordedSession to throw');
}

describe('validateRecordedSession', () => {
  it('returns the typed session when input is well-formed', () => {
    const out = validateRecordedSession(validRecording());
    expect(out.kind).toBe('recording');
    expect(out.schemaVersion).toBe(1);
    expect(out.events).toHaveLength(1);
    expect(out.metadata.scenarioId).toBe('mtu');
  });

  it('rejects non-object input', () => {
    expectInvalidCode(() => validateRecordedSession(null), 'sandbox-recording/invalid-recording');
    expectInvalidCode(() => validateRecordedSession('x'), 'sandbox-recording/invalid-recording');
  });

  it('rejects when "kind" discriminator is missing or wrong', () => {
    expectInvalidCode(() => {
      const r = { ...validRecording(), kind: 'session' as unknown };
      validateRecordedSession(r);
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects unsupported schema versions with a distinct error code', () => {
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), schemaVersion: 99 });
    }, 'sandbox-recording/unsupported-schema');
  });

  it('rejects missing schemaVersion', () => {
    const { schemaVersion: _ignored, ...rest } = validRecording();
    expectInvalidCode(() => validateRecordedSession(rest), 'sandbox-recording/invalid-recording');
  });

  it('rejects an initialSnapshot that is not a SimulationSnapshot', () => {
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), initialSnapshot: { foo: 1 } });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects when events is not an array', () => {
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), events: 'oops' });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects events that exceed RECORDING_EVENT_LIMIT', () => {
    const tooMany: RecordedEvent[] = Array.from({ length: RECORDING_EVENT_LIMIT + 1 }, (_, i) => ({
      seq: i,
      kind: 'paused',
      stepIndex: 0,
      wallDeltaMs: 0,
      payload: {},
      resultingSnapshotId: '',
    }));
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), events: tooMany });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects non-monotonic seq numbers', () => {
    const events: RecordedEvent[] = [
      {
        seq: 0,
        kind: 'paused',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: {},
        resultingSnapshotId: '',
      },
      {
        seq: 5,
        kind: 'paused',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: {},
        resultingSnapshotId: '',
      },
    ];
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), events });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects unknown event kinds', () => {
    const events = [
      {
        seq: 0,
        kind: 'mystery',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: {},
        resultingSnapshotId: '',
      },
    ];
    expectInvalidCode(() => {
      validateRecordedSession({ ...validRecording(), events });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects stepIndex below -1 and negative wallDeltaMs', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        events: [
          {
            seq: 0,
            kind: 'paused',
            stepIndex: -2,
            wallDeltaMs: 0,
            payload: {},
            resultingSnapshotId: '',
          },
        ],
      });
    }, 'sandbox-recording/invalid-recording');
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        events: [
          {
            seq: 0,
            kind: 'paused',
            stepIndex: 0,
            wallDeltaMs: -10,
            payload: {},
            resultingSnapshotId: '',
          },
        ],
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects an edit event whose payload does not contain a valid Edit', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        events: [
          {
            seq: 0,
            kind: 'edit',
            stepIndex: 0,
            wallDeltaMs: 0,
            payload: { edit: { kind: 'totally-bogus' } },
            resultingSnapshotId: 'snap-0',
          },
        ],
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('accepts a noop edit payload', () => {
    const out = validateRecordedSession({
      ...validRecording(),
      events: [
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: 'snap-0',
        },
      ],
    });
    expect(out.events[0]?.kind).toBe('edit');
  });

  it('rejects mode-changed payloads with invalid sandbox modes', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        events: [
          {
            seq: 0,
            kind: 'mode-changed',
            stepIndex: 0,
            wallDeltaMs: 0,
            payload: { from: 'live', to: 'beta' },
            resultingSnapshotId: '',
          },
        ],
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects tab-opened with empty tabId', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        events: [
          {
            seq: 0,
            kind: 'tab-opened',
            stepIndex: 0,
            wallDeltaMs: 0,
            payload: { tabId: '' },
            resultingSnapshotId: '',
          },
        ],
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects metadata.title longer than the limit', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        metadata: metadata({ title: 'a'.repeat(RECORDING_TITLE_MAX_LENGTH + 1) }),
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects metadata with unparsable recordedAt', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        metadata: metadata({ recordedAt: 'not-a-date' }),
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('rejects metadata with empty scenarioId', () => {
    expectInvalidCode(() => {
      validateRecordedSession({
        ...validRecording(),
        metadata: metadata({ scenarioId: '' }),
      });
    }, 'sandbox-recording/invalid-recording');
  });

  it('isRecordedSession returns false for invalid input and true for valid', () => {
    expect(isRecordedSession({})).toBe(false);
    expect(isRecordedSession(validRecording())).toBe(true);
  });
});
