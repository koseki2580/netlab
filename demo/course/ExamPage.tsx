import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useOptionalProgress } from '../../src/progress';
import DemoShell from '../DemoShell';
import { readLearningLocale } from '../learning/learningLocale';
import { useGalleryLocale, useT } from '../localeContext';
import {
  NEW_ATTEMPT,
  clearAttempt,
  stopHref,
  examRoute,
  loadAttempt,
  nextSeed,
  optionOrder,
  reviewOf,
  saveAttempt,
  seedFromSearch,
  sessionStore,
  type ExamAttempt,
  type ExamLedger,
  ledgerAfterDraw,
  ledgerAfterMarking,
  ledgerAfterStudy,
  ledgerFromMetadata,
  ledgerId,
  ledgerToMetadata,
  mayBegin,
} from './examAttempt';
import { EXAM_LEVELS, examLevel } from './examLevels';
import { examLevelsInStageOrder } from './stages';
import { examVerdict, firstUnanswered, missedSentence, notLearnedSentence } from './examVerdict';
import {
  EXAM_LEVEL_1,
  EXAM_PASS_MARK,
  levelStop,
  scoreQuestions,
  type ExamAnswer,
  type ExamLevel,
} from './examQuestions';
import { drawQuestions, questionsOf } from './examDraw';
import { examStageName } from './stages';

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
  const { recordCompletion, completionFor } = useOptionalProgress();
  // What the progress record keeps for this level: the last two draws and the
  // review gate (REQ-195, REQ-197). A reload or a new tab reads the same.
  const ledger = ledgerFromMetadata(completionFor(ledgerId(level.level), 'assessment')?.metadata);
  const keepLedger = (next: ExamLedger) =>
    recordCompletion({
      kind: 'assessment',
      id: ledgerId(level.level),
      metadata: ledgerToMetadata(next),
    });
  const location = useLocation();
  const [attempt, setAttempt] = useState<ExamAttempt>(
    () => loadAttempt(sessionStore(), level.level) ?? NEW_ATTEMPT,
  );
  const { answers } = attempt;
  // The ten this attempt asks, drawn from the level's pool (REQ-194).
  const questions = useMemo(
    () => questionsOf(level, attempt.questionIds),
    [level, attempt.questionIds],
  );
  const result = useMemo(
    () => (attempt.marked ? scoreQuestions(questions, answers) : null),
    [attempt.marked, answers, questions],
  );
  const answered = useMemo(
    () => questions.filter((question) => answers[question.id] !== undefined).length,
    [answers, questions],
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

  /**
   * Begins an attempt, by "Start" or by "Try again" alike. A seed named in the
   * address fixes the order; tests use it. The draw passes over the last two
   * attempts' questions, read from the progress record, so neither a reload,
   * a new tab nor "Start" brings the same screen back (REQ-195).
   */
  const begin = (previousSeed: number | undefined) => {
    if (!mayBegin(ledger)) return;
    const named = seedFromSearch(location.search, window.location.search);
    const seed = nextSeed(named, previousSeed, Math.random);
    const seen = [...new Set([...ledger.lastIds, ...ledger.earlierIds])];
    const drawn = drawQuestions(level, seed, seen).map((question) => question.id);
    keepLedger(ledgerAfterDraw(ledger, drawn));
    goToQuestions.current = true;
    setAttempt({ seed, started: true, answers: {}, marked: false, questionIds: drawn });
  };

  /**
   * Once marked: the numbers of the questions answered wrongly (or not at
   * all), and apart from them the ones answered "not learned yet".
   */
  const { missed, notLearned } = useMemo(() => {
    const wrong: number[] = [];
    const unlearned: number[] = [];
    result?.perQuestion.forEach((outcome, index) => {
      if (outcome.correct) return;
      (answers[outcome.id] === 'not-learned' ? unlearned : wrong).push(index + 1);
    });
    return { missed: wrong, notLearned: unlearned };
  }, [answers, result]);
  const verdict = result
    ? examVerdict({
        score: result.score,
        passMark: EXAM_PASS_MARK,
        level: level.level,
        notLearned: notLearned.length,
      })
    : null;
  // Coming back to an unfinished test landed at the top of a page six screens
  // long, with the next question to answer far below.
  const resumeAt = attempt.marked
    ? null
    : firstUnanswered(
        questions.map((question) => question.id),
        answers,
      );

  /** Bring a question into view and put the focus on it. */
  const goToQuestion = (number: number) => {
    const target = questionsRef.current?.querySelector<HTMLElement>(
      `[data-testid="exam-question-${number}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  };

  const submit = () => {
    const marked = scoreQuestions(questions, answers);
    setAttempt((current) => ({ ...current, marked: true }));
    // The topics missed, by the path stop that teaches each (REQ-197).
    keepLedger(
      ledgerAfterMarking(ledger, {
        passed: marked.passed,
        missedStops: questions
          .filter((_question, index) => !marked.perQuestion[index]!.correct)
          .map((question) => question.taughtBy),
      }),
    );
    if (marked.passed) {
      recordCompletion({
        kind: 'tutorial',
        id: level.level === 1 ? 'course:exam' : `course:exam:${level.level}`,
        label: level.title.en,
      });
    }
  };

  /**
   * Opening a missed topic's review lesson counts as studying it; it is kept in
   * the progress record at once, before the page is left (REQ-197).
   */
  const recordStudy = (stop: string) => keepLedger(ledgerAfterStudy(ledger, stop));
  const beginAllowed = mayBegin(ledger);
  const missedTopics = ledger.failed ? ledger.missedStops.length : 0;
  const studiedTopics = ledger.failed
    ? ledger.missedStops.filter((stop) => ledger.studiedStops.includes(stop)).length
    : 0;

  /** For each of these questions: a way down to it, and the lesson that teaches it. */
  const questionLinks = (numbers: readonly number[]) => (
    <ul
      style={{
        margin: '4px 0 0',
        padding: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 2,
      }}
    >
      {numbers.map((number) => {
        const question = questions[number - 1];
        const stop = question ? levelStop(level, question.taughtBy) : undefined;
        return (
          <li
            key={number}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <button
              type="button"
              data-testid={`exam-missed-${number}`}
              onClick={() => goToQuestion(number)}
              style={{
                ...LINK,
                background: 'none',
                border: 'none',
                padding: '0 4px 0 0',
                minHeight: 44,
                cursor: 'pointer',
                fontSize: 'inherit',
              }}
            >
              {t(`See question ${number} ↓`, `問 ${number} を見る ↓`)}
            </button>
            {stop ? (
              <Link
                data-testid={`exam-missed-review-${number}`}
                to={stopHref(stop, level.level)}
                onClick={() => recordStudy(stop.id)}
                style={{
                  ...LINK,
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 44,
                }}
              >
                {t(`Review: ${stop.title.en} →`, `復習する：${stop.title.ja} →`)}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
        {EXAM_LEVELS.length > 1 ? (
          <nav
            aria-label={t('Test levels', 'テストのレベル')}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {/* In the order of the learning path's stages, not the order the
                levels were written in. */}
            {examLevelsInStageOrder()
              .flatMap((number) => {
                const found = examLevel(number);
                return found ? [found] : [];
              })
              .map((entry) => (
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
                  {examStageName(entry.level)[locale]}
                </Link>
              ))}
          </nav>
        ) : null}
        {resumeAt !== null ? (
          <button
            type="button"
            data-testid="exam-continue"
            data-question={resumeAt}
            onClick={() => goToQuestion(resumeAt)}
            style={{ ...BUTTON, minHeight: 44, justifySelf: 'start' }}
          >
            {t(`Continue from question ${resumeAt} ↓`, `問 ${resumeAt} から続ける ↓`)}
          </button>
        ) : null}
        <section style={CARD} data-testid="exam-path" data-level={level.level}>
          <p style={{ margin: '0 0 6px', color: 'var(--netlab-text-secondary)' }}>
            {examStageName(level.level)[locale]} — {level.summary[locale]}
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
                  to={stopHref(stop, level.level)}
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
                disabled={!beginAllowed}
                aria-describedby={beginAllowed ? undefined : 'exam-start-hint'}
                style={{
                  ...BUTTON,
                  minHeight: 44,
                  ...(beginAllowed ? {} : { opacity: 0.6, cursor: 'not-allowed' }),
                }}
              >
                {t('Start the test', 'テストを始める')}
              </button>
              {beginAllowed ? null : (
                // A failed attempt is kept in the progress record, so a reload or a
                // new tab does not open the test again before its lessons (REQ-197).
                <p
                  id="exam-start-hint"
                  data-testid="exam-start-hint"
                  style={{ margin: '6px 0 0', color: 'var(--netlab-text-secondary)' }}
                >
                  {t(
                    `Your last attempt did not pass. Open the review lesson of every topic you missed first (${studiedTopics} of ${missedTopics} opened).`,
                    `前回は不合格でした。まちがえた話題ごとに「復習する」のレッスンを開いてから受けてください（${missedTopics} つのうち ${studiedTopics} つを開きました）。`,
                  )}
                </p>
              )}
              {beginAllowed ? null : (
                // In a new tab the failed attempt is gone, so the topics still to
                // review are listed here from the progress record (REQ-197).
                <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
                  {ledger.missedStops
                    .filter((stop) => !ledger.studiedStops.includes(stop))
                    .map((id) => levelStop(level, id))
                    .flatMap((stop) => (stop ? [stop] : []))
                    .map((stop) => (
                      <li key={stop.id}>
                        <Link
                          data-testid={`exam-start-review-${stop.id}`}
                          to={stopHref(stop, level.level)}
                          onClick={() => recordStudy(stop.id)}
                          style={{
                            ...LINK,
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 44,
                          }}
                        >
                          {t(`Review: ${stop.title.en} →`, `復習する：${stop.title.ja} →`)}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
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
            <p data-testid="exam-verdict" style={{ margin: '6px 0 0' }}>
              {verdict ? t(verdict.en, verdict.ja) : null}
            </p>
            {missed.length > 0 ? (
              // Which questions, at the top: a learner with one miss should not
              // have to scroll past nine right answers to find it.
              <div data-testid="exam-missed" style={{ marginTop: 10 }}>
                <strong data-testid="exam-missed-summary">
                  {t(missedSentence(missed).en, missedSentence(missed).ja)}
                </strong>
                {questionLinks(missed)}
              </div>
            ) : null}
            {notLearned.length > 0 ? (
              <div data-testid="exam-not-learned" style={{ marginTop: 10 }}>
                <strong data-testid="exam-not-learned-summary">
                  {t(notLearnedSentence(notLearned).en, notLearnedSentence(notLearned).ja)}
                </strong>
                {questionLinks(notLearned)}
              </div>
            ) : null}
            {result.passed ? null : (
              <p data-testid="exam-answers-later" style={{ margin: '10px 0 0' }}>
                {t(
                  'The right answers and why are shown once you pass. Study the lessons above first.',
                  '正解とその理由は、合格すると表示されます。まず上のレッスンで復習しましょう。',
                )}
              </p>
            )}
            <button
              type="button"
              data-testid="exam-retry"
              onClick={() => begin(attempt.seed)}
              disabled={!beginAllowed}
              aria-describedby={beginAllowed ? undefined : 'exam-retry-hint'}
              style={{
                ...BUTTON,
                marginTop: 12,
                minHeight: 44,
                ...(beginAllowed ? {} : { opacity: 0.6, cursor: 'not-allowed' }),
              }}
            >
              {t('Try again', 'もう一度受ける')}
            </button>
            {beginAllowed ? null : (
              <p
                id="exam-retry-hint"
                data-testid="exam-retry-hint"
                style={{ margin: '6px 0 0', color: 'var(--netlab-text-secondary)' }}
              >
                {t(
                  `Open the review lesson of every topic you missed first (${studiedTopics} of ${missedTopics} opened); then you can try again.`,
                  `まちがえた話題ごとに「復習する」のレッスンを開くと、もう一度受けられます（${missedTopics} つのうち ${studiedTopics} つを開きました）。`,
                )}
              </p>
            )}
            <Link
              data-testid="exam-to-exercises"
              to={`/exercises/level/${level.level}`}
              style={{ ...LINK, display: 'inline-block', marginLeft: 16, padding: '12px 0' }}
            >
              {t('Practise this level hands-on →', 'このレベルを実習問題で練習する →')}
            </Link>
          </section>
        ) : null}

        {attempt.started ? (
          <div
            ref={questionsRef}
            tabIndex={-1}
            data-testid="exam-questions"
            style={{ display: 'grid', gap: 16, outline: 'none' }}
          >
            {questions.map((question, index) => {
              const outcome = result?.perQuestion[index];
              const chosen = answers[question.id];
              const stop = levelStop(level, question.taughtBy);
              const number = index + 1;
              // After a fail nothing about any answer is shown (REQ-196).
              const shown =
                outcome && result
                  ? reviewOf({ passed: result.passed, correct: outcome.correct })
                  : null;
              const marked = shown?.marks ? outcome : undefined;
              return (
                <fieldset
                  key={question.id}
                  data-testid={`exam-question-${number}`}
                  tabIndex={-1}
                  {...(marked ? { 'data-correct': marked.correct ? 'yes' : 'no' } : {})}
                  style={{ ...CARD, margin: 0, minWidth: 0, scrollMarginTop: 8 }}
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
                      const isChosen = marked !== undefined && chosen === key;
                      // The right option of a miss is named only once the test is passed.
                      const isMissedAnswer = shown?.rightOption === true && key === question.answer;
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
                              ? `2px solid ${marked!.correct ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)'}`
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
                                {marked!.correct ? '✓ ' : '✗ '}
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
                  {marked ? (
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
                          color: marked.correct
                            ? 'var(--netlab-accent-green)'
                            : 'var(--netlab-text-primary)',
                        }}
                      >
                        {marked.correct
                          ? t('✓ Correct', '✓ 正解')
                          : chosen === 'not-learned'
                            ? t('– Not learned yet', '– まだ習っていない')
                            : t('✗ Not quite', '✗ 不正解')}
                      </strong>
                      {shown?.explanation ? (
                        <p style={{ margin: '4px 0' }}>{question.explanation[locale]}</p>
                      ) : null}
                      {!marked.correct && stop ? (
                        <Link
                          data-testid={`exam-review-${number}`}
                          to={stopHref(stop, level.level)}
                          onClick={() => recordStudy(stop.id)}
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
      title={examStageName(level.level)[locale]}
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
