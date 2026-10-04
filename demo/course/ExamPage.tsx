import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useOptionalProgress } from '../../src/progress';
import DemoShell from '../DemoShell';
import { readLearningLocale } from '../learning/learningLocale';
import { useGalleryLocale, useT } from '../localeContext';
import {
  NEW_ATTEMPT,
  clearAttempt,
  examReturnSearch,
  examRoute,
  loadAttempt,
  nextSeed,
  optionOrder,
  saveAttempt,
  seedFromSearch,
  sessionStore,
  type ExamAttempt,
} from './examAttempt';
import { EXAM_LEVELS, examLevel } from './examLevels';
import {
  EXAM_LEVEL_1,
  EXAM_PASS_MARK,
  levelStop,
  scoreLevel,
  type ExamAnswer,
  type ExamLevel,
} from './examQuestions';

/**
 * The beginner path's final test: the path in order, then — once the learner
 * presses start — ten questions, then the mark with, for every miss, the right
 * answer, why, and where it is taught.
 *
 * The attempt (answers, the order of the options, whether it is marked) is kept
 * for the tab, so going to a lesson and coming back does not lose it.
 */
const CARD: React.CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border)',
  borderRadius: 10,
  padding: 16,
  color: 'var(--netlab-text-primary)',
  lineHeight: 1.7,
};

const BUTTON: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
};

/** Links on the cards: the browser's default blue is unreadable on the dark panel. */
const LINK: React.CSSProperties = {
  color: 'var(--netlab-accent-cyan)',
  textDecoration: 'underline',
  fontWeight: 600,
};

/** The words that mark an option after marking, so it is not told by colour alone. */
const BADGE: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '0 8px',
  borderRadius: 999,
  border: '1px solid currentColor',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

