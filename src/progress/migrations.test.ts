import { describe, expect, it } from 'vitest';
import { CURRENT_PROGRESS_SCHEMA_VERSION, parseProgressJson } from './migrations';

describe('progress migrations', () => {
  it('accepts current schema progress documents', () => {
    const result = parseProgressJson(
      JSON.stringify({
        schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
        learnerId: 'learner-1',
        completions: [
          {
            kind: 'assessment',
            id: 'ospf-convergence',
            completedAt: '2026-05-11T00:00:00.000Z',
            score: { passed: 3, total: 3 },
          },
        ],
        updatedAt: '2026-05-11T00:00:00.000Z',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.progress.learnerId).toBe('learner-1');
      expect(result.progress.completions).toHaveLength(1);
    }
  });

  it('migrates legacy v0 tutorial arrays into v1 completions', () => {
    const result = parseProgressJson(
      JSON.stringify({
        schemaVersion: 0,
        learnerId: 'learner-1',
        tutorials: ['sandbox-intro-tcp'],
        updatedAt: '2026-05-10T00:00:00.000Z',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.progress.schemaVersion).toBe(1);
      expect(result.progress.completions[0]).toMatchObject({
        kind: 'tutorial',
        id: 'sandbox-intro-tcp',
      });
    }
  });

  it('rejects unknown schemas and invalid json', () => {
    expect(parseProgressJson('{nope').ok).toBe(false);
    expect(parseProgressJson(JSON.stringify({ schemaVersion: 99, learnerId: 'a' }))).toEqual({
      ok: false,
      reason: 'unknown-schema',
    });
  });
});
