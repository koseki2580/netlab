import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  correctOption,
  decksByLayer,
  getDeck,
  isCorrectChoice,
} from '../../learning/concept-check';
import {
  ConceptCallout,
  DrillFeedback,
  DrillFrame,
  drillCardStyle,
  pillButton,
  useDrillCompletion,
  useFocusWhen,
} from './drillKit';
import type { DrillResult } from './drillKit';

/**
 * Active-recall quiz that scales across protocols: pick a protocol deck, answer
 * its multiple-choice questions, get explained feedback and a score. Decks are
 * pure data (`CONCEPT_DECKS`) addressed by i18n key, so adding a protocol is a
 * data change — the path to covering almost the whole stack. All chrome and
 * content route through the catalog (en/ja).
 */
export function ConceptCheckPanel() {
  const { t } = useI18n();
  const groups = useMemo(() => decksByLayer(), []);

  const [deckId, setDeckId] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [complete, setComplete] = useState(false);

  const deck = deckId ? getDeck(deckId) : undefined;
  const total = deck?.questions.length ?? 0;
  const question = deck?.questions[qIdx];
  const summaryRef = useFocusWhen<HTMLHeadingElement>(complete);
  useDrillCompletion(
    `concept-${deckId ?? 'none'}`,
    deck ? `Concept Check — ${deckId}` : 'Concept Check',
    complete,
    correct,
    total,
  );

  const startDeck = useCallback((id: string) => {
    setDeckId(id);
    setQIdx(0);
    setSelected(null);
    setCorrect(0);
    setComplete(false);
  }, []);

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
      if (!question || selected !== null) return;
      setSelected(optionKey);
      if (isCorrectChoice(question, optionKey)) setCorrect((value) => value + 1);
    },
    [question, selected],
  );

  const next = useCallback(() => {
    if (qIdx + 1 >= total) {
      setComplete(true);
      return;
    }
    setQIdx((value) => value + 1);
    setSelected(null);
  }, [qIdx, total]);

  const backToDecks = useCallback(() => setDeckId(null), []);

  // ── Deck picker ──────────────────────────────────────────────────────────
  if (!deck) {
    return (
      <DrillFrame idPrefix="concept-check">
        <div data-testid="concept-check-picker" style={drillCardStyle}>
          <h2 style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 18 }}>
            {t('learning.concept.title')}
          </h2>
          <ConceptCallout idPrefix="concept-check" title={t('learning.concept.primer.title')}>
            {t('learning.concept.primer.body')}
          </ConceptCallout>
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
                {group.decks.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    data-testid={`concept-check-deck-${entry.id}`}
                    onClick={() => startDeck(entry.id)}
                    style={pillButton('var(--netlab-accent-blue)')}
                  >
                    {t(entry.nameKey)}
                  </button>
                ))}
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
            {t(deck.nameKey)}
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
          data-testid="concept-check-prompt"
          style={{ margin: 0, color: 'var(--netlab-text-primary)', fontSize: 16, lineHeight: 1.5 }}
        >
          {question ? t(question.promptKey) : ''}
        </p>

        <div style={{ display: 'grid', gap: 8 }}>
          {question?.options.map((option, index) => {
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
