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

async function reviewButton(path: string): Promise<string> {
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <ConceptCheckDemo />
      </MemoryRouter>,
    ),
  );
  for (let i = 0; i < 100; i += 1) {
    const button = container.querySelector('[data-testid="concept-check-review"]');
    if (button) return button.textContent ?? '';
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  throw new Error('no review button');
}

describe('the concept checks page, opened for some decks', () => {
  it('TC-2296: ?review= limits the review queue to those decks', async () => {
    expect(await reviewButton('/learning/protocols?review=arp')).toBe('Review due now (2)');
  });

  it('TC-2296: without ?review= every due item is queued', async () => {
    expect(await reviewButton('/learning/protocols')).toBe('Review due now (3)');
  });
});
