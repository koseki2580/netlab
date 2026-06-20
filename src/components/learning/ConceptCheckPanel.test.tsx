/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n';
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

function correctIndex(deckId: string, qIdx: number): number {
  const question = getDeck(deckId)!.questions[qIdx]!;
  const right = correctOption(question)!;
  return question.options.findIndex((option) => option.key === right.key);
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

    click(`concept-check-option-${correctIndex('arp', 0)}`);
    expect(testid('concept-check-correct')).not.toBeNull();

    click('concept-check-next');
    const wrongIdx = (correctIndex('arp', 1) + 1) % 3;
    click(`concept-check-option-${wrongIdx}`);
    expect(testid('concept-check-incorrect')).not.toBeNull();
    expect(testid(`concept-check-option-${correctIndex('arp', 1)}`)?.textContent).toContain('✓');
  });

  it('finishes a deck to a scored summary and returns to the picker', () => {
    render();
    click('concept-check-deck-tcp');
    const total = getDeck('tcp')!.questions.length;
    for (let i = 0; i < total; i += 1) {
      click(`concept-check-option-${correctIndex('tcp', i)}`);
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
      click(`concept-check-option-${(correctIndex('udp', i) + 1) % 3}`);
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
