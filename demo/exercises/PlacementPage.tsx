import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../localeContext';
import { exerciseById, exercisePool, templateIdOf } from './exerciseSource';
import type { Exercise, ExerciseLevel } from './model/types';
import type { AttemptStore } from './store/attemptStore';
import { EXERCISE_LEVELS, isSolved } from './store/estimate';
import {
  PLACEMENT_MAX_EXERCISES,
  nextStep,
  placementResult,
  recordPlacementResult,
  startPlacement,
  type PlacementPoolEntry,
  type PlacementState,
} from './store/placement';
import { ExerciseRunner } from './ui/ExerciseRunner';
import { ExerciseShell } from './ui/pageParts';
import { CARD, COLUMN, LINK, PAGE, PRIMARY, SECONDARY } from './ui/styles';
import { StorageNotice, useExerciseStore } from './ui/useExerciseStore';

interface Running {
  readonly placement: PlacementState;
  /** The exercise on screen; null once the diagnostic is over. */
  readonly exercise: Exercise | null;
}

/**
 * The short diagnostic: one question, then exercises one after another, then
 * what it found and where to start. `store/placement.ts` decides the order;
 * this page supplies the exercises and reports how each went.
 */
export function PlacementPageBody({
  store: injected,
  now = () => Date.now(),
}: {
  store?: AttemptStore;
  now?: () => number;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const { store } = useExerciseStore(injected);
  const [running, setRunning] = useState<Running | null>(null);
  const pool = useMemo<readonly PlacementPoolEntry[]>(
    () =>
      EXERCISE_LEVELS.flatMap((level) =>
        exercisePool(level).map((id) => ({ id, templateId: templateIdOf(id), level })),
      ),
    [],
  );

  /** Keep what the diagnostic found and show it. */
  const end = (placement: PlacementState) => {
    store.setPlacement({
      level: placementResult(placement),
      exercises: placement.answers.length,
      completedAt: now(),
    });
    setRunning({ placement, exercise: null });
  };

  /** The next exercise for this state, or the end. */
  const advance = (placement: PlacementState) => {
    const seen = new Set(store.getState().attempts.map((attempt) => attempt.exerciseId));
    const candidates = nextStep(placement, pool)?.candidates ?? [];
    const pick = candidates.find((entry) => !seen.has(entry.id)) ?? candidates[0];
    const exercise = pick ? exerciseById(pick.id, locale) : undefined;
    if (exercise) setRunning({ placement, exercise });
    else end(placement);
  };

  if (running === null) {
    return (
      <div style={PAGE}>
        <div style={COLUMN}>
          <StorageNotice store={store} />
          <section data-testid="placement-question" style={{ ...CARD, display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{t('Find my level', 'レベル判定')}</h2>
            <p style={{ margin: 0 }}>
              {t(
                `One question, then a few exercises (${PLACEMENT_MAX_EXERCISES} at most). It is not a test: it only finds where to start.`,
                `質問が 1 つ、そのあと問題を数問（多くても ${PLACEMENT_MAX_EXERCISES} 問）解きます。テストではありません。始める場所を見つけるためのものです。`,
              )}
            </p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
              {t(
                'Have you ever set an address (an IP address) on a computer or a router yourself?',
                'パソコンやルータに、自分でアドレス（IP アドレス）を設定したことがありますか？',
              )}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                data-testid="placement-answer-no"
                onClick={() => advance(startPlacement(false))}
                style={{ ...PRIMARY, justifyContent: 'flex-start' }}
              >
                {t('No, or I am not sure', 'いいえ（わからない、も含む）')}
              </button>
              <button
                type="button"
                data-testid="placement-answer-yes"
                onClick={() => advance(startPlacement(true))}
                style={{ ...PRIMARY, justifyContent: 'flex-start' }}
              >
                {t('Yes', 'はい')}
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const { placement, exercise } = running;

  if (exercise === null) {
    const result = placementResult(placement);
    const startAt: ExerciseLevel =
      result === 0 ? 1 : result === 4 ? 4 : ((result + 1) as ExerciseLevel);
    return (
      <div style={PAGE}>
        <div style={COLUMN}>
          <section
            data-testid="placement-result"
            data-level={result}
            style={{ ...CARD, display: 'grid', gap: 12 }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {result === 0
                ? t('Start at level 1', 'レベル 1 から始めましょう')
                : t(`You can solve level ${result}`, `レベル ${result} まで解けます`)}
            </h2>
            <p style={{ margin: 0 }}>
              {placement.answers.length === 0
                ? t(
                    'There were no exercises to try, so start at level 1.',
                    '試せる問題がなかったので、レベル 1 から始めてください。',
                  )
                : result === 0
                  ? t(
                      `You tried ${placement.answers.length} ${placement.answers.length === 1 ? 'exercise' : 'exercises'}. No level had both of its exercises solved without help yet, and that is fine: level 1 starts from the very beginning.`,
                      `${placement.answers.length} 問に取り組みました。2 問ともヒントなしで解けたレベルは、まだありません。それで大丈夫です。レベル 1 は、いちばん最初から始まります。`,
                    )
                  : t(
                      `You tried ${placement.answers.length} exercises and solved both level ${result} exercises without help.${result < 4 ? ` Level ${startAt} is the next step.` : ' That is the top level.'}`,
                      `${placement.answers.length} 問に取り組み、レベル ${result} の 2 問を、どちらもヒントなしで解けました。${result < 4 ? `次はレベル ${startAt} です。` : 'いちばん上のレベルです。'}`,
                    )}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                to={`/exercises/level/${startAt}`}
                data-testid="placement-start"
                style={PRIMARY}
              >
                {t(`Go to level ${startAt}`, `レベル ${startAt} へ進む`)}
              </Link>
              <Link
                to="/exercises"
                style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
              >
                {t('All levels', 'レベルの一覧へ')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const number = placement.answers.length + 1;
  const finish = () => {
    // The latest placement attempt at this exercise says how it went.
    const record = [...store.getState().attempts]
      .reverse()
      .find((attempt) => attempt.exerciseId === exercise.id && attempt.context === 'placement');
    advance(
      recordPlacementResult(
        placement,
        record !== undefined && isSolved(record),
        exercise.templateId,
      ),
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        data-testid="placement-progress"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '4px 16px',
          borderBottom: '1px solid var(--netlab-border)',
          color: 'var(--netlab-text-primary)',
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        <span>
          {t(
            `Level check: exercise ${number} (${PLACEMENT_MAX_EXERCISES} at most)`,
            `レベル判定：${number} 問目（多くても ${PLACEMENT_MAX_EXERCISES} 問）`,
          )}
        </span>
        <button
          type="button"
          data-testid="placement-stop"
          onClick={() => end(placement)}
          style={{ ...SECONDARY, padding: '4px 10px' }}
        >
          {t('Stop here', 'ここでやめる')}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <ExerciseRunner
            key={exercise.id}
            exercise={exercise}
            store={store}
            context="placement"
            onNext={finish}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlacementPage() {
  return (
    <ExerciseShell
      title={{ en: 'Hands-on exercises: find my level', ja: '実習問題：レベル判定' }}
      desc={{
        en: 'A few exercises that find where to start.',
        ja: '数問で、始めるレベルを見つけます。',
      }}
    >
      <PlacementPageBody />
    </ExerciseShell>
  );
}