function ExamBody({ level }: { level: ExamLevel }) {
  const t = useT();
  const locale = useGalleryLocale();
  const { recordCompletion } = useOptionalProgress();
  const location = useLocation();
  const [attempt, setAttempt] = useState<ExamAttempt>(
    () => loadAttempt(sessionStore(), level.level) ?? NEW_ATTEMPT,
  );
  const { answers } = attempt;
  const result = useMemo(
    () => (attempt.marked ? scoreLevel(level, answers) : null),
    [attempt.marked, answers, level],
  );
  const answered = useMemo(
    () => level.questions.filter((question) => answers[question.id] !== undefined).length,
    [answers, level],
  );
  const scoreRef = useRef<HTMLElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  // Set by "start" and "try again" only: an attempt restored from storage must
  // not pull the page down to its questions.
  const goToQuestions = useRef(false);

  useEffect(() => {
    if (attempt.started) saveAttempt(sessionStore(), level.level, attempt);
    else clearAttempt(sessionStore(), level.level);
  }, [attempt, level.level]);

  // The result is what the learner pressed the button for: bring it into view
  // and give it the focus, both after marking and when coming back to it.
  useEffect(() => {
    const target = attempt.marked
      ? scoreRef.current
      : goToQuestions.current
        ? questionsRef.current
        : null;
    goToQuestions.current = false;
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }, [attempt.marked, attempt.seed, attempt.started]);

  /** A seed named in the address fixes the order; tests use it. */
  const begin = (previousSeed: number | undefined) => {
    const named = seedFromSearch(location.search, window.location.search);
    goToQuestions.current = true;
    setAttempt({
      seed: nextSeed(named, previousSeed, Math.random),
      started: true,
      answers: {},
      marked: false,
    });
  };

  const submit = () => {
    const marked = scoreLevel(level, answers);
    setAttempt((current) => ({ ...current, marked: true }));
    if (marked.passed) {
      recordCompletion({
        kind: 'tutorial',
        id: level.level === 1 ? 'course:exam' : `course:exam:${level.level}`,
        label: level.title.en,
      });
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
        {EXAM_LEVELS.length > 1 ? (
          <nav
            aria-label={t('Test levels', 'テストのレベル')}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {EXAM_LEVELS.map((entry) => (
              <Link
                key={entry.level}
                data-testid={`exam-level-${entry.level}`}
                aria-current={entry.level === level.level ? 'page' : undefined}
                to={examRoute(entry.level)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${entry.level === level.level ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
                  color: 'var(--netlab-text-primary)',
                  textDecoration: 'none',
                  fontWeight: entry.level === level.level ? 700 : 400,
                }}
              >
                {entry.title[locale]}
              </Link>
            ))}
          </nav>
        ) : null}
        <section style={CARD} data-testid="exam-path" data-level={level.level}>
          <p style={{ margin: '0 0 6px', color: 'var(--netlab-text-secondary)' }}>
            {level.title[locale]} — {level.summary[locale]}
          </p>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {t('What this test covers, in order', 'このテストの範囲と、学ぶ順番')}
          </h2>
          <p style={{ margin: '4px 0 12px', color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Take these in order, then answer ten questions. ${EXAM_PASS_MARK} of 10 passes.`,
              `順番に学んでから、10 問に答えてください。10 問中 ${EXAM_PASS_MARK} 問で合格です。`,
            )}
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {level.path.map((stop) => (
              <li key={stop.id}>
                <Link
                  data-testid={`exam-path-${stop.id}`}
                  to={`${stop.path}${examReturnSearch(level.level)}`}
                  style={{ ...LINK, display: 'inline-block', padding: '6px 0' }}
                >
                  {stop.title[locale]}
                </Link>
                <span style={{ color: 'var(--netlab-text-secondary)' }}>
                  {' '}
                  — {stop.teaches[locale]}
                </span>
              </li>
            ))}
          </ol>
          {attempt.started ? null : (
            <div style={{ marginTop: 16 }}>
              <p data-testid="exam-start-note" style={{ margin: '0 0 10px' }}>
                {t(
                  'The ten questions appear after you press “Start the test”. Study the lessons above first.',
                  '10 問の問題は、「テストを始める」を押すと表示されます。先に上のレッスンを学んでください。',
                )}
              </p>
              <button
                type="button"
                data-testid="exam-start"
                onClick={() => begin(undefined)}
                style={{ ...BUTTON, minHeight: 44 }}
              >
                {t('Start the test', 'テストを始める')}
              </button>
            </div>
          )}
        </section>

        {result ? (
          <section
            ref={scoreRef}
            tabIndex={-1}
            style={{
              ...CARD,
              borderColor: result.passed
                ? 'var(--netlab-accent-green)'
                : 'var(--netlab-accent-orange)',
            }}
            data-testid="exam-score"
            data-score={result.score}
            data-passed={result.passed ? 'yes' : 'no'}
          >
            <h2 style={{ margin: 0, fontSize: 22 }}>
              {t(`${result.score} / 10`, `${result.score} / 10 点`)}
              {' · '}
              {result.passed ? t('Passed', '合格') : t('Not yet', 'もう少し')}
            </h2>
            <p style={{ margin: '6px 0 0' }}>
              {result.passed
                ? level.level === 1
                  ? t(
                      'You have the basics. Read the explanations below for anything you missed.',
                      '基本は身についています。間違えた問題があれば、下の解説を読んでください。',
                    )
                  : t(
                      'You passed this level. Read the explanations below for anything you missed.',
                      'このレベルは合格です。間違えた問題があれば、下の解説を読んでください。',
                    )
                : t(
                    'Each missed question below names the lesson that teaches it. Go back to those, then try again.',
                    '間違えた問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。',
                  )}
            </p>
            <button
              type="button"
              data-testid="exam-retry"
              onClick={() => begin(attempt.seed)}
              style={{ ...BUTTON, marginTop: 12, minHeight: 44 }}
            >
              {t('Try again', 'もう一度受ける')}
            </button>
          </section>
        ) : null}

        {attempt.started ? (
          <div
            ref={questionsRef}
            tabIndex={-1}
            data-testid="exam-questions"
            style={{ display: 'grid', gap: 16, outline: 'none' }}
          >
            {level.questions.map((question, index) => {
              const outcome = result?.perQuestion[index];
              const chosen = answers[question.id];
              const stop = levelStop(level, question.taughtBy);
              const number = index + 1;
              return (
                <fieldset
                  key={question.id}
                  data-testid={`exam-question-${number}`}
                  {...(outcome ? { 'data-correct': outcome.correct ? 'yes' : 'no' } : {})}
                  style={{ ...CARD, margin: 0, minWidth: 0 }}
                >
                  <legend style={{ fontWeight: 700, padding: '0 6px' }}>
                    {t(`Question ${number}`, `問 ${number}`)}
                  </legend>
                  <p style={{ margin: '0 0 10px' }}>{question.prompt[locale]}</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {[
                      // A new order for every attempt; "not learned" stays last.
                      ...optionOrder(attempt.seed, index).map((k) => ({
                        key: k as ExamAnswer,
                        text: question.options[k][locale],
                      })),
                      {
                        key: 'not-learned' as ExamAnswer,
                        text: t('I have not learned this', 'わからない（まだ習っていない）'),
                      },
                    ].map(({ key, text }) => {
                      const suffix = key === 'not-learned' ? 'x' : Number(key) + 1;
                      const isChosen = outcome !== undefined && chosen === key;
                      const isMissedAnswer =
                        outcome !== undefined && !outcome.correct && key === question.answer;
                      return (
                        <label
                          key={String(key)}
                          data-testid={`exam-option-row-${number}-${suffix}`}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            minHeight: 44,
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: isChosen
                              ? `2px solid ${outcome.correct ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)'}`
                              : isMissedAnswer
                                ? '2px dashed var(--netlab-accent-green)'
                                : '2px solid transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name={`exam-${question.id}`}
                            data-testid={`exam-option-${number}-${suffix}`}
                            checked={chosen === key}
                            disabled={result !== null}
                            onChange={() =>
                              setAttempt((current) => ({
                                ...current,
                                answers: { ...current.answers, [question.id]: key },
                              }))
                            }
                          />
                          <span>
                            {text}
                            {isChosen ? (
                              <span data-testid={`exam-your-answer-${number}`} style={BADGE}>
                                {outcome.correct ? '✓ ' : '✗ '}
                                {t('Your answer', 'あなたの答え')}
                              </span>
                            ) : null}
                            {isMissedAnswer ? (
                              <span data-testid={`exam-correct-answer-${number}`} style={BADGE}>
                                {'✓ '}
                                {t('Correct answer', '正解')}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {outcome ? (
                    <div
                      data-testid={`exam-feedback-${number}`}
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px solid var(--netlab-border)',
                      }}
                    >
                      <strong
                        style={{
                          color: outcome.correct
                            ? 'var(--netlab-accent-green)'
                            : 'var(--netlab-text-primary)',
                        }}
                      >
                        {outcome.correct ? t('✓ Correct', '✓ 正解') : t('✗ Not quite', '✗ 不正解')}
                      </strong>
                      <p style={{ margin: '4px 0' }}>{question.explanation[locale]}</p>
                      {!outcome.correct && stop ? (
                        <Link
                          data-testid={`exam-review-${number}`}
                          to={`${stop.path}${examReturnSearch(level.level)}`}
                          style={{
                            ...LINK,
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 44,
                            padding: '0 12px',
                            marginTop: 4,
                            border: '1px solid var(--netlab-accent-cyan)',
                            borderRadius: 8,
                            textDecoration: 'none',
                          }}
                        >
                          {t(`Review: ${stop.title.en} →`, `復習する：${stop.title.ja} →`)}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
              );
            })}

            {result ? null : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-testid="exam-submit"
                  onClick={submit}
                  style={{ ...BUTTON, minHeight: 44 }}
                >
                  {t('Mark my answers', '採点する')}
                </button>
                <span style={{ color: 'var(--netlab-text-secondary)' }}>
                  {t(`${answered} of 10 answered`, `10 問中 ${answered} 問に回答済み`)}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ExamPage() {
  const [locale] = useState(readLearningLocale);
  const params = useParams<{ level?: string }>();
  const level = examLevel(Number(params.level ?? '1')) ?? EXAM_LEVEL_1;
  return (
    <DemoShell
      title={locale === 'ja' ? `修了テスト（${level.title.ja}）` : `Final test (${level.title.en})`}
      desc={
        locale === 'ja'
          ? '10 問。間違えた問題は、教えているレッスンへ案内します。'
          : 'Ten questions; each miss points to the lesson that teaches it.'
      }
    >
      {/* Remount per level so answers never carry over from another level. */}
      <ExamBody key={level.level} level={level} />
    </DemoShell>
  );
}
