/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n';
import { CONCEPT_DECKS, correctOption, getDeck } from '../../learning/concept-check';
import { ConceptCheckPanel } from './ConceptCheckPanel';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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

/** Index of the correct option for the current question of a deck. */
function correctIndex(deckId: string, qIdx: number): number {
  const question = getDeck(deckId)!.questions[qIdx]!;
  const right = correctOption(question)!;
  return question.options.findIndex((option) => option.key === right.key);
}

describe('ConceptCheckPanel', () => {
  it('lists a deck button for every protocol in the registry', () => {
    act(() => root?.render(<ConceptCheckPanel />));
    expect(testid('concept-check-picker')).not.toBeNull();
    for (const deck of CONCEPT_DECKS) {
      expect(testid(`concept-check-deck-${deck.id}`)).not.toBeNull();
    }
  });

  it('runs a deck: correct answer is graded, wrong answer reveals the right one', () => {
    act(() => root?.render(<ConceptCheckPanel />));
    click('concept-check-deck-arp');
    expect(testid('concept-check-prompt')).not.toBeNull();

    // Answer the first question correctly.
    click(`concept-check-option-${correctIndex('arp', 0)}`);
    expect(testid('concept-check-correct')).not.toBeNull();

    click('concept-check-next');
    // Answer the second question wrong; the correct option is marked ✓.
    const wrongIdx = (correctIndex('arp', 1) + 1) % 3;
    click(`concept-check-option-${wrongIdx}`);
    expect(testid('concept-check-incorrect')).not.toBeNull();
    expect(testid(`concept-check-option-${correctIndex('arp', 1)}`)?.textContent).toContain('✓');
  });

  it('finishes a deck to a scored summary and returns to the picker', () => {
    act(() => root?.render(<ConceptCheckPanel />));
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

  it('renders Japanese inside an I18nProvider with locale ja', () => {
    act(() =>
      root?.render(
        <I18nProvider locale="ja">
          <ConceptCheckPanel />
        </I18nProvider>,
      ),
    );
    expect(container?.textContent).toContain('プロトコル・コンセプトチェック');
    click('concept-check-deck-dns');
    expect(testid('concept-check-prompt')?.textContent).toContain('DNS');
  });
});
