/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REVIEW_STORAGE_KEY } from '../../src/learning/review';
import ConceptCheckDemo from './ConceptCheckDemo';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  localStorage.setItem(
    REVIEW_STORAGE_KEY,
    JSON.stringify({
      'arp:q1': { box: 1, dueAt: 0 },
      'arp:q2': { box: 1, dueAt: 0 },
      'tcp:q1': { box: 1, dueAt: 0 },
    }),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function waitFor(testid: string): Promise<HTMLElement> {
  for (let i = 0; i < 100; i += 1) {
    const element = container.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
    if (element) return element;
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  throw new Error(`no ${testid}`);
}

function open(path: string) {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <ConceptCheckDemo />
      </MemoryRouter>,
    ),
  );
}

async function reviewButton(path: string): Promise<string> {
  open(path);
  return (await waitFor('concept-check-review')).textContent ?? '';
}

function click(testid: string) {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  if (!element) throw new Error(`no ${testid}`);
  act(() => element.click());
}

describe('the concept checks page, opened for some decks', () => {
  it('TC-2296: ?review= limits the review queue to those decks', async () => {
    open('/learning/protocols?review=arp');
    expect((await waitFor('concept-check-progress')).textContent).toContain('1 / 2');
  });

  it('TC-2296: without ?review= every due item is queued', async () => {
    expect(await reviewButton('/learning/protocols')).toBe('Review due now (3)');
  });
});

describe('the concept checks page, opened from the learning path', () => {
  it('TC-2370: ?review= starts the due review at once and its end links to the path', async () => {
    open('/learning/protocols?review=arp');
    // The first due question shows without another tap.
    await waitFor('concept-check-prompt');
    expect(container.querySelector('[data-testid="concept-check-picker"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="concept-check-session-title"]')?.textContent,
    ).toBe('Review');
    for (let i = 0; i < 2; i += 1) {
      click('concept-check-option-0');
      await waitFor('concept-check-next');
      click('concept-check-next');
    }
    const summary = await waitFor('concept-check-summary');
    const back = Array.from(summary.querySelectorAll('a')).find(
      (link) => link.getAttribute('href') === '/path',
    );
    expect(back?.textContent).toBe('← Back to the learning path');
  });

  it('TC-2370: ?review= with nothing due keeps the picker', async () => {
    localStorage.setItem(
      REVIEW_STORAGE_KEY,
      JSON.stringify({ 'arp:q1': { box: 1, dueAt: Number.MAX_SAFE_INTEGER } }),
    );
    open('/learning/protocols?review=arp');
    await waitFor('concept-check-picker');
    expect(container.querySelector('[data-testid="concept-check-prompt"]')).toBeNull();
  });

  it('TC-2370: without ?review= the end screen offers no way to the path', async () => {
    open('/learning/protocols');
    click((await waitFor('concept-check-review')).dataset.testid!);
    for (let i = 0; i < 3; i += 1) {
      click('concept-check-option-0');
      await waitFor('concept-check-next');
      click('concept-check-next');
    }
    const summary = await waitFor('concept-check-summary');
    expect(summary.querySelector('a[href="/path"]')).toBeNull();
  });

  it('TC-2371: the ja review button reads 復習する（N 問）', async () => {
    localStorage.setItem('netlab-locale', 'ja');
    expect(await reviewButton('/learning/protocols')).toBe('復習する（3 問）');
  });

  it('TC-2370: the ja end screen leads back to 学習の道すじ', async () => {
    localStorage.setItem('netlab-locale', 'ja');
    open('/learning/protocols?review=arp');
    await waitFor('concept-check-prompt');
    for (let i = 0; i < 2; i += 1) {
      click('concept-check-option-0');
      await waitFor('concept-check-next');
      click('concept-check-next');
    }
    const summary = await waitFor('concept-check-summary');
    expect(summary.querySelector('a[href="/path"]')?.textContent).toBe('← 学習の道すじへ');
  });
});
