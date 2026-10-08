import { useState, type ReactNode } from 'react';
import DemoShell from '../../DemoShell';
import { readLearningLocale } from '../../learning/learningLocale';
import type { ExerciseLevel, Localised } from '../model/types';
import { isSolved, isSolvedAfterTries } from '../store/estimate';
import type { AttemptRecord } from '../store/types';

/** What the exercise pages share besides the exercise itself. */

export const LEVEL_NAMES: Readonly<Record<ExerciseLevel, Localised>> = {
  1: { en: 'First steps: addresses and cables', ja: 'はじめて：アドレスと線' },
  2: { en: 'Switches and simple routes', ja: 'スイッチと、かんたんな経路' },
  3: { en: 'Choosing routes, NAT and filters', ja: '経路の選び方・NAT・通信の制限' },
  4: { en: 'Finding and fixing several faults', ja: 'いくつもの原因を見つけて直す' },
};

export function parseLevel(text: string | undefined): ExerciseLevel | undefined {
  return ([1, 2, 3, 4] as const).find((level) => String(level) === text);
}

export function exercisePath(
  exerciseId: string,
  run?: { readonly context: 'pre' | 'post'; readonly cycleId: string },
): string {
  const base = `/exercises/do/${encodeURIComponent(exerciseId)}`;
  return run ? `${base}?context=${run.context}&cycle=${encodeURIComponent(run.cycleId)}` : base;
}

/** How an attempt ended, in the words the learner is shown everywhere. */
export function outcomeWords(attempt: AttemptRecord): Localised {
  if (isSolved(attempt)) return { en: 'Solved', ja: '解けた' };
  if (isSolvedAfterTries(attempt)) {
    return { en: 'Solved after several tries', ja: '何度かためして解けた' };
  }
  if (attempt.outcome === 'passed' && !attempt.revealed) {
    return { en: 'Solved with help', ja: 'ヒントを使って解けた' };
  }
  if (attempt.revealed) return { en: 'Answer shown', ja: '答えを見た' };
  return attempt.checkPresses > 0
    ? { en: 'Not solved yet', ja: 'まだ解けていない' }
    : { en: 'Opened only', ja: '開いただけ' };
}

/** The lesson shell with its title and summary in the learner's language, as the final test does it. */
export function ExerciseShell({
  title,
  desc,
  children,
}: {
  title: Localised;
  desc: Localised;
  children: ReactNode;
}) {
  const [locale] = useState(readLearningLocale);
  return (
    <DemoShell title={title[locale]} desc={desc[locale]}>
      {children}
    </DemoShell>
  );
}
