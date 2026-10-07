/** Shared by the exercise pages' component tests. Not used by the app. */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createSafeProgressStorage } from '../../../src/progress/storage';
import { GalleryLocaleProvider, type GalleryLocale } from '../../localeContext';
import { FIXTURE_TEMPLATES } from '../devFixtures';
import type { Exercise } from '../model/types';
import { createAttemptStore, type AttemptStore } from '../store/attemptStore';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

/** A store over an in-memory storage with a clock that only moves forward. `storage: false` = no storage. */
export function testStore(options: { storage?: boolean } = {}): AttemptStore {
  const data = new Map<string, string>();
  let time = 1_000_000;
  return createAttemptStore({
    learnerId: 'local-test',
    storage:
      options.storage === false
        ? null
        : createSafeProgressStorage({
            getItem: (key) => data.get(key) ?? null,
            setItem: (key, value) => void data.set(key, value),
            removeItem: (key) => void data.delete(key),
          }),
    now: () => (time += 1000),
  });
}

export function fixture(templateId: string, seed = 0): Exercise {
  const template = FIXTURE_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`no fixture ${templateId}`);
  return template.generate(seed);
}

export interface Screen {
  readonly container: HTMLElement;
  /** The element with this test id; throws when there is none. */
  get(testId: string): HTMLElement;
  find(testId: string): HTMLElement | null;
  click(testId: string): Promise<void>;
  /** Type into an input or pick in a select, as React hears it. */
  enter(testId: string, value: string): Promise<void>;
  /** Wait until `ready` holds (the grader runs on the real engine). */
  until(ready: () => boolean): Promise<void>;
  unmount(): void;
}

export function render(
  ui: ReactNode,
  {
    locale = 'ja',
    path = '/',
    route = '*',
  }: { locale?: GalleryLocale; path?: string; route?: string } = {},
): Screen {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <GalleryLocaleProvider locale={locale}>
          <Routes>
            <Route path={route} element={ui} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
        </GalleryLocaleProvider>
      </MemoryRouter>,
    );
  });
  const find = (testId: string) =>
    container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const get = (testId: string) => {
    const element = find(testId);
    if (!element) throw new Error(`no element with test id ${testId}`);
    return element;
  };
  const until = async (ready: () => boolean) => {
    for (let turn = 0; turn < 400 && !ready(); turn += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
    if (!ready()) throw new Error('timed out waiting');
  };
  return {
    container,
    get,
    find,
    until,
    async click(testId) {
      await act(async () => {
        get(testId).click();
      });
    },
    async enter(testId, value) {
      const element = get(testId) as HTMLInputElement | HTMLSelectElement;
      const prototype =
        element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
        element.dispatchEvent(
          new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
        );
      });
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Lines that read as English prose: four or more English words and no Japanese (the e2e guard's rule). */
export function englishProse(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => (line.match(/[A-Za-z]{2,}/g) ?? []).length >= 4 && !/[぀-ヿ一-龯]/.test(line));
}

export const hasJapanese = (text: string) => /[぀-ヿ一-龯]/.test(text);
