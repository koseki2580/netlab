import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  allConceptQuestions,
  correctOption,
  deckMastery,
  decksByLayer,
  getDeck,
  isCorrectChoice,
  questionItemId,
  type IndexedQuestion,
} from '../../learning/concept-check';
import {
  createReviewStore,
  gradeReview,
  isMastered,
  reviewQueue,
  reviewStats,
  type ReviewState,
} from '../../learning/review';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  pillButton,
  useDrillCompletion,
  useFocusWhen,
  useQuestionFocus,
} from './drillKit';
import type { DrillResult } from './drillKit';

const REVIEW_SESSION_LIMIT = 10;

/**
 * Fisher-Yates shuffle into a new array. Option order is varied on every
 * presentation so spaced-repetition reviews stay genuine retrieval — a learner
 * recalls the concept rather than memorizing the answer's fixed position.
 */
function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

interface Session {
  readonly kind: 'deck' | 'review';
  readonly id: string;
  readonly title: string;
  readonly items: readonly IndexedQuestion[];
}

/**
 * Active-recall quiz across protocols, now with **spaced repetition**: every
 * answer feeds a Leitner scheduler, missed/weak questions collect into a Review
 * pool, and a mastery indicator tracks long-term progress. This turns one-shot
 * quizzes into durable knowledge. Decks are pure data; all text is i18n (en/ja).
 *
 * `reviewStore` is injectable for tests/embedding; it defaults to the
 * localStorage-backed store (SSR- and storage-failure-safe).
 */
