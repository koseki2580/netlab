/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createReviewStore, type ReviewState } from '../../src/learning/review';
import { createMemoryProgressStorage } from '../../src/progress';
import { PathBody } from './PathPage';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function render(state: ReviewState): HTMLElement {
  const reviewStore = createReviewStore(createMemoryProgressStorage());
  reviewStore.save(state);
  act(() =>
    root.render(
      <MemoryRouter initialEntries={['/path']}>
        <PathBody reviewStore={reviewStore} />
      </MemoryRouter>,
    ),
  );
  return host;
}

const later = Date.now() + 86_400_000;

describe('reviews due on the learning path', () => {
  it('TC-2294: a stage counts the reviews due now in its lessons’ decks and links to them', () => {
    const page = render({
      'arp:q1': { box: 1, dueAt: 0 }, // stage 2, due
      'vlan:q2': { box: 2, dueAt: 0 }, // stage 2, due
      'vlan:q3': { box: 2, dueAt: later }, // stage 2, not yet due
      'stp:q1': { box: 5, dueAt: 0 }, // stage 5, mastered: no longer reviewed
      'dns:q1': { box: 1, dueAt: 0 }, // stage 4, due
    });
    const stage2 = page.querySelector('[data-testid="path-stage-2-review"]');
    expect(stage2?.textContent).toBe('2 due for review');
    const href = stage2?.getAttribute('href') ?? '';
    expect(href.startsWith('/learning/protocols?review=')).toBe(true);
    const decks = decodeURIComponent(href.split('review=')[1]!).split(',');
    expect(decks).toEqual(expect.arrayContaining(['arp', 'vlan']));
    expect(decks).not.toContain('dns');
    expect(page.querySelector('[data-testid="path-stage-4-review"]')?.textContent).toBe(
      '1 due for review',
    );
    expect(page.querySelector('[data-testid="path-stage-5-review"]')).toBeNull();
  });

  it('TC-2295: nothing due shows no review line', () => {
    const page = render({ 'arp:q1': { box: 2, dueAt: later } });
    expect(page.querySelector('[data-testid$="-review"]')).toBeNull();
  });
});
