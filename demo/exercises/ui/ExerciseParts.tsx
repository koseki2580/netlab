import { Fragment, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useGalleryLocale, useT } from '../../localeContext';
import type {
  CheckResult,
  DesignOption,
  Exercise,
  GradeResult,
  SettingChange,
} from '../model/types';
import type { AttemptPrediction } from '../store/types';
import { changeSentence, goalLabel } from './describe';
import { lessonTitle } from './lessonTitle';
import { CARD, LINK, MUTED, SECONDARY } from './styles';
import { WATCH_WORDS } from './words';
import { hintText } from '../model/hints';
import type { TopologySnapshot } from '../../../src/types/topology';

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

/**
 * The goals of an exercise, each with its mark once Check has run. On a phone
 * they are part of the brief; beside the diagram they stand under the
 * settings, so that what there is to press is on screen without scrolling.
 */
export function GoalList({
  exercise,
  results,
  compact = false,
}: {
  exercise: Exercise;
  results: readonly CheckResult[] | null;
  compact?: boolean;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  return (
    <ul
      data-testid="exercise-goals"
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
  );
}

export function ExerciseBrief({
  exercise,
  results,
  compact = false,
  countRule = null,
  pickFirst = false,
  goals = true,
}: {
  /** Whether the goals are listed here (a phone) or elsewhere on the page. */
  goals?: boolean;
  exercise: Exercise;
  /** Before the first Check: within how many Checks a solve counts. Null once one was pressed. */
  countRule?: 1 | 2 | null;
  /** The exercise asks for the faulty device to be pointed at first: that choice counts too. */
  pickFirst?: boolean;
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
      {exercise.task ? (
        <>
          <p
            data-testid="exercise-task"
            style={{ margin: 0, fontSize: compact ? 16 : 17, lineHeight: 1.6, fontWeight: 700 }}
          >
            {exercise.task[locale]}
          </p>
          {exercise.rule ? (
            <p
              data-testid="exercise-rule"
              style={{ margin: 0, fontSize: compact ? 15 : 16, lineHeight: 1.6 }}
            >
              {exercise.rule[locale]}
            </p>
          ) : null}
          {/* The story and the glosses: for a reader who wants them, shut for one who does not. */}
          <details data-testid="exercise-more">
            <summary style={{ cursor: 'pointer', minHeight: 32, fontSize: 15 }}>
              {t('What happened, and what the words mean', 'なにが起きたか・ことばの説明を読む')}
            </summary>
            <p
              data-testid="exercise-story"
              style={{ margin: '4px 0 0', fontSize: 15, lineHeight: compact ? 1.6 : 1.8 }}
            >
              {exercise.brief[locale]}
            </p>
          </details>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: compact ? 15 : 16, lineHeight: compact ? 1.6 : 1.8 }}>
          {exercise.brief[locale]}
        </p>
      )}
      {goals ? <GoalList exercise={exercise} results={results} compact={compact} /> : null}
      {countRule === null ? null : (
        <p
          data-testid="exercise-count-rule"
          data-checks={countRule}
          style={{ ...MUTED, margin: 0, fontSize: 14 }}
        >
          {pickFirst
            ? t(
                'Counts only if your first choice and your first Check are right.',
                'えらぶのも「たしかめる」も 1 回目だけ数えます。',
              )
            : countRule === 1
              ? t(
                  'This one counts only if the first Check solves it.',
                  'この問題は、1 回目の「たしかめる」で解けたときだけ数えます。',
                )
              : t(
                  'This one counts if you solve it within two Checks.',
                  'この問題は、2 回目までの「たしかめる」で解けたときに数えます。',
                )}
        </p>
      )}
    </section>
  );
}

// --- Results -----------------------------------------------------------------

/** How a pass is recorded: without help, with a hint, after several tries, or not at all (the answer was shown). */
export type Counted = 'solved' | 'helped' | 'tries' | 'not-counted';

/**
 * What Check found. After a miss it is kept short on purpose: one line, the
 * first goal not met with the grader's reason, and nothing else, so the
 * settings stay on screen under it. The other goals are one press away.
 */
