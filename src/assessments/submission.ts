import { encodeSession } from '../sandbox/session-io/encode';
import type { ExportedSession } from '../sandbox/session-io/schema';
import type { EditSession } from '../sandbox/EditSession';
import type { ProtocolParameterSet } from '../sandbox/types';
import type { AssessmentHintUsage, AssessmentStatus } from './types';

export interface AssessmentSubmission {
  readonly kind: 'assessment-submission';
  readonly schemaVersion: 1;
  readonly session: ExportedSession;
  readonly rubricId: string;
  readonly scenarioId: string;
  readonly hintsUsed: readonly AssessmentHintUsage[];
  readonly passedAt: string;
  readonly elapsedMs: number;
  readonly learnerNotes: string;
}

export interface CreateAssessmentSubmissionOptions {
  readonly scenarioId: string;
  readonly rubricId: string;
  readonly status: AssessmentStatus;
  readonly session: EditSession;
  readonly initialParameters: ProtocolParameterSet;
  readonly learnerNotes: string;
  readonly savedAt?: string | Date;
}

function isoSavedAt(savedAt: string | Date | undefined): string {
  if (savedAt instanceof Date) return savedAt.toISOString();
  return savedAt ?? new Date().toISOString();
}

function timestampForFilename(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

export function createAssessmentSubmission(
  options: CreateAssessmentSubmissionOptions,
): AssessmentSubmission {
  const savedAt = isoSavedAt(options.savedAt);
  const elapsedMs =
    options.status.passedAt === null
      ? 0
      : Math.max(0, options.status.passedAt - options.status.startedAt);

  return {
    kind: 'assessment-submission',
    schemaVersion: 1,
    session: encodeSession(options.session, {
      scenarioId: options.scenarioId,
      initialParameters: options.initialParameters,
      savedAt,
    }),
    rubricId: options.rubricId,
    scenarioId: options.scenarioId,
    hintsUsed: options.status.hintsUsed,
    passedAt: savedAt,
    elapsedMs,
    learnerNotes: options.learnerNotes,
  };
}

export function assessmentSubmissionFilename(
  scenarioId: string,
  rubricId: string,
  date = new Date(),
): string {
  return `netlab-assessment-${scenarioId}-${rubricId}-${timestampForFilename(date)}.netlabassess.json`;
}

export function downloadAssessmentSubmission(submission: AssessmentSubmission): void {
  const blob = new Blob([JSON.stringify(submission, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = assessmentSubmissionFilename(submission.scenarioId, submission.rubricId);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
