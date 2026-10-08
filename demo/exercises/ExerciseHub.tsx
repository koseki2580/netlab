import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../localeContext';
import { nextExerciseId } from './exerciseSource';
import type { AttemptStore } from './store/attemptStore';
import { EXERCISE_LEVELS, explain, headline, levelSummary } from './store/estimate';
import { ExerciseShell, LEVEL_NAMES, exercisePath } from './ui/pageParts';
import { CARD, COLUMN, LINK, MUTED, PAGE, PRIMARY, SECONDARY } from './ui/styles';
import { StorageNotice, useExerciseStore } from './ui/useExerciseStore';

/**
 * The way in: four levels, each with where the learner stands in one sentence
 * and one button that opens the next exercise of that level.
 */
export function ExerciseHubBody({ store: injected }: { store?: AttemptStore }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { store, state } = useExerciseStore(injected);
  const seenIds = state.attempts.map((attempt) => attempt.exerciseId);
  const placed = state.placement;

  return (
    <div style={PAGE}>
      <div style={COLUMN}>
        <header style={{ display: 'grid', gap: 6, color: 'var(--netlab-text-primary)' }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{t('Hands-on exercises', '実習問題')}</h2>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            {t(
              'Each exercise gives you a small network that does not work yet. Change its settings, press Check, and the simulator tells you whether it works.',
              'うまく動いていない小さなネットワークが出てきます。設定を変えて「たしかめる」を押すと、動くかどうかをシミュレータが教えてくれます。',
            )}
          </p>
        </header>

        <StorageNotice store={store} />

        <section style={{ ...CARD, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0 }}>
            {placed
              ? t(
                  `Your level check suggested starting at level ${Math.max(1, placed.level)}.`,
                  `レベル判定の結果は「レベル ${Math.max(1, placed.level)} から」でした。`,
                )
              : t(
                  'Not sure where to start? A short check of a few exercises finds your level.',
                  'どこから始めるか迷ったら、数問のレベル判定で、合うレベルがわかります。',
                )}
          </p>
          <div>
            <Link to="/exercises/placement" data-testid="exercises-placement" style={SECONDARY}>
              {placed
                ? t('Check my level again', 'もう一度レベル判定をする')
                : t('Find my level', 'レベル判定をする')}
            </Link>
          </div>
        </section>

        {EXERCISE_LEVELS.map((level) => {
          const mine = state.attempts.filter((attempt) => attempt.level === level);
          const last = mine[mine.length - 1];
          const summary = levelSummary(state.attempts, level);
          const nextId = nextExerciseId(level, {
            // Never the kind of task just done, twice in a row (as on the level's own page).
            ...(last ? { avoidTemplateIds: [last.templateId] } : {}),
            seenIds,
          });
          return (
            <section
              key={level}
              data-testid={`exercises-level-${level}`}
              aria-label={t(`Level ${level}`, `レベル ${level}`)}
              style={{ ...CARD, display: 'grid', gap: 10 }}
            >
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {t(`Level ${level}`, `レベル ${level}`)}
                <span style={{ fontWeight: 400 }}> — {LEVEL_NAMES[level][locale]}</span>
              </h3>
              {/* One short line first; the whole rule after it, smaller. */}
              <p
                data-testid={`exercises-level-headline-${level}`}
                data-status={summary.status}
                style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}
              >
                {headline(summary, locale)}
              </p>
              <p
                data-testid={`exercises-level-status-${level}`}
                style={{ ...MUTED, margin: 0, fontSize: 14 }}
              >
                {explain(summary, locale)}
              </p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {nextId ? (
                  <Link
                    to={exercisePath(nextId)}
                    data-testid={`exercises-start-${level}`}
                    style={PRIMARY}
                  >
                    {mine.length > 0
                      ? t(`Continue level ${level}`, `レベル ${level} をつづける`)
                      : t(`Start level ${level}`, `レベル ${level} をはじめる`)}
                  </Link>
                ) : (
                  <span data-testid={`exercises-empty-${level}`} style={MUTED}>
                    {t('No exercises at this level yet.', 'このレベルの問題は、まだありません。')}
                  </span>
                )}
                <Link
                  to={`/exercises/level/${level}`}
                  data-testid={`exercises-level-link-${level}`}
                  style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
                >
                  {t('What this level covers', 'このレベルの内容を見る')}
                </Link>
              </div>
            </section>
          );
        })}

        <div>
          <Link to="/exercises/report" data-testid="exercises-report" style={SECONDARY}>
            {t('My record, and saving it', '自分の記録を見る・保存する')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExerciseHub() {
  return (
    <ExerciseShell
      title={{ en: 'Hands-on exercises', ja: '実習問題' }}
      desc={{
        en: 'Fix a small network by changing its settings; four levels.',
        ja: '設定を変えて、小さなネットワークを直します。4 つのレベルがあります。',
      }}
    >
      <ExerciseHubBody />
    </ExerciseShell>
  );
}
