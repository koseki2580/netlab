import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { substitute } from '../../i18n/substitute';
import type { Catalog } from '../../i18n/types';
import { useI18n } from '../../i18n/useI18n';
import { conceptChunk, conceptLocale, loadConceptChunk } from './conceptCatalog';
import {
  allConceptQuestions,
  correctOption,
  deckMastery,
  decksByLayer,
  getDeck,
  isCorrectChoice,
  questionItemId,
  type ConceptChunk,
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
  /**
   * Distinguishes consecutive sessions with the same id — restarting the review
   * pool keeps `id === 'review'`, so a one-item pool would otherwise reuse the
   * key `review:0` and never re-focus the prompt.
   */
  readonly token: number;
  /** i18n key, not translated text — so the header follows a mid-session locale switch. */
  readonly titleKey: string;
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
export interface ConceptCheckPanelProps {
  reviewStore?: ReturnType<typeof createReviewStore>;
  /** Start straight in this deck, with no picker (e.g. a lesson's own deck). */
  deckId?: string;
  /** Limit the review queue to these decks' questions; other items stay stored as they are. */
  reviewScope?: readonly string[];
  /** Open straight in the review session when something in the queue is due; otherwise the picker. */
  autoStartReview?: boolean;
  /** Extra actions on the end screen, e.g. a link back to where the learner came from. */
  endActions?: ReactNode;
}

/** A deck's session, or `null` for an unknown deck. */
function deckSession(deckId: string): Omit<Session, 'token'> | null {
  const deck = getDeck(deckId);
  if (!deck) return null;
  return {
    kind: 'deck',
    id: deckId,
    titleKey: deck.nameKey,
    items: deck.questions.map((q) => ({
      itemId: questionItemId(deck.id, q.id),
      deck,
      question: q,
    })),
  };
}

/** The string chunks a view needs: core for the picker, plus each deck's chunk in a session. */
function neededChunks(session: Session | null): readonly ConceptChunk[] {
  return ['core', ...new Set(session?.items.map((item) => item.deck.chunk) ?? [])];
}

/**
 * Active-recall quiz across protocols. Its strings load chunk by chunk
 * (`conceptCatalog.ts`): until every chunk the current view needs is loaded,
 * the panel draws nothing, so no raw key or English frame shows. Concept keys
 * resolve from the loaded chunks; every other key from the host catalog.
 */
export default function ConceptCheckPanelInner({
  reviewStore = createReviewStore(),
  deckId,
  reviewScope,
  autoStartReview = false,
  endActions,
}: ConceptCheckPanelProps = {}) {
  const { locale, t: baseT } = useI18n();
  // Scopes the document-level key handler to this panel (see the keydown effect).
  const panelRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => decksByLayer(), []);
  const indexed = useMemo(() => allConceptQuestions(), []);
  const byItemId = useMemo(() => new Map(indexed.map((entry) => [entry.itemId, entry])), [indexed]);

  const [review, setReview] = useState<ReviewState>(() => reviewStore.load());
  const [query, setQuery] = useState('');
  const [session, setSession] = useState<Session | null>(() => {
    const initial = deckId ? deckSession(deckId) : null;
    return initial ? { ...initial, token: 0 } : null;
  });
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [complete, setComplete] = useState(false);

  // The strings of the chunks this view needs, or `null` while one is loading.
  const lang = conceptLocale(locale);
  const chunks = useMemo(() => neededChunks(session), [session]);
  const [loads, setLoads] = useState(0);
  const strings = useMemo<Catalog | null>(() => {
    void loads;
    const parts = chunks.map((chunk) => conceptChunk(lang, chunk));
    return parts.every((part) => part !== undefined) ? Object.assign({}, ...parts) : null;
  }, [lang, chunks, loads]);
  useEffect(() => {
    if (strings) return undefined;
    let live = true;
    void Promise.all(chunks.map((chunk) => loadConceptChunk(lang, chunk))).then(() => {
      if (live) setLoads((value) => value + 1);
    });
    return () => {
      live = false;
    };
  }, [strings, lang, chunks]);
  const t = useCallback<typeof baseT>(
    (key, params) => {
      const template = strings?.[key];
      return template === undefined ? baseT(key, params) : substitute(template, params);
    },
    [strings, baseT],
  );

  const total = session?.items.length ?? 0;
  const indexedQ = session?.items[qIdx];
  const question = indexedQ?.question;
  const options = useMemo(
    () => (question ? shuffle(question.options) : []),
    // Keyed on the PRESENTATION, not the question object: deck questions are
    // module-level singletons, so keying on `question` alone would replay the
    // previous order when the same item resurfaces in a new session — exactly the
    // position-memorisation the shuffle exists to prevent. Stable across the
    // answer/reveal re-renders because all three inputs hold until we advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- presentation identity
    [question, session?.token, qIdx],
  );
  const summaryRef = useFocusWhen<HTMLHeadingElement>(complete);
  // Move focus to each new question's prompt so keyboard/screen-reader users hear
  // the question announced when advancing — not just sighted users seeing it swap.
  const promptRef = useQuestionFocus<HTMLParagraphElement>(`${session?.token ?? 0}:${qIdx}`);
  useDrillCompletion(
    session ? `concept-${session.id}` : 'concept-none',
    session ? `Concept Check — ${session.id}` : 'Concept Check',
    complete,
    correct,
    total,
  );

  // Stats must describe only what this catalog can actually present: persisted
  // state may name items from a removed/renamed deck (the store is a public export
  // sharing one key across versions). Counting those would render a Review button
  // that starts nothing, and a mastery bar that can exceed its own max.
  const liveReview = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(review).filter(([itemId]) => byItemId.has(itemId)),
      ) as typeof review,
    [review, byItemId],
  );
  // Re-read the clock while the picker is open so an item becoming due flips the
  // CTA to "due now" without needing a remount (the memo's other input is state).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const stats = useMemo(() => reviewStats(liveReview, now), [liveReview, now]);
  // What the Review button will actually deliver: due items first, capped by the
  // session limit. Labelling with anything else promises a session we won't start.
  const scopedReview = useMemo(() => {
    if (!reviewScope) return liveReview;
    const scope = new Set(reviewScope);
    return Object.fromEntries(
      Object.entries(liveReview).filter(([itemId]) => scope.has(byItemId.get(itemId)!.deck.id)),
    ) as typeof review;
  }, [liveReview, reviewScope, byItemId]);
  const queuedIds = useMemo(
    () => reviewQueue(scopedReview, REVIEW_SESSION_LIMIT, now),
    [scopedReview, now],
  );
  const queuedCount = queuedIds.length;
  const queuedDueCount = useMemo(
    () => queuedIds.filter((id) => (liveReview[id]?.dueAt ?? Infinity) <= now).length,
    [queuedIds, liveReview, now],
  );

  const sessionToken = useRef(0);
  const start = useCallback((next: Omit<Session, 'token'>) => {
    sessionToken.current += 1;
    setSession({ ...next, token: sessionToken.current });
    setQIdx(0);
    setSelected(null);
    setCorrect(0);
    setStreak(0);
    setComplete(false);
  }, []);

  const startDeck = useCallback(
    (id: string) => {
      const next = deckSession(id);
      if (next) start(next);
    },
    [start],
  );

  const startReview = useCallback(() => {
    const items = queuedIds
      .map((id) => byItemId.get(id))
      .filter((entry): entry is IndexedQuestion => entry !== undefined);
    if (items.length === 0) return;
    start({ kind: 'review', id: 'review', titleKey: 'learning.concept.review.title', items });
  }, [queuedIds, byItemId, start]);

  // Once, on mount: arriving to review (e.g. from the learning path) should not
  // need a second tap on the Review button.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (autoStartReview && !deckId && queuedDueCount > 0) startReview();
  }, [autoStartReview, deckId, queuedDueCount, startReview]);

  const result = useMemo<DrillResult | null>(() => {
    if (!question || selected === null) return null;
    const right = correctOption(question);
    const ok = isCorrectChoice(question, selected);
    const chosen = question.options.find((option) => option.key === selected);
    const general = t(question.explanationKey);
    // On a wrong pick, lead with why *that* choice is wrong (when authored),
    // then the general explanation of the right answer.
    const distractorWhy = !ok && chosen?.whyKey ? t(chosen.whyKey) : '';
    return {
      correct: ok,
      expected: right ? t(right.key) : '',
      explanation: distractorWhy ? `${distractorWhy} ${general}` : general,
    };
  }, [question, selected, t]);

  // A modal that does not contain us is covering us. None of the shell's modals
  // traps Tab or marks the background inert, so a covered option button stays both
  // clickable and keyboard-reachable — and a question the learner cannot read must
  // never be graded into spaced repetition. A modal we live inside is still ours.
  const isCovered = useCallback(
    () =>
      Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
        (modal) => !modal.contains(panelRef.current),
      ),
    [],
  );

  const answer = useCallback(
    (optionKey: string) => {
      if (!question || !indexedQ || selected !== null || isCovered()) return;
      const ok = isCorrectChoice(question, optionKey);
      setSelected(optionKey);
      if (ok) setCorrect((value) => value + 1);
      setStreak((value) => (ok ? value + 1 : 0));
      // Feed the spaced-repetition scheduler and persist.
      setReview((prev) => {
        const nextState = gradeReview(prev, indexedQ.itemId, ok, Date.now());
        reviewStore.save(nextState);
        return nextState;
      });
    },
    [question, indexedQ, selected, reviewStore, isCovered],
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

  // Power-keys for the quiz: 1–3 pick an option, Enter advances after answering.
  // Skipped while typing in a field (e.g. the picker search) and once complete.
  useEffect(() => {
    if (!session || complete || !question) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        // Never steal keys from a field the user is typing in — including a host
        // page's own <select> or rich-text editor, since this listener is on document.
        // The attribute is checked too: jsdom does not implement isContentEditable.
        const editable =
          target.isContentEditable ||
          target.closest('[contenteditable]:not([contenteditable=false])');
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      }
      // Leave browser/OS shortcuts alone: ⌘1 switches tabs, it must not answer.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Only claim keys the panel owns. The listener is on `document` so that the
      // shortcuts work with nothing focused (body), but a focused control in the
      // HOST page must keep its own Enter/1-3 — preventDefault() here would cancel
      // that button's activation and silently advance the quiz instead.
      const unfocused = target === document.body || target === document || target === null;
      if (!unfocused && !(target instanceof Node && panelRef.current?.contains(target))) return;
      // `answer` re-checks this, but Enter-to-advance is graded by no one else.
      if (isCovered()) return;
      if (selected === null) {
        const index = ['1', '2', '3'].indexOf(event.key);
        const option = index >= 0 ? options[index] : undefined;
        if (option) {
          event.preventDefault();
          answer(option.key);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [session, complete, question, selected, options, answer, next, isCovered]);

  if (!strings) return null;

  // ── Deck picker ──────────────────────────────────────────────────────────
  if (!session) {
    const seenItem = (id: string) => liveReview[id] !== undefined;
    const masteredItem = (id: string) => isMastered(liveReview, id);
    // Filter decks by name so a learner (keyboard especially) can jump to a
    // protocol without tabbing through all of them.
    const q = query.trim().toLowerCase();
    const filteredGroups = q
      ? groups
          .map((group) => ({
            ...group,
            decks: group.decks.filter((deck) => t(deck.nameKey).toLowerCase().includes(q)),
          }))
          .filter((group) => group.decks.length > 0)
      : groups;
    return (
      <DrillFrame idPrefix="concept-check" containerRef={panelRef}>
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
          <div
            data-testid="concept-check-mastery-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={indexed.length}
            aria-valuenow={stats.mastered}
            aria-label={t('learning.concept.review.mastered', {
              mastered: stats.mastered,
              total: indexed.length,
            })}
            style={{
              height: 6,
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--netlab-text-secondary) 22%, transparent)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${indexed.length ? (stats.mastered / indexed.length) * 100 : 0}%`,
                background: 'var(--netlab-accent-green)',
                borderRadius: 999,
                transition: 'width 240ms ease',
              }}
            />
          </div>
          <ConceptCallout idPrefix="concept-check" title={t('learning.concept.primer.title')}>
            {t('learning.concept.primer.body')}
          </ConceptCallout>

          {queuedCount > 0 && (
            <button
              type="button"
              data-testid="concept-check-review"
              onClick={startReview}
              style={pillButton(
                queuedDueCount > 0 ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-yellow)',
              )}
            >
              {queuedDueCount > 0
                ? t('learning.concept.review.due', { count: queuedDueCount })
                : t('learning.concept.review.start', { count: queuedCount })}
            </button>
          )}

          <p style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 13 }}>
            {t('learning.concept.pickDeck')}
          </p>
          <input
            type="text"
            data-testid="concept-check-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('learning.concept.search')}
            aria-label={t('learning.concept.search')}
            autoComplete="off"
            style={{
              padding: '12px 12px',
              borderRadius: 'var(--netlab-radius-sm)',
              border: '1px solid var(--netlab-learning-surface-border)',
              background: 'var(--netlab-bg-primary)',
              color: 'var(--netlab-text-primary)',
              fontSize: 13,
            }}
          />
          {filteredGroups.length === 0 && (
            <p
              data-testid="concept-check-search-empty"
              style={{ margin: 0, color: 'var(--netlab-text-secondary)', fontSize: 13 }}
            >
              {t('learning.concept.searchEmpty', { query: query.trim() })}
            </p>
          )}
          {filteredGroups.map((group) => (
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
      <DrillFrame idPrefix="concept-check" containerRef={panelRef}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* Closes the loop: missed items just seeded the review pool, so offer
                to drill them immediately rather than hunting on the picker. */}
            {queuedCount > 0 && (
              <button
                type="button"
                data-testid="concept-check-summary-review"
                onClick={startReview}
                style={pillButton('var(--netlab-accent-yellow)')}
              >
                {t('learning.concept.review.start', { count: queuedCount })}
              </button>
            )}
            {deckId && getDeck(deckId) ? (
              // Started in one deck: there is no picker to go back to.
              <button
                type="button"
                data-testid="concept-check-again"
                onClick={() => startDeck(deckId)}
                style={pillButton('var(--netlab-accent-blue)')}
              >
                {t('learning.drill.practiceAgain')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="concept-check-back"
                onClick={backToDecks}
                style={pillButton('var(--netlab-accent-blue)')}
              >
                {t('learning.concept.backToDecks')}
              </button>
            )}
            {endActions}
          </div>
        </div>
      </DrillFrame>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const isLast = qIdx + 1 >= total;
  return (
    <DrillFrame idPrefix="concept-check" containerRef={panelRef}>
      <div style={drillCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2
            data-testid="concept-check-session-title"
            style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}
          >
            {t(session.titleKey)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            {streak >= 2 && (
              <span
                data-testid="concept-check-streak"
                aria-label={t('learning.concept.streak', { count: streak })}
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--netlab-accent-yellow)',
                }}
              >
                🔥 {streak}
              </span>
            )}
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  borderRadius: 'var(--netlab-radius-sm)',
                  // Options not picked keep full opacity (fading them dropped the text to about
                  // 3:1); secondary text sets them apart while ✓/✗ marks the two that count.
                  ...(result !== null && !isWinner && !isWrongChoice
                    ? { color: 'var(--netlab-text-secondary)' }
                    : {}),
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    minWidth: 16,
                    textAlign: 'center',
                    opacity: 0.85,
                  }}
                >
                  {result !== null ? (isWinner ? '✓' : isWrongChoice ? '✗' : '·') : index + 1}
                </span>
                <span>{t(option.key)}</span>
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
