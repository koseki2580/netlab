export const CURRENT_PROGRESS_SCHEMA_VERSION = 1;

export type ProgressCompletionKind = 'assessment' | 'tutorial' | 'sandbox-intro';

export interface ProgressScore {
  readonly passed: number;
  readonly total: number;
}

export interface ProgressCompletion {
  readonly kind: ProgressCompletionKind;
  readonly id: string;
  readonly completedAt: string;
  readonly label?: string;
  readonly score?: ProgressScore;
  readonly metadata?: Record<string, string | number | boolean>;
}

export interface LearnerProgress {
  readonly schemaVersion: typeof CURRENT_PROGRESS_SCHEMA_VERSION;
  readonly learnerId: string;
  readonly completions: readonly ProgressCompletion[];
  readonly updatedAt: string;
}

export interface ProgressCompletionInput {
  readonly kind: ProgressCompletionKind;
  readonly id: string;
  readonly label?: string;
  readonly score?: ProgressScore;
  readonly metadata?: Record<string, string | number | boolean>;
  readonly completedAt?: string;
}

export type ProgressImportError =
  | 'invalid-json'
  | 'unknown-schema'
  | 'wrong-learner-id'
  | 'invalid-learner-id';

export interface ProgressImportOptions {
  readonly forceLearnerId?: boolean;
}

export type ProgressImportResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: ProgressImportError };

export type ProgressStorageFailureReason = 'unavailable' | 'quota-exceeded';

export type ProgressStorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: ProgressStorageFailureReason };
