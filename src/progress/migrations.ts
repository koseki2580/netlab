import {
  CURRENT_PROGRESS_SCHEMA_VERSION,
  type LearnerProgress,
  type ProgressCompletion,
  type ProgressImportError,
} from './types';

export { CURRENT_PROGRESS_SCHEMA_VERSION } from './types';

type ParseResult =
  | { readonly ok: true; readonly progress: LearnerProgress }
  | { readonly ok: false; readonly reason: ProgressImportError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidCompletion(value: unknown): value is ProgressCompletion {
  if (!isRecord(value)) return false;
  return (
    (value.kind === 'assessment' || value.kind === 'tutorial' || value.kind === 'sandbox-intro') &&
    typeof value.id === 'string' &&
    typeof value.completedAt === 'string'
  );
}

function emptyProgress(learnerId: string, updatedAt: string): LearnerProgress {
  return {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    learnerId,
    completions: [],
    updatedAt,
  };
}

function migrateV0(value: Record<string, unknown>): ParseResult {
  if (typeof value.learnerId !== 'string') {
    return { ok: false, reason: 'invalid-json' };
  }
  const updatedAt =
    typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString();
  const tutorials = Array.isArray(value.tutorials) ? value.tutorials : [];
  const completions = tutorials
    .filter((id): id is string => typeof id === 'string')
    .map((id) => ({
      kind: 'tutorial' as const,
      id,
      completedAt: updatedAt,
    }));

  return {
    ok: true,
    progress: {
      ...emptyProgress(value.learnerId, updatedAt),
      completions,
    },
  };
}

function parseV1(value: Record<string, unknown>): ParseResult {
  if (
    typeof value.learnerId !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !Array.isArray(value.completions) ||
    !value.completions.every(isValidCompletion)
  ) {
    return { ok: false, reason: 'invalid-json' };
  }

  return {
    ok: true,
    progress: {
      schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
      learnerId: value.learnerId,
      completions: value.completions,
      updatedAt: value.updatedAt,
    },
  };
}

export function parseProgressJson(json: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  if (!isRecord(value) || typeof value.schemaVersion !== 'number') {
    return { ok: false, reason: 'invalid-json' };
  }
  if (value.schemaVersion === 0) {
    return migrateV0(value);
  }
  if (value.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION) {
    return { ok: false, reason: 'unknown-schema' };
  }
  return parseV1(value);
}

export function createEmptyProgress(
  learnerId: string,
  now = new Date().toISOString(),
): LearnerProgress {
  return emptyProgress(learnerId, now);
}
