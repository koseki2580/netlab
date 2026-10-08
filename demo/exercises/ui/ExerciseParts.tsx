import { useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../../localeContext';
import type { CheckResult, DesignOption, Exercise, GradeResult } from '../model/types';
import type { AttemptPrediction } from '../store/types';
import { changeSentence, goalLabel } from './describe';
import { lessonTitle } from './lessonTitle';
import { CARD, LINK, MUTED, SECONDARY } from './styles';

/** The small pieces of the exercise page. `ExerciseRunner` holds the state and puts them together. */

const LIST: CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 };
const MARK: CSSProperties = {
  display: 'inline-block',
  minWidth: 64,
  marginRight: 8,
  padding: '0 8px',
  borderRadius: 999,
  border: '1px solid currentColor',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

type Mark = 'neutral' | 'done' | 'not-yet';

/** A mark in a symbol and a word, never colour alone. "Not yet" is orange, not red: it is not an error. */
function GoalMark({ mark }: { mark: Mark }) {
  const t = useT();
  const [symbol, word, color] =
    mark === 'done'
      ? ['✓', t('Done', 'できた'), 'var(--netlab-accent-green)']
      : mark === 'not-yet'
        ? ['△', t('Not yet', 'まだ'), 'var(--netlab-accent-orange)']
        : ['○', t('Goal', '目標'), 'var(--netlab-text-secondary)'];
  return (
    <span style={{ ...MARK, color }}>
      <span aria-hidden="true">{symbol} </span>
      {word}
    </span>
  );
}

// --- Brief -------------------------------------------------------------------

export function ExerciseBrief({
  exercise,
  results,
  compact = false,
}: {
  exercise: Exercise;
  /** The latest results that still describe the settings on screen; null before the first Check. */
  results: readonly CheckResult[] | null;
  /** A phone: tighter lines, so the diagram still fits under the brief. */
  compact?: boolean;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  return (
    <section data-testid="exercise-brief" style={{ display: 'grid', gap: compact ? 6 : 8 }}>
      <h2 style={{ margin: 0, fontSize: compact ? 18 : 20, lineHeight: 1.4 }}>
        {exercise.title[locale]}
      </h2>
      <p style={{ margin: 0, fontSize: compact ? 15 : 16, lineHeight: compact ? 1.6 : 1.8 }}>
        {exercise.brief[locale]}
      </p>
      <ul
        aria-label={t('Goals', '目標')}
        style={compact ? { ...LIST, gap: 4, fontSize: 15, lineHeight: 1.5 } : LIST}
      >
        {exercise.checks.map((check) => {
          const result = results?.find((entry) => entry.checkId === check.id);
          const mark: Mark = !result ? 'neutral' : result.passed ? 'done' : 'not-yet';
          return (
            <li key={check.id} data-testid={`exercise-goal-${check.id}`} data-mark={mark}>
              <GoalMark mark={mark} />
              {goalLabel(exercise, check)[locale]}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- Results -----------------------------------------------------------------

export function ResultPanel({
  exercise,
  grade,
  stale,
  busy,
  counted,
  doneSentence,
  onReplay,
  panelRef,
}: {
  exercise: Exercise;
  grade: GradeResult | null;
  /** The settings changed since this grade. */
  stale: boolean;
  busy: boolean;
  /** How the pass is recorded: without help, with a hint, or not at all (the answer was shown). */
  counted: 'solved' | 'helped' | 'not-counted';
  /** What the learner did, said back to them on a pass. */
  doneSentence: string;
  onReplay: (result: CheckResult) => void;
  panelRef: RefObject<HTMLDivElement>;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  // Failed goals first: they are what the learner has to read.
  const ordered = grade
    ? [...grade.results].sort((a, b) => Number(a.passed) - Number(b.passed))
    : [];
  const notYet = ordered.filter((result) => !result.passed).length;
  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      data-testid="exercise-result"
      data-passed={grade ? String(grade.passed) : undefined}
      data-stale={stale ? '' : undefined}
      style={{ outline: 'none', scrollMarginBottom: 80, scrollMarginTop: 12 }}
    >
      {busy ? <p style={{ margin: 0 }}>{t('Checking…', 'たしかめています…')}</p> : null}
      {grade && !busy ? (
        <div
          style={{
            ...CARD,
            display: 'grid',
            gap: 10,
            borderWidth: 2,
            borderColor: grade.passed
              ? 'var(--netlab-accent-green)'
              : 'var(--netlab-accent-orange)',
            opacity: stale ? 0.75 : 1,
          }}
        >
          <h3 data-testid="exercise-result-summary" style={{ margin: 0, fontSize: 18 }}>
            {grade.passed
              ? t('✓ It works!', '✓ できました！')
              : t(
                  `Not there yet: ${notYet} of ${ordered.length} ${ordered.length === 1 ? 'goal' : 'goals'} to go.`,
                  `もう少しです。目標 ${ordered.length} 個のうち、あと ${notYet} 個です。`,
                )}
          </h3>
          {stale ? (
            <p data-testid="exercise-result-stale" style={{ margin: 0 }}>
              {t(
                'You have changed a setting since this result. Press Check again.',
                'この結果のあとで設定を変えました。もう一度「たしかめる」を押してください。',
              )}
            </p>
          ) : null}
          {grade.passed ? (
            <p data-testid="exercise-result-done" style={{ margin: 0 }}>
              {doneSentence}{' '}
              {counted === 'helped'
                ? t(
                    'Recorded as “solved with help”, because you opened a hint.',
                    'ヒントを見たので、「ヒントを使って解けた」として記録しました。',
                  )
                : counted === 'not-counted'
                  ? t(
                      'This one is not counted as solved, because the answer was shown.',
                      '答えを見たあとなので、この問題は「解けた」には数えません。',
                    )
                  : ''}
            </p>
          ) : null}
          <ul style={LIST}>
            {ordered.map((result) => {
              const check = exercise.checks.find((entry) => entry.id === result.checkId);
              return (
                <li
                  key={result.checkId}
                  data-testid={`exercise-result-${result.checkId}`}
                  data-passed={String(result.passed)}
                  data-code={result.code}
                >
                  <div>
                    <GoalMark mark={result.passed ? 'done' : 'not-yet'} />
                    <strong>{check ? goalLabel(exercise, check)[locale] : result.checkId}</strong>
                  </div>
                  {/* A goal that is met needs no explanation; one that is not gets the grader's reason. */}
                  {result.passed ? null : (
                    <p style={{ margin: '4px 0 0' }}>{result.message[locale]}</p>
                  )}
                  {/* One thing to watch: every goal still missed, or on a pass the first goal. */}
                  {result.trace &&
                  !stale &&
                  (!result.passed || (grade.passed && result === ordered[0])) ? (
                    <button
                      type="button"
                      data-testid={`exercise-replay-${result.checkId}`}
                      onClick={() => onReplay(result)}
                      style={{ ...SECONDARY, marginTop: 6 }}
                    >
                      {t('▶ Watch it on the diagram', '▶ 図で見てみる')}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// --- Hints -------------------------------------------------------------------

export function HintBox({
  exercise,
  shownTier,
  onReveal,
}: {
  exercise: Exercise;
  /** The highest tier opened so far; 0 when none. */
  shownTier: 0 | 1 | 2 | 3;
  onReveal: (tier: 1 | 2 | 3) => void;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  const hints = [...exercise.hints].sort((a, b) => a.tier - b.tier);
  const next = hints.find((hint) => hint.tier > shownTier);
  if (hints.length === 0) return null;
  return (
    <section style={{ display: 'grid', gap: 8 }}>
      {hints
        .filter((hint) => hint.tier <= shownTier)
        .map((hint) => (
          <p
            key={hint.tier}
            data-testid={`exercise-hint-${hint.tier}`}
            style={{ ...CARD, margin: 0, padding: 12 }}
          >
            <strong>{t(`Hint ${hint.tier}: `, `ヒント ${hint.tier}：`)}</strong>
            {hint.text[locale]}
          </p>
        ))}
      {next ? (
        <div style={{ display: 'grid', gap: 4 }}>
          <div>
            <button
              type="button"
              data-testid="exercise-hint"
              onClick={() => onReveal(next.tier)}
              style={SECONDARY}
            >
              {shownTier === 0
                ? t('Show a hint', 'ヒントを見る')
                : t('Show the next hint', '次のヒントを見る')}
            </button>
          </div>
          {shownTier === 0 ? (
            <p data-testid="exercise-hint-cost" style={{ ...MUTED, margin: 0, fontSize: 14 }}>
              {t(
                'If you open a hint, this exercise is recorded as “solved with help”.',
                'ヒントを見ると、この問題は「ヒントを使って解けた」として記録されます。',
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// --- Give up -----------------------------------------------------------------

export function GiveUp({
  exercise,
  revealed,
  onReveal,
  onApply,
}: {
  exercise: Exercise;
  revealed: boolean;
  onReveal: () => void;
  /** Put the reference solution into the form. Absent where there is no form (design exercises). */
  onApply?: () => void;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  const [asking, setAsking] = useState(false);

  if (revealed) {
    const option = exercise.options?.find(
      (candidate) => JSON.stringify(candidate.changes) === JSON.stringify(exercise.reference),
    );
    return (
      <section data-testid="exercise-reference" style={{ ...CARD, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{t('One way to solve it', '解き方の一例')}</h3>
        {option ? (
          <p style={{ margin: 0 }}>
            {t(`Choose “${option.label.en}”.`, `「${option.label.ja}」を選ぶ。`)}
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 4 }}>
            {exercise.reference.map((change, index) => (
              <li key={index}>{changeSentence(change, exercise.start)[locale]}</li>
            ))}
          </ol>
        )}
        <p style={{ ...MUTED, margin: 0, fontSize: 14 }}>
          {t(
            'Other settings that work are right too. This exercise is no longer counted as solved.',
            'ほかの設定でも、うまくいけば正解です。この問題は、もう「解けた」には数えません。',
          )}
        </p>
        {onApply ? (
          <div>
            <button
              type="button"
              data-testid="exercise-reference-apply"
              onClick={onApply}
              style={SECONDARY}
            >
              {t(
                'Put these settings in, then press Check',
                'この設定を入れる（そのあと「たしかめる」を押す）',
              )}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  if (!asking) {
    return (
      <div>
        <button
          type="button"
          data-testid="exercise-giveup"
          onClick={() => setAsking(true)}
          style={SECONDARY}
        >
          {t('Show me the answer', '答えを見る')}
        </button>
      </div>
    );
  }
  return (
    <section
      data-testid="exercise-giveup-confirm"
      role="group"
      aria-label={t('Show the answer?', '答えを見ますか？')}
      style={{ ...CARD, display: 'grid', gap: 8 }}
    >
      <p style={{ margin: 0 }}>
        {t(
          'If you look at the answer, this exercise is not counted as solved. Show it?',
          '答えを見ると、この問題は「解けた」には数えません。見ますか？',
        )}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="exercise-giveup-yes"
          onClick={onReveal}
          style={SECONDARY}
        >
          {t('Yes, show the answer', 'はい、答えを見る')}
        </button>
        <button
          type="button"
          data-testid="exercise-giveup-no"
          onClick={() => setAsking(false)}
          style={SECONDARY}
        >
          {t('No, keep trying', 'いいえ、もう少し考える')}
        </button>
      </div>
    </section>
  );
}

// --- Choose a design ---------------------------------------------------------

export type Predicted = AttemptPrediction['predicted'];

const BIG_CHOICE: CSSProperties = {
  ...SECONDARY,
  minHeight: 56,
  justifyContent: 'flex-start',
  textAlign: 'left',
  fontSize: 16,
  borderWidth: 2,
  width: '100%',
};

/**
 * The designs to choose from, then the prediction. Nothing runs here: the
 * learner picks, says what they expect, and presses Check.
 */
export function DesignChooser({
  options,
  chosenId,
  predicted,
  disabled,
  onChoose,
  onPredict,
}: {
  options: readonly DesignOption[];
  chosenId: string | null;
  predicted: Predicted | null;
  disabled: boolean;
  onChoose: (option: DesignOption) => void;
  onPredict: (predicted: Predicted) => void;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  const predictions: readonly (readonly [Predicted, string])[] = [
    ['reach', t('It arrives', '届く')],
    ['no-reach', t('It does not arrive', '届かない')],
    ['detour', t('It arrives, but the long way round', '届くが、遠回りになる')],
  ];
  const mark = (on: boolean) => (on ? <span aria-hidden="true">✓ </span> : null);
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t('1. Pick one', '1. 1 つ選ぶ')}</h3>
      <div role="group" aria-label={t('Choices', '選べるもの')} style={{ display: 'grid', gap: 8 }}>
        {options.map((option) => {
          const chosen = option.id === chosenId;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`exercise-option-${option.id}`}
              aria-pressed={chosen}
              disabled={disabled}
              onClick={() => onChoose(option)}
              style={{
                ...BIG_CHOICE,
                borderColor: chosen ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)',
              }}
            >
              {mark(chosen)}
              {option.label[locale]}
            </button>
          );
        })}
      </div>
      {chosenId !== null ? (
        <div data-testid="exercise-predict" style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>
            {t('2. What do you expect to happen?', '2. どうなると思いますか？')}
          </h3>
          <div
            role="group"
            aria-label={t('Your prediction', 'あなたの予想')}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {predictions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-testid={`exercise-predict-${value}`}
                aria-pressed={predicted === value}
                disabled={disabled}
                onClick={() => onPredict(value)}
                style={{
                  ...SECONDARY,
                  borderWidth: 2,
                  fontSize: 16,
                  borderColor:
                    predicted === value ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)',
                }}
              >
                {mark(predicted === value)}
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// --- After a pass or a reveal -------------------------------------------------

export function LessonLinks({
  lessons,
  onOpen,
}: {
  lessons: readonly string[];
  onOpen?: (path: string) => void;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  if (lessons.length === 0) return null;
  return (
    <section data-testid="exercise-lessons" style={{ display: 'grid', gap: 4 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>
        {t('Lessons that teach this', 'これを学べるレッスン')}
      </h3>
      <ul style={{ ...LIST, gap: 0 }}>
        {lessons.map((path) => (
          <li key={path}>
            <Link
              to={path}
              data-testid={`exercise-lesson-${path.replace(/[^a-z0-9]+/gi, '-').replace(/^-/, '')}`}
              onClick={() => onOpen?.(path)}
              style={{ ...LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
            >
              {lessonTitle(path)[locale]} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
