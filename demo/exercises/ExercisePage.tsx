import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGalleryLocale, useT } from '../localeContext';
import { exerciseById, nextExerciseId } from './exerciseSource';
import type { AttemptStore } from './store/attemptStore';
import { cycleSet } from './ui/cycleFlow';
import { ExerciseRunner } from './ui/ExerciseRunner';
import { ExerciseShell, exercisePath } from './ui/pageParts';
import { CARD, COLUMN, LINK, PAGE, PRIMARY } from './ui/styles';
import { StorageNotice, useExerciseStore } from './ui/useExerciseStore';

/**
 * One exercise, by id. The address also says what the attempt is part of:
 * plain practice, or the "before" or "after" set of a study cycle
 * (`?context=pre&cycle=<id>`), which decides where "next" leads.
 */
export function ExercisePageBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const navigate = useNavigate();
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const [search] = useSearchParams();
  const { store, state } = useExerciseStore(injected);
  const exercise = useMemo(() => exerciseById(exerciseId, locale), [exerciseId, locale]);

  const contextParam = search.get('context');
  const cycle = state.cycles.find((entry) => entry.id === search.get('cycle'));
  // A cycle the store does not know cannot be continued: the attempt is plain practice.
  const run: { context: 'pre' | 'post'; cycleId: string } | undefined =
    cycle && (contextParam === 'pre' || contextParam === 'post')
      ? { context: contextParam, cycleId: cycle.id }
      : undefined;

  if (!exercise) {
    return (
      <div style={PAGE}>
        <div style={COLUMN}>
          <section data-testid="exercise-missing" style={{ ...CARD, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0 }}>
              {t(
                'This exercise could not be found. It may have been replaced by a newer one.',
                'この問題は見つかりませんでした。新しい問題に入れかわった可能性があります。',
              )}
            </p>
            <div>
              <Link to="/exercises" style={PRIMARY}>
                {t('Go to the exercises', '実習問題の一覧へ')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const set = cycle && run ? cycleSet(cycle, run.context) : [];
  const place = set.indexOf(exercise.id);
  const following = place === -1 ? undefined : set[place + 1];

  const onNext = () => {
    if (run) {
      void navigate(
        following ? exercisePath(following, run) : `/exercises/level/${exercise.level}`,
      );
      return;
    }
    const nextId = nextExerciseId(exercise.level, {
      avoidTemplateIds: [exercise.templateId],
      seenIds: state.attempts.map((attempt) => attempt.exerciseId),
    });
    void navigate(nextId ? exercisePath(nextId) : `/exercises/level/${exercise.level}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav
        aria-label={t('Where you are', '現在の場所')}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '0 16px',
          borderBottom: '1px solid var(--netlab-border)',
          color: 'var(--netlab-text-primary)',
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        <Link
          to={`/exercises/level/${exercise.level}`}
          data-testid="exercise-back-to-level"
          style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
        >
          {t(`← Level ${exercise.level} exercises`, `← レベル ${exercise.level} の問題`)}
        </Link>
        {run && place !== -1 ? (
          <span data-testid="exercise-cycle-progress">
            {run.context === 'pre'
              ? t(
                  `Before studying: ${place + 1} of ${set.length}`,
                  `学ぶ前の確認：${set.length} 問中 ${place + 1} 問目`,
                )
              : t(
                  `After studying: ${place + 1} of ${set.length}`,
                  `学んだあとの確認：${set.length} 問中 ${place + 1} 問目`,
                )}
          </span>
        ) : null}
      </nav>
      {store.status().persistence === 'memory' ? (
        <div style={{ padding: '8px 16px', flexShrink: 0 }}>
          <StorageNotice store={store} />
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <ExerciseRunner
            // A new exercise, or the same one in another set, starts from nothing.
            key={`${exercise.id}|${run?.context ?? ''}|${run?.cycleId ?? ''}`}
            exercise={exercise}
            store={store}
            context={run?.context ?? 'practice'}
            {...(run ? { cycleId: run.cycleId } : {})}
            onNext={onNext}
            {...(run && !following
              ? { nextLabel: t('Finish this set →', 'この確認をおわる →') }
              : {})}
          />
        </div>
      </div>
    </div>
  );
}

export default function ExercisePage() {
  return (
    <ExerciseShell
      title={{ en: 'Hands-on exercise', ja: '実習問題' }}
      desc={{
        en: 'Change the settings, then check with the real simulator.',
        ja: '設定を変えて、本物のシミュレータでたしかめます。',
      }}
    >
      <ExercisePageBody />
    </ExerciseShell>
  );
}
