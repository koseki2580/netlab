/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DemoShell from './DemoShell';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(path: string, embedded = false) {
  act(() =>
    root.render(
      // Keyed so each call starts a fresh router at its own address.
      <MemoryRouter key={`${path}:${embedded}`} initialEntries={[path]}>
        <DemoShell title="Example" desc="Shared shell" embedded={embedded}>
          <div>lesson body</div>
        </DemoShell>
      </MemoryRouter>,
    ),
  );
}

const testid = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);

/** Wait, through the lazy import and the string chunk, for an element to appear. */
async function findTestid(id: string): Promise<HTMLElement> {
  for (let i = 0; i < 100; i += 1) {
    const found = testid(id);
    if (found) return found;
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  throw new Error(`no [data-testid="${id}"]`);
}

describe('the concept check after a lesson', () => {
  it('TC-2292: a lesson with a deck offers a collapsed check after the lesson, an embed does not', () => {
    render('/networking/arp');
    const open = testid('lesson-concept-open');
    expect(open?.tagName).toBe('BUTTON');
    expect(open?.getAttribute('aria-expanded')).toBe('false');
    expect(open?.textContent).toContain('Check yourself');
    // Collapsed: no question is drawn until it is opened.
    expect(testid('concept-check-prompt')).toBeNull();

    render('/learning/bits');
    expect(testid('lesson-concept-open')).toBeNull();

    render('/networking/arp', true);
    expect(testid('lesson-concept-open')).toBeNull();
  });

  it('TC-2293: opening the check starts the lesson’s own deck', async () => {
    render('/networking/arp');
    act(() => testid('lesson-concept-open')!.click());
    expect(testid('lesson-concept-open')?.getAttribute('aria-expanded')).toBe('true');
    expect((await findTestid('concept-check-session-title')).textContent).toBe('ARP');
    expect(testid('concept-check-picker')).toBeNull();
    expect(testid('concept-check-prompt')?.textContent).not.toBe('');
  });

  it('TC-2372: on a phone the check’s card is not nested in a padded section', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
    try {
      render('/networking/arp');
      act(() => testid('lesson-concept-open')!.click());
      await findTestid('concept-check-session-title');
      const section = testid('lesson-concept-open')!.closest('section')!;
      expect(section.style.paddingLeft).toBe('0px');
      expect(section.style.paddingRight).toBe('0px');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        value: width,
        configurable: true,
        writable: true,
      });
    }
  });
});
