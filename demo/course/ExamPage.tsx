import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOptionalProgress } from '../../src/progress';
import DemoShell from '../DemoShell';
import { readLearningLocale } from '../learning/learningLocale';
import { useGalleryLocale, useT } from '../localeContext';
import {
  EXAM_PASS_MARK,
  EXAM_PATH,
  EXAM_QUESTIONS,
  examStop,
  scoreExam,
  type ExamAnswer,
  type ExamResult,
} from './examQuestions';

/**
 * The beginner path's final test: the path in order, then ten questions, then
 * the mark with, for every miss, why and where it is taught.
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

function ExamBody() {
  const t = useT();
  const locale = useGalleryLocale();
  const { recordCompletion } = useOptionalProgress();
  const [answers, setAnswers] = useState<Record<string, ExamAnswer | undefined>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const answered = useMemo(
    () => EXAM_QUESTIONS.filter((question) => answers[question.id] !== undefined).length,
    [answers],
  );

  const submit = () => {
    const marked = scoreExam(answers);
    setResult(marked);
    if (marked.passed) {
      recordCompletion({ kind: 'tutorial', id: 'course:exam', label: 'Final test' });
    }
    window.scrollTo({ top: 0 });
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0 });
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
        <section style={CARD} data-testid="exam-path">
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
            {EXAM_PATH.map((stop) => (
              <li key={stop.id}>
                <Link data-testid={`exam-path-${stop.id}`} to={stop.path}>
                  {stop.title[locale]}
                </Link>
                <span style={{ color: 'var(--netlab-text-secondary)' }}>
                  {' '}
                  — {stop.teaches[locale]}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {result ? (
          <section
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
                ? t(
                    'You have the basics. Read the explanations below for anything you missed.',
                    '基本は身についています。間違えた問題があれば、下の解説を読んでください。',
                  )
                : t(
                    'Each missed question below names the lesson that teaches it. Go back to those, then try again.',
                    '間違えた問題には、それを教えるレッスンが書いてあります。そこへ戻ってから、もう一度挑戦してください。',
                  )}
            </p>
            <button
              type="button"
              data-testid="exam-retry"
              onClick={retry}
              style={{ ...BUTTON, marginTop: 12 }}
            >
              {t('Try again', 'もう一度受ける')}
            </button>
          </section>
        ) : null}

        {EXAM_QUESTIONS.map((question, index) => {
          const outcome = result?.perQuestion[index];
          const chosen = answers[question.id];
          const stop = examStop(question.taughtBy);
          return (
            <fieldset
              key={question.id}
              data-testid={`exam-question-${index + 1}`}
              {...(outcome ? { 'data-correct': outcome.correct ? 'yes' : 'no' } : {})}
              style={{ ...CARD, margin: 0 }}
            >
              <legend style={{ fontWeight: 700, padding: '0 6px' }}>
                {t(`Question ${index + 1}`, `問 ${index + 1}`)}
              </legend>
              <p style={{ margin: '0 0 10px' }}>{question.prompt[locale]}</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  ...question.options.map((option, k) => ({
                    key: k as ExamAnswer,
                    text: option[locale],
                  })),
                  {
                    key: 'not-learned' as ExamAnswer,
                    text: t('I have not learned this', 'わからない（まだ習っていない）'),
                  },
                ].map(({ key, text }) => (
                  <label
                    key={String(key)}
                    style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                  >
                    <input
                      type="radio"
                      name={`exam-${question.id}`}
                      data-testid={`exam-option-${index + 1}-${key === 'not-learned' ? 'x' : Number(key) + 1}`}
                      checked={chosen === key}
                      disabled={result !== null}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: key }))}
                    />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              {outcome ? (
                <div
                  data-testid={`exam-feedback-${index + 1}`}
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px solid var(--netlab-border)',
                    color: outcome.correct
                      ? 'var(--netlab-accent-green)'
                      : 'var(--netlab-text-primary)',
                  }}
                >
                  <strong>
                    {outcome.correct ? t('Correct', '正解') : t('Not quite', '不正解')}
                  </strong>
                  <p style={{ margin: '4px 0' }}>{question.explanation[locale]}</p>
                  {!outcome.correct && stop ? (
                    <Link data-testid={`exam-review-${index + 1}`} to={stop.path}>
                      {t(`Review: ${stop.title.en} →`, `復習する：${stop.title.ja} →`)}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          );
        })}

        {result ? null : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" data-testid="exam-submit" onClick={submit} style={BUTTON}>
              {t('Mark my answers', '採点する')}
            </button>
            <span style={{ color: 'var(--netlab-text-secondary)' }}>
              {t(`${answered} of 10 answered`, `10 問中 ${answered} 問に回答済み`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExamPage() {
  const [locale] = useState(readLearningLocale);
  return (
    <DemoShell
      title={locale === 'ja' ? '修了テスト' : 'Final test'}
      desc={
        locale === 'ja'
          ? '入門の学習パスの 10 問。間違えた問題は、教えているレッスンへ案内します。'
          : 'Ten questions on the beginner path; each miss points to the lesson that teaches it.'
      }
    >
      <ExamBody />
    </DemoShell>
  );
}