export function ResultPanel({
  exercise,
  grade,
  stale,
  busy,
  counted,
  checksToCount,
  failedChecks,
  doneSentence,
  onReplay,
  onShowSetting,
  panelRef,
}: {
  exercise: Exercise;
  grade: GradeResult | null;
  /** The settings changed since this grade. */
  stale: boolean;
  busy: boolean;
  counted: Counted;
  /** A solve counts within this many Checks. */
  checksToCount: 1 | 2;
  /** Checks so far that did not pass. */
  failedChecks: number;
  /** What the learner did, said back to them on a pass. */
  doneSentence: string;
  onReplay: (result: CheckResult) => void;
  /** Bring the card of the setting the first unmet goal is about into view. Absent when there is none to name. */
  onShowSetting?: () => void;
  panelRef: RefObject<HTMLDivElement>;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  // Failed goals first: they are what the learner has to read.
  const ordered = grade
    ? [...grade.results].sort((a, b) => Number(a.passed) - Number(b.passed))
    : [];
  const notYet = ordered.filter((result) => !result.passed).length;
  // After a miss: the first goal not met. The rest wait behind one button.
  const shown = grade && !grade.passed && !showAll ? ordered.slice(0, 1) : ordered;
  const hidden = ordered.length - shown.length;
  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      data-testid="exercise-result"
      data-passed={grade ? String(grade.passed) : undefined}
      data-stale={stale ? '' : undefined}
      style={{ outline: 'none', scrollMarginBottom: 80, scrollMarginTop: 8 }}
    >
      {busy ? <p style={{ margin: 0 }}>{t('Checking…', 'たしかめています…')}</p> : null}
      {grade && !busy ? (
        <div
          style={{
            ...CARD,
            padding: 12,
            display: 'grid',
            gap: 8,
            borderWidth: 2,
            borderColor: grade.passed
              ? 'var(--netlab-accent-green)'
              : 'var(--netlab-accent-orange)',
            opacity: stale ? 0.75 : 1,
          }}
        >
          <h3
            data-testid="exercise-result-summary"
            style={{ margin: 0, fontSize: 17, lineHeight: 1.4 }}
          >
            {grade.passed
              ? t('✓ It works!', '✓ できました！')
              : t(
                  `Not there yet: ${notYet} of ${ordered.length} ${ordered.length === 1 ? 'goal' : 'goals'} to go.`,
                  `もう少しです。目標 ${ordered.length} 個のうち、あと ${notYet} 個。`,
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
            <p data-testid="exercise-result-done" data-counted={counted} style={{ margin: 0 }}>
              {doneSentence}{' '}
              {counted === 'helped'
                ? t(
                    'Recorded as “solved with help”, because you opened a hint.',
                    'ヒントを見たので、「ヒントを使って解けた」として記録しました。',
                  )
                : counted === 'tries'
                  ? t(
                      checksToCount === 1
                        ? 'Recorded as “solved after several tries”, because the first Check did not solve it.'
                        : 'Recorded as “solved after several tries”, because it took more than 2 Checks.',
                      checksToCount === 1
                        ? '1 回目の「たしかめる」では解けなかったので、「何度かためして解けた」として記録しました。'
                        : '「たしかめる」を 3 回以上押したので、「何度かためして解けた」として記録しました。',
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
            {shown.map((result) => {
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
                      {WATCH_WORDS[locale]}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!grade.passed && !stale && onShowSetting ? (
            <div>
              <button
                type="button"
                data-testid="exercise-result-setting"
                onClick={onShowSetting}
                style={SECONDARY}
              >
                {t('↓ Show the setting this is about', '↓ この目標にかかわる設定を見る')}
              </button>
            </div>
          ) : null}
          {hidden > 0 ? (
            <div>
              <button
                type="button"
                data-testid="exercise-result-more"
                onClick={() => setShowAll(true)}
                style={{
                  ...LINK,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  minHeight: 44,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {t(`Show all ${ordered.length} goals`, `目標 ${ordered.length} 個をぜんぶ見る`)}
              </button>
            </div>
          ) : null}
          {!grade.passed && failedChecks >= checksToCount ? (
            <p data-testid="exercise-tries-note" style={{ ...MUTED, margin: 0, fontSize: 14 }}>
              {t(
                'Starting again does not change this one: it stays “solved after several tries”. You can make it up on the next exercise.',
                'やり直しても、この問題は「何度かためして解けた」のままです。次の問題でとり返せます。',
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// --- Hints -------------------------------------------------------------------

/** The hints opened so far. The button that opens the next one sits beside Check (`HintButton`). */
export function HintTexts({
  exercise,
  shownTier,
  topology,
}: {
  exercise: Exercise;
  /** The network as the learner has it now: a hint follows it (`model/hints.ts`). */
  topology: TopologySnapshot;
  /** The highest tier opened so far; 0 when none. */
  shownTier: 0 | 1 | 2 | 3;
}) {
  const locale = useGalleryLocale();
  const t = useT();
  const shown = [...exercise.hints]
    .sort((a, b) => a.tier - b.tier)
    .filter((hint) => hint.tier <= shownTier);
  if (shown.length === 0) return null;
  return (
    <section data-testid="exercise-hints" style={{ display: 'grid', gap: 8 }}>
      {shown.map((hint) => (
        <p
          key={hint.tier}
          data-testid={`exercise-hint-${hint.tier}`}
          style={{ ...CARD, margin: 0, padding: 12, scrollMarginBottom: 96, scrollMarginTop: 8 }}
        >
          <strong>{t(`Hint ${hint.tier}: `, `ヒント ${hint.tier}：`)}</strong>
          {hintText(hint, topology)[locale]}
        </p>
      ))}
    </section>
  );
}

/** The next hint of the exercise after `shownTier`, or undefined when all are open. */
export function nextHintTier(exercise: Exercise, shownTier: 0 | 1 | 2 | 3): 1 | 2 | 3 | undefined {
  return [...exercise.hints].sort((a, b) => a.tier - b.tier).find((hint) => hint.tier > shownTier)
    ?.tier;
}

/**
 * Opens the next hint. It stands beside Check, and only once a Check has
 * missed: under the fold nobody found it, and before a first try a hint is not
 * what the page should offer.
 */
export function HintButton({
  shownTier,
  onReveal,
  next,
}: {
  shownTier: 0 | 1 | 2 | 3;
  next: 1 | 2 | 3;
  onReveal: (tier: 1 | 2 | 3) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      data-testid="exercise-hint"
      aria-describedby={shownTier === 0 ? 'exercise-hint-cost' : undefined}
      onClick={() => onReveal(next)}
      style={{ ...SECONDARY, minHeight: 48, fontSize: 16 }}
    >
      {shownTier === 0 ? t('Show a hint', 'ヒントを見る') : t('Next hint', '次のヒント')}
    </button>
  );
}

/** Said before the first hint is opened: what opening one costs. */
export function HintCost() {
  const t = useT();
  return (
    <p
      id="exercise-hint-cost"
      data-testid="exercise-hint-cost"
      style={{ ...MUTED, margin: 0, fontSize: 13, lineHeight: 1.4, flexBasis: '100%' }}
    >
      {t(
        'If you open a hint, this exercise is recorded as “solved with help”.',
        'ヒントを見ると、この問題は「ヒントを使って解けた」として記録されます。',
      )}
    </p>
  );
}

// --- Give up -----------------------------------------------------------------

export function GiveUp({
  exercise,
  revealed,
  onReveal,
  onApply,
  reference = exercise.reference,
}: {
  exercise: Exercise;
  revealed: boolean;
  onReveal: () => void;
  /** Put the reference solution into the form. Absent where there is no form (design exercises). */
  onApply?: () => void;
  /**
   * The solution as this attempt can press it (`referenceAsOffered`): the
   * answer named an address that was not among the chips on screen.
   */
  reference?: readonly SettingChange[];
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
            {reference.map((change, index) => (
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
 * The designs to choose from, with the prediction asked directly under the one
 * chosen. Nothing runs here: the learner picks, says what they expect, and
 * presses Check. The prediction stays when another design is picked.
 */
export function DesignChooser({
  options,
  chosenId,
  predicted,
  disabled,
  needs,
  needsRef,
  onChoose,
  onPredict,
}: {
  options: readonly DesignOption[];
  chosenId: string | null;
  predicted: Predicted | null;
  disabled: boolean;
  /** Check was pressed too early: what is still missing, said where it is asked. */
  needs: 'choice' | 'prediction' | null;
  needsRef: RefObject<HTMLParagraphElement>;
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
  // The question appears under the design just chosen, which on most screens is
  // below what is visible: a learner pressed Check without ever seeing it.
  const predictRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chosenId !== null) predictRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [chosenId]);
  const needed = (text: string) => (
    <p
      ref={needsRef}
      data-testid="exercise-design-needed"
      data-needs={needs ?? undefined}
      role="alert"
      style={{
        margin: 0,
        fontWeight: 700,
        color: 'var(--netlab-accent-orange)',
        scrollMarginBottom: 200,
        scrollMarginTop: 60,
      }}
    >
      <span aria-hidden="true">☞ </span>
      {text}
    </p>
  );
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t('1. Pick one', '1. 1 つ選ぶ')}</h3>
      {needs === 'choice'
        ? needed(t('First pick one of these.', 'まず、この中から 1 つ選んでください。'))
        : null}
      <div role="group" aria-label={t('Choices', '選べるもの')} style={{ display: 'grid', gap: 8 }}>
        {options.map((option) => {
          const chosen = option.id === chosenId;
          return (
            <Fragment key={option.id}>
              <button
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
              {chosen ? (
                <div
                  ref={predictRef}
                  data-testid="exercise-predict"
                  style={{
                    scrollMarginBottom: 16,
                    scrollMarginTop: 60,
                    display: 'grid',
                    gap: 8,
                    marginLeft: 12,
                    paddingLeft: 12,
                    borderLeft: '3px solid var(--netlab-accent-cyan)',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {t('2. What do you expect to happen?', '2. どうなると思いますか？')}
                  </h3>
                  {needs === 'prediction'
                    ? needed(
                        t(
                          'One more thing first: choose what you expect here, then press Check.',
                          'その前に、ここで予想を 1 つ選んでから「たしかめる」を押してください。',
                        ),
                      )
                    : null}
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
                            predicted === value
                              ? 'var(--netlab-accent-cyan)'
                              : 'var(--netlab-border)',
                        }}
                      >
                        {mark(predicted === value)}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
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
