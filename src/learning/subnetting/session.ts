import { generateProblem } from './generator';
import type { SubnetProblem, SubnetQuestionKind } from './types';

export const DEFAULT_SESSION_LENGTH = 10;

/** One graded answer within a drill session. */
export interface DrillAnswer {
  readonly kind: SubnetQuestionKind;
  readonly correct: boolean;
}

/**
 * A measurable practice run: a fixed number of questions from one seed, with
 * the answers recorded so far. Immutable — every transition returns a new value.
 */
export interface DrillSession {
  readonly seed: number;
  readonly length: number;
  readonly answers: readonly DrillAnswer[];
}

/** Per-question-kind tally used to tell the learner what to drill next. */
export interface KindMastery {
  readonly kind: SubnetQuestionKind;
  readonly correct: number;
  readonly total: number;
}

/** End-of-session report: overall score plus per-skill mastered/review split. */
export interface DrillSummary {
  readonly correct: number;
  readonly total: number;
  readonly perKind: readonly KindMastery[];
  readonly mastered: readonly SubnetQuestionKind[];
  readonly review: readonly SubnetQuestionKind[];
}

export function startSession(seed: number, length: number = DEFAULT_SESSION_LENGTH): DrillSession {
  return { seed, length: Math.max(1, Math.floor(length)), answers: [] };
}

/** Zero-based index of the question the learner is currently on. */
export function currentIndex(session: DrillSession): number {
  return session.answers.length;
}

/** The problem for the current question (or the last one once complete). */
export function sessionProblem(session: DrillSession): SubnetProblem {
  const index = Math.min(currentIndex(session), session.length - 1);
  return generateProblem(session.seed, index);
}

export function isComplete(session: DrillSession): boolean {
  return session.answers.length >= session.length;
}

/** Append a graded answer; a no-op once the session is already complete. */
export function recordAnswer(
  session: DrillSession,
  problem: SubnetProblem,
  correct: boolean,
): DrillSession {
  if (isComplete(session)) return session;
  return {
    ...session,
    answers: [...session.answers, { kind: problem.kind, correct }],
  };
}

/**
 * Summarize the session. A kind counts as *mastered* when every question of
 * that kind was answered correctly, and lands in *review* when at least one was
 * missed — so the learner gets an actionable "drill these next" list.
 */
export function sessionSummary(session: DrillSession): DrillSummary {
  const byKind = new Map<SubnetQuestionKind, { correct: number; total: number }>();
  for (const answer of session.answers) {
    const entry = byKind.get(answer.kind) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answer.correct) entry.correct += 1;
    byKind.set(answer.kind, entry);
  }

  const perKind: KindMastery[] = [...byKind.entries()]
    .map(([kind, { correct, total }]) => ({ kind, correct, total }))
    .sort((a, b) => a.kind.localeCompare(b.kind));

  return {
    correct: session.answers.filter((answer) => answer.correct).length,
    total: session.answers.length,
    perKind,
    mastered: perKind.filter((entry) => entry.correct === entry.total).map((entry) => entry.kind),
    review: perKind.filter((entry) => entry.correct < entry.total).map((entry) => entry.kind),
  };
}