export function ConceptCheckPanel({
  reviewStore = createReviewStore(),
}: {
  reviewStore?: ReturnType<typeof createReviewStore>;
} = {}) {
  const { t } = useI18n();
  const groups = useMemo(() => decksByLayer(), []);
  const indexed = useMemo(() => allConceptQuestions(), []);
  const byItemId = useMemo(() => new Map(indexed.map((entry) => [entry.itemId, entry])), [indexed]);

  const [review, setReview] = useState<ReviewState>(() => reviewStore.load());
  const [session, setSession] = useState<Session | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [complete, setComplete] = useState(false);

  const total = session?.items.length ?? 0;
  const indexedQ = session?.items[qIdx];
  const question = indexedQ?.question;
  // Re-shuffle options each time a new question is presented (stable across the
  // answer/reveal re-renders since `question` keeps its identity until advance).
  const options = useMemo(() => (question ? shuffle(question.options) : []), [question]);
  const summaryRef = useFocusWhen<HTMLHeadingElement>(complete);
  // Move focus to each new question's prompt so keyboard/screen-reader users hear
  // the question announced when advancing — not just sighted users seeing it swap.
  const promptRef = useQuestionFocus<HTMLParagraphElement>(`${session?.id ?? ''}:${qIdx}`);
  useDrillCompletion(
    session ? `concept-${session.id}` : 'concept-none',
    session ? `Concept Check — ${session.id}` : 'Concept Check',
    complete,
    correct,
    total,
  );

  const stats = useMemo(() => reviewStats(review, Date.now()), [review]);

  const start = useCallback((next: Session) => {
    setSession(next);
    setQIdx(0);
    setSelected(null);
    setCorrect(0);
    setComplete(false);
  }, []);

  const startDeck = useCallback(
    (deckId: string) => {
      const deck = getDeck(deckId);
      if (!deck) return;
      start({
        kind: 'deck',
        id: deckId,
        title: t(deck.nameKey),
        items: deck.questions.map((q) => ({
          itemId: questionItemId(deck.id, q.id),
          deck,
          question: q,
        })),
      });
    },
    [start, t],
  );

  const startReview = useCallback(() => {
    const items = reviewQueue(review, REVIEW_SESSION_LIMIT)
      .map((id) => byItemId.get(id))
      .filter((entry): entry is IndexedQuestion => entry !== undefined);
    if (items.length === 0) return;
    start({ kind: 'review', id: 'review', title: t('learning.concept.review.title'), items });
  }, [review, byItemId, start, t]);

  const result = useMemo<DrillResult | null>(() => {
    if (!question || selected === null) return null;
    const right = correctOption(question);
    return {
      correct: isCorrectChoice(question, selected),
      expected: right ? t(right.key) : '',
      explanation: t(question.explanationKey),
    };
  }, [question, selected, t]);

  const answer = useCallback(
    (optionKey: string) => {
      if (!question || !indexedQ || selected !== null) return;
      const ok = isCorrectChoice(question, optionKey);
      setSelected(optionKey);
      if (ok) setCorrect((value) => value + 1);
      // Feed the spaced-repetition scheduler and persist.
      setReview((prev) => {
        const nextState = gradeReview(prev, indexedQ.itemId, ok, Date.now());
        reviewStore.save(nextState);
        return nextState;
      });
    },
    [question, indexedQ, selected, reviewStore],
  );

  const next = useCallback(() => {
    if (qIdx + 1 >= total) {
      setComplete(true);
      return;
    }
    setQIdx((value) => value + 1);
    setSelected(null);
  }, [qIdx, total]);

  const backToDecks = useCallback(() => setSession(null), []);

  // ── Deck picker ──────────────────────────────────────────────────────────
  if (!session) {
    const reviewCount = stats.inReview;
    const seenItem = (id: string) => review[id] !== undefined;
    const masteredItem = (id: string) => isMastered(review, id);
    return (
      <DrillFrame idPrefix="concept-check">
        <div data-testid="concept-check-picker" style={drillCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
              {t('learning.concept.title')}
            </h2>
            <span
              data-testid="concept-check-mastery"
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                color: 'var(--netlab-text-secondary)',
              }}
            >
              {t('learning.concept.review.mastered', {
                mastered: stats.mastered,
                total: indexed.length,
              })}
            </span>
          </div>
          <ConceptCallout idPrefix="concept-check" title={t('learning.concept.primer.title')}>
            {t('learning.concept.primer.body')}
          </ConceptCallout>

          {reviewCount > 0 && (
            <button
              type="button"
              data-testid="concept-check-review"
              onClick={startReview}
              style={pillButton(
                stats.dueInReview > 0 ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-yellow)',
              )}
            >
              {stats.dueInReview > 0
                ? t('learning.concept.review.due', { count: stats.dueInReview })
                : t('learning.concept.review.start', { count: reviewCount })}
            </button>
          )}

          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 13 }}>
            {t('learning.concept.pickDeck')}
          </p>
          {groups.map((group) => (
            <div key={group.layer} style={{ display: 'grid', gap: 6 }}>
              <div
                style={{
                  color: 'var(--netlab-text-secondary)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                {t(`learning.concept.layer.${group.layer}`)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.decks.map((entry) => {
                  const progress = deckMastery(entry, seenItem, masteredItem);
                  const allMastered = progress.mastered === progress.total;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-testid={`concept-check-deck-${entry.id}`}
                      onClick={() => startDeck(entry.id)}
                      style={{
                        ...pillButton(
                          allMastered ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-blue)',
                        ),
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {t(entry.nameKey)}
                      {progress.seen > 0 && (
                        <span
                          data-testid={`concept-check-deck-progress-${entry.id}`}
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 11,
                            opacity: 0.85,
                          }}
                        >
                          {allMastered ? '✓ ' : ''}
                          {t('learning.concept.review.deckProgress', {
                            mastered: progress.mastered,
                            total: progress.total,
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DrillFrame>
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  if (complete) {
    return (
      <DrillFrame idPrefix="concept-check">
        <div data-testid="concept-check-summary" style={drillCardStyle}>
          <h2
            ref={summaryRef}
            tabIndex={-1}
            style={{
              margin: 0,
              color: 'var(--netlab-text-primary)',
              fontSize: 18,
              outline: 'none',
            }}
          >
            {t('learning.drill.sessionComplete')}
          </h2>
          <div
            data-testid="concept-check-score"
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--netlab-text-primary)' }}
          >
            {correct} / {total}
          </div>
          <button
            type="button"
            data-testid="concept-check-back"
            onClick={backToDecks}
            style={pillButton('var(--netlab-accent-blue)')}
          >
            {t('learning.concept.backToDecks')}
          </button>
        </div>
      </DrillFrame>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const isLast = qIdx + 1 >= total;
  return (
    <DrillFrame idPrefix="concept-check">
      <div style={drillCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {session.title}
          </h2>
          <span
            data-testid="concept-check-progress"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t('learning.concept.deckProgress', { current: qIdx + 1, total })}
          </span>
        </div>

        <p
          ref={promptRef}
          tabIndex={-1}
          data-testid="concept-check-prompt"
          style={{
            margin: 0,
            color: 'var(--netlab-text-primary)',
            fontSize: 16,
            lineHeight: 1.5,
            outline: 'none',
          }}
        >
          {question ? t(question.promptKey) : ''}
        </p>

        <div style={{ display: 'grid', gap: 8 }}>
          {options.map((option, index) => {
            const isWinner = result !== null && option.correct === true;
            const isWrongChoice = result !== null && selected === option.key && !option.correct;
            const accent = isWinner
              ? 'var(--netlab-accent-green)'
              : isWrongChoice
                ? 'var(--netlab-accent-red)'
                : 'var(--netlab-accent-blue)';
            return (
              <button
                key={option.key}
                type="button"
                data-testid={`concept-check-option-${index}`}
                onClick={() => answer(option.key)}
                disabled={selected !== null}
                style={{
                  ...pillButton(accent),
                  textAlign: 'left',
                  borderRadius: 'var(--netlab-radius-sm)',
                  opacity: result !== null && !isWinner && !isWrongChoice ? 0.5 : 1,
                }}
              >
                {isWinner ? '✓ ' : isWrongChoice ? '✗ ' : ''}
                {t(option.key)}
              </button>
            );
          })}
        </div>

        <DrillFeedback idPrefix="concept-check" result={result} />

        {result && (
          <button
            type="button"
            data-testid="concept-check-next"
            onClick={next}
            style={{ ...pillButton('var(--netlab-accent-green)'), justifySelf: 'start' }}
          >
            {isLast ? t('learning.drill.seeResults') : t('learning.drill.next')}
          </button>
        )}
      </div>
    </DrillFrame>
  );
}
