/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { en } from '../../i18n/locales/en';
import { CONCEPT_DECKS, correctOption, getDeck } from '../../learning/concept-check';
import { createReviewStore } from '../../learning/review';
import { createMemoryProgressStorage } from '../../progress';
import { ConceptCheckPanel } from './ConceptCheckPanel';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;
// Fresh in-memory review store per test so spaced-repetition state never leaks.
let store = createReviewStore(createMemoryProgressStorage());

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  store = createReviewStore(createMemoryProgressStorage());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
});

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) ?? null;
}

function click(id: string) {
  const el = testid(id) as HTMLElement;
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

/** The en-rendered text of a deck question's correct option. */
function correctText(deckId: string, qIdx: number): string {
  const question = getDeck(deckId)!.questions[qIdx]!;
  return (en as Record<string, string>)[correctOption(question)!.key]!.trim();
}

/** The option's label text (last span), separate from the leading number/✓/✗ badge. */
function optionText(index: number): string {
  const button = testid(`concept-check-option-${index}`);
  const label = button?.querySelector('span:last-child');
  return (label?.textContent ?? button?.textContent ?? '').trim();
}

/**
 * Options are shuffled per presentation, so the correct one is located by its
 * rendered text, not a fixed slot. `which: 'correct'` clicks the right answer;
 * `'wrong'` clicks any distractor.
 */
function clickOption(deckId: string, qIdx: number, which: 'correct' | 'wrong') {
  const want = correctText(deckId, qIdx);
  for (let i = 0; i < 3; i += 1) {
    const matchesCorrect = optionText(i) === want;
    if (which === 'correct' ? matchesCorrect : !matchesCorrect) {
      click(`concept-check-option-${i}`);
      return;
    }
  }
  throw new Error(`no ${which} option found for ${deckId}/${qIdx}`);
}

function render() {
  act(() => root?.render(<ConceptCheckPanel reviewStore={store} />));
}

describe('ConceptCheckPanel', () => {
  it('lists a deck button for every protocol in the registry', () => {
    render();
    expect(testid('concept-check-picker')).not.toBeNull();
    for (const deck of CONCEPT_DECKS) {
      expect(testid(`concept-check-deck-${deck.id}`)).not.toBeNull();
    }
  });

  it('runs a deck: correct answer is graded, wrong answer reveals the right one', () => {
    render();
    click('concept-check-deck-arp');
    expect(testid('concept-check-prompt')).not.toBeNull();

    clickOption('arp', 0, 'correct');
    expect(testid('concept-check-correct')).not.toBeNull();

    click('concept-check-next');
    clickOption('arp', 1, 'wrong');
    expect(testid('concept-check-incorrect')).not.toBeNull();
    // The revealed correct option is marked with a ✓, wherever it landed.
    const want = correctText('arp', 1);
    const winner = [0, 1, 2].find((i) => optionText(i) === want);
    expect(testid(`concept-check-option-${winner}`)?.textContent).toContain('✓');
  });

  it('finishes a deck to a scored summary and returns to the picker', () => {
    render();
    click('concept-check-deck-tcp');
    const total = getDeck('tcp')!.questions.length;
    for (let i = 0; i < total; i += 1) {
      clickOption('tcp', i, 'correct');
      click('concept-check-next');
    }
    expect(testid('concept-check-summary')).not.toBeNull();
    expect(testid('concept-check-score')?.textContent).toContain(`${total} / ${total}`);

    click('concept-check-back');
    expect(testid('concept-check-picker')).not.toBeNull();
  });

  it('feeds spaced repetition: after a deck, a Review pool appears and is replayable', () => {
    render();
    // No review pool before any practice.
    expect(testid('concept-check-review')).toBeNull();

    const total = getDeck('udp')!.questions.length;
    click('concept-check-deck-udp');
    for (let i = 0; i < total; i += 1) {
      // Answer wrong so the items land in low boxes (definitely in-review).
      clickOption('udp', i, 'wrong');
      click('concept-check-next');
    }
    click('concept-check-back');

    // The Review button now appears with the practiced items.
    const review = testid('concept-check-review');
    expect(review).not.toBeNull();
    expect(review?.textContent).toContain(String(total));

    // Mastery indicator reflects progress out of all questions.
    expect(testid('concept-check-mastery')?.textContent).toMatch(/\/\s*\d+/);

    // The practiced deck shows a per-deck progress badge (0 mastered / total seen).
    const badge = testid('concept-check-deck-progress-udp');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain(`0/${total}`);
    // A deck never practiced shows no badge.
    expect(testid('concept-check-deck-progress-arp')).toBeNull();

    // Running the review session quizzes the weak items.
    click('concept-check-review');
    expect(testid('concept-check-prompt')).not.toBeNull();
  });

  it('shuffles option order each presentation so reviews are genuine recall', () => {
    // Force a deterministic permutation: Fisher-Yates with random()→0 maps the
    // original order [o0,o1,o2] to [o1,o2,o0], so slot 0 shows the 2nd option.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    render();
    click('concept-check-deck-arp');
    const original = getDeck('arp')!.questions[0]!.options.map(
      (option) => (en as Record<string, string>)[option.key]!,
    );
    expect(optionText(0)).toBe(original[1]!.trim());
    expect(optionText(2)).toBe(original[0]!.trim());
    // Every original option is still present exactly once (none lost in shuffle).
    expect([optionText(0), optionText(1), optionText(2)].sort()).toEqual(
      original.map((text) => text.trim()).sort(),
    );
    spy.mockRestore();
  });

  it('offers an immediate review from the summary when questions were missed', () => {
    render();
    const total = getDeck('arp')!.questions.length;
    click('concept-check-deck-arp');
    for (let i = 0; i < total; i += 1) {
      clickOption('arp', i, 'wrong');
      click('concept-check-next');
    }
    // The summary surfaces the review action directly (no trip back to the picker).
    const review = testid('concept-check-summary-review');
    expect(review).not.toBeNull();
    expect(review?.textContent).toContain(String(total));
    click('concept-check-summary-review');
    // A review session starts straight away.
    expect(testid('concept-check-prompt')).not.toBeNull();
  });

  it('filters the deck list by the search query', () => {
    render();
    // All decks visible initially.
    expect(testid('concept-check-deck-bgp')).not.toBeNull();
    expect(testid('concept-check-deck-arp')).not.toBeNull();

    const input = testid('concept-check-search') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setValue.call(input, 'bgp');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Only matching decks remain; non-matches are gone.
    expect(testid('concept-check-deck-bgp')).not.toBeNull();
    expect(testid('concept-check-deck-arp')).toBeNull();

    // A no-match query shows the empty message.
    act(() => {
      setValue.call(input, 'zzzznope');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(testid('concept-check-search-empty')).not.toBeNull();
  });

  it('answers via number keys, advances on Enter, and tracks a streak', () => {
    render();
    click('concept-check-deck-arp');
    const press = (key: string) =>
      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
    const correctIndexNow = (qIdx: number) => {
      const want = correctText('arp', qIdx);
      return [0, 1, 2].findIndex((i) => optionText(i) === want);
    };

    // q0: press the correct option's number key → graded correct.
    press(String(correctIndexNow(0) + 1));
    expect(testid('concept-check-correct')).not.toBeNull();
    // No streak chip yet (1 in a row).
    expect(testid('concept-check-streak')).toBeNull();

    // Enter advances; answer q1 correctly too → streak chip shows 2.
    press('Enter');
    press(String(correctIndexNow(1) + 1));
    expect(testid('concept-check-streak')?.textContent).toContain('2');
  });

  it('explains why a wrong choice is wrong (distractor explanation)', () => {
    render();
    click('concept-check-deck-model');
    clickOption('model', 0, 'wrong');
    const feedback = testid('concept-check-feedback')?.textContent ?? '';
    // The distractor-specific "why" leads, and the general explanation follows.
    expect(feedback).toMatch(/adds no delay|divides responsibilities/);
    expect(feedback).toContain('evolve independently');
  });

  it('shows a mastery progress bar reflecting total questions', () => {
    render();
    const bar = testid('concept-check-mastery-bar');
    expect(bar).not.toBeNull();
    // Nothing mastered yet; the bar spans all questions across every deck.
    const totalQuestions = CONCEPT_DECKS.reduce((sum, deck) => sum + deck.questions.length, 0);
    expect(bar?.getAttribute('aria-valuenow')).toBe('0');
    expect(bar?.getAttribute('aria-valuemax')).toBe(String(totalQuestions));
  });

  it('moves focus onto the feedback after answering (no focus-loss to body)', () => {
    render();
    click('concept-check-deck-arp');
    clickOption('arp', 0, 'correct');
    // The answered option disables itself; focus must land on the feedback, not body.
    expect(document.activeElement).toBe(testid('concept-check-correct'));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('moves focus to the new question prompt on advance (keyboard/SR users)', () => {
    render();
    click('concept-check-deck-arp');
    clickOption('arp', 0, 'correct');
    click('concept-check-next');
    // After advancing, the prompt is focused so a screen reader announces it.
    expect(document.activeElement).toBe(testid('concept-check-prompt'));
  });

  it('renders Japanese inside an I18nProvider with locale ja', () => {
    act(() =>
      root?.render(
        <I18nProvider locale="ja">
          <ConceptCheckPanel reviewStore={store} />
        </I18nProvider>,
      ),
    );
    expect(container?.textContent).toContain('プロトコル・コンセプトチェック');
    click('concept-check-deck-dns');
    expect(testid('concept-check-prompt')?.textContent).toContain('DNS');
  });
});
