/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
// Concept-check strings are a lazy sub-catalog now (not in the assembled en).
import { conceptCheck as en } from '../../i18n/locales/en/conceptCheck';
import { CONCEPT_DECKS, correctOption, getDeck } from '../../learning/concept-check';
import { createReviewStore } from '../../learning/review';
import { createMemoryProgressStorage } from '../../progress';
// Render the inner directly: the public ConceptCheckPanel is a React.lazy wrapper
// (the concept catalog is lazy-loaded out of the root bundle), and the inner
// provides the concept-check i18n strings synchronously for the test.
import ConceptCheckPanel from './ConceptCheckPanelInner';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;
// Fresh in-memory review store per test so spaced-repetition state never leaks.
let store = createReviewStore(createMemoryProgressStorage());

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  // Defence in depth: every test here injects a memory store, but jsdom shares one
  // localStorage across the file, and a panel rendered WITHOUT `reviewStore` writes
  // there (verified) — so a future test that forgets to inject would silently leak
  // spaced-repetition state into the ones after it.
  localStorage.clear();
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

    // Mastery indicator counts MASTERED, not merely seen: every item here was
    // answered wrong, so the numerator must be 0 even though `seen` is now `total`.
    // Asserting the shape (`n / m mastered`) alone would pass for any field.
    expect(testid('concept-check-mastery')?.textContent).toContain('0 / ');
    expect(testid('concept-check-mastery-bar')?.getAttribute('aria-valuenow')).toBe('0');

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

  it('re-shuffles when the same question is presented again in a new session', () => {
    // Deck questions are module-level singletons, so memoising the shuffle on the
    // question object alone replays the previous order — position memorisation,
    // the exact thing the shuffle exists to prevent.
    store.save({ 'arp:q1': { box: 1, dueAt: 0 } });
    const first = vi.spyOn(Math, 'random').mockReturnValue(0);
    render();
    click('concept-check-review');
    const before = [optionText(0), optionText(1), optionText(2)];
    clickOption('arp', 2, 'correct'); // arp order: q4, q5, q1 → the pool's only item
    click('concept-check-next');
    first.mockRestore();

    // Restart the same one-item pool with a different draw: a real re-shuffle must
    // produce a different order, not replay the memoised one.
    const second = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    click('concept-check-summary-review');
    const after = [optionText(0), optionText(1), optionText(2)];
    second.mockRestore();
    expect(after).not.toEqual(before);
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

    // A wrong answer breaks the streak — the chip must disappear, not keep climbing.
    press('Enter');
    clickOption('arp', 2, 'wrong');
    expect(testid('concept-check-streak')).toBeNull();
  });

  it('explains why a wrong choice is wrong, distractor first then the general why', () => {
    render();
    click('concept-check-deck-model');
    const strings = en as Record<string, string>;
    const question = getDeck('model')!.questions[0]!;
    // Options are shuffled, so map the rendered distractor back to its own key to
    // know which "why" must lead.
    const want = correctText('model', 0);
    const wrongIdx = [0, 1, 2].find((i) => optionText(i) !== want)!;
    const chosen = question.options.find((o) => strings[o.key]!.trim() === optionText(wrongIdx))!;
    click(`concept-check-option-${wrongIdx}`);

    const feedback = testid('concept-check-feedback')?.textContent ?? '';
    const distractor = strings[chosen.whyKey!]!;
    const general = strings[question.explanationKey]!;
    // Order is the design decision, not just membership: the learner must first
    // read why THEIR pick fails, then the general explanation. Both whys here open
    // with "Layering", so only an index comparison catches a swapped composition.
    expect(feedback).toContain(distractor);
    expect(feedback.indexOf(general)).toBeGreaterThan(feedback.indexOf(distractor));
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

  it('ignores number keys pressed with a modifier (⌘1 switches tabs, it must not answer)', () => {
    render();
    click('concept-check-deck-arp');
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '1', metaKey: true, bubbles: true }),
      ),
    );
    // Still unanswered: no feedback, and nothing was graded into the review store.
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();
    expect(store.load()).toEqual({});
  });

  it('does not steal keys from a focused control outside the panel', () => {
    render();
    click('concept-check-deck-arp');
    // The host page's own button, focused. Both keys below are ones the panel WOULD
    // claim from the body, so this fails if the ownership gate is removed.
    const hostButton = document.createElement('button');
    document.body.appendChild(hostButton);
    const fromHost = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      act(() => {
        hostButton.dispatchEvent(event);
      });
      return event;
    };

    // Unanswered: "1" must not grade the question.
    const numberKey = fromHost('1');
    expect(numberKey.defaultPrevented).toBe(false);
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();

    // Answered: Enter must activate the host button, not advance the quiz.
    clickOption('arp', 0, 'correct');
    const before = testid('concept-check-progress')?.textContent;
    const enterKey = fromHost('Enter');
    expect(enterKey.defaultPrevented).toBe(false);
    expect(testid('concept-check-progress')?.textContent).toBe(before);
    hostButton.remove();
  });

  it('does not answer while a modal covers the panel', () => {
    render();
    click('concept-check-deck-arp');
    // The shell's `?` cheat sheet is a real modal that does NOT move focus, so focus
    // stays on the prompt — inside the panel, which the ownership gate accepts. The
    // question is covered and unreadable, yet "1" would grade and persist it.
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    const event = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
    act(() => {
      testid('concept-check-prompt')!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();
    expect(store.load()).toEqual({});

    // Closing it hands the keys straight back — no re-focus required. (The feedback
    // region is always mounted, so "graded" is read off the store and the verdict.)
    modal.remove();
    act(() =>
      testid('concept-check-prompt')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }),
      ),
    );
    expect(Object.keys(store.load())).toHaveLength(1);
  });

  it('still answers when the panel itself is inside the modal', () => {
    // A host app may mount the panel in its own dialog — the guard must gate on
    // "covered by someone else", not "a modal exists".
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    modal.appendChild(container!);
    render();
    click('concept-check-deck-arp');
    act(() =>
      testid('concept-check-prompt')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }),
      ),
    );
    expect(Object.keys(store.load())).toHaveLength(1);
    modal.remove();
  });

  it('does not answer via click while a modal covers the panel', () => {
    render();
    click('concept-check-deck-arp');
    // None of the shell's modals trap Tab or mark the background inert, so a covered
    // option button stays reachable — Enter on it fires a native click that never
    // passes through the keydown handler.
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    click('concept-check-option-0');
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();
    expect(store.load()).toEqual({});
    modal.remove();
  });

  it('does not answer when a second modal covers the modal holding the panel', () => {
    // Host dialog first in document order, cheat sheet stacked on top: checking only
    // the FIRST aria-modal node would find our own container and let "1" through.
    const host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    document.body.appendChild(host);
    host.appendChild(container!);
    render();
    click('concept-check-deck-arp');

    const covering = document.createElement('div');
    covering.setAttribute('role', 'dialog');
    covering.setAttribute('aria-modal', 'true');
    document.body.appendChild(covering);
    const event = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
    act(() => {
      testid('concept-check-prompt')!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();
    expect(store.load()).toEqual({});

    covering.remove();
    host.remove();
  });

  it('does not steal keys from a rich-text field inside the panel', () => {
    render();
    click('concept-check-deck-arp');
    // Inside the panel, so the ownership gate passes and the typing-target bail is
    // what has to stop us — a host app may render an editor within our slot.
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    testid('concept-check')!.appendChild(editor);
    const event = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
    act(() => {
      editor.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(testid('concept-check-correct')).toBeNull();
    expect(testid('concept-check-incorrect')).toBeNull();
    editor.remove();
  });

  it('ignores persisted review items that are no longer in the catalog', () => {
    // A stale entry (deck removed/renamed) must not be counted, or the Review
    // button would render a number yet start nothing when clicked.
    store.save({ 'ghost-deck:q1': { box: 1, dueAt: 0 } });
    render();
    expect(testid('concept-check-review')).toBeNull();
    expect(testid('concept-check-mastery-bar')?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('shows the due-now label when the pool holds an item past its due time', () => {
    // The red "due now" branch is the signal the daily-review ritual depends on.
    store.save({
      'arp:q1': { box: 1, dueAt: 0 },
      'tcp:q1': { box: 1, dueAt: Date.now() + 60_000 },
    });
    render();
    const button = testid('concept-check-review');
    expect(button?.textContent).toContain('due now');
    expect(button?.textContent).toContain('1'); // only the past-due item counts
  });

  it('focuses the prompt when a one-item review session restarts', () => {
    // Regression: the focus key was `${session.id}:${qIdx}`; a review session's id
    // is always 'review' and qIdx stays 0, so restarting a single-item pool reused
    // the same key, the effect never re-ran, and focus fell to <body>.
    store.save({ 'arp:q1': { box: 1, dueAt: 0 } });
    render();
    click('concept-check-review');
    clickOption('arp', 2, 'correct'); // arp deck order: q4, q5, q1 → index 2 is q1
    click('concept-check-next'); // one item, so this completes the session
    expect(testid('concept-check-summary')).not.toBeNull();

    click('concept-check-summary-review');
    expect(testid('concept-check-prompt')).not.toBeNull();
    expect(document.activeElement).toBe(testid('concept-check-prompt'));
  });

  it('re-translates the session header when the locale changes mid-quiz', () => {
    // The header must follow the locale like every other string: a session stores
    // the deck's i18n key, not the text translated at start time.
    act(() =>
      root?.render(
        <I18nProvider locale="en">
          <ConceptCheckPanel reviewStore={store} />
        </I18nProvider>,
      ),
    );
    click('concept-check-deck-ethernet');
    expect(testid('concept-check-session-title')?.textContent).toBe('Ethernet');

    act(() =>
      root?.render(
        <I18nProvider locale="ja">
          <ConceptCheckPanel reviewStore={store} />
        </I18nProvider>,
      ),
    );
    expect(testid('concept-check-session-title')?.textContent).toBe('イーサネット');
  });
});
