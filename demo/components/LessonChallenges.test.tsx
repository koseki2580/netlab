/* @vitest-environment jsdom */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { GalleryLocaleProvider } from '../localeContext';
import { LessonChallenges, type Challenge } from './LessonChallenges';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TC-2620..TC-2623 — challenges are reached by operating the lesson (REQ-449):
 * the lesson's model decides `reached`; a reached challenge says so and why,
 * stays reached across a reload, hides its hint until asked, and can be reset.
 */

const LESSON = 'test-lesson';

/** A stand-in lesson: one control, a number; the goal is "set it to 3 or more". */
function Harness({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  const challenges: Challenge[] = [
    {
      id: 'three',
      goal: { en: 'Make it 3 or more.', ja: '3 以上にしてください。' },
      hint: { en: 'Press +.', ja: '+ を押します。' },
      reached: value >= 3,
      why: { en: `It is ${value} now.`, ja: `いまは ${value} です。` },
    },
    {
      id: 'ten',
      goal: { en: 'Make it 10.', ja: '10 にしてください。' },
      hint: { en: 'Keep pressing.', ja: '押し続けます。' },
      reached: value === 10,
      why: { en: 'Ten.', ja: '10 です。' },
    },
  ];
  return (
    <GalleryLocaleProvider locale="en">
      <button type="button" data-testid="plus" onClick={() => setValue((v) => v + 1)}>
        +
      </button>
      <button type="button" data-testid="minus" onClick={() => setValue((v) => v - 1)}>
        −
      </button>
      <LessonChallenges lessonId={LESSON} challenges={challenges} />
    </GalleryLocaleProvider>
  );
}

describe('lesson challenges (REQ-449)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    window.localStorage.removeItem(`netlab-challenges-${LESSON}`);
  });

  function mount(initial = 0) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Harness initial={initial} />));
  }
  const q = (id: string) => container!.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const click = (id: string) => act(() => q(id)!.click());

  it('TC-2620: a goal is unreached until the controls reach it, then says so and why', () => {
    mount();
    expect(q('challenge-three')!.dataset.reached).toBe('false');
    expect(q('challenge-three-why')).toBeNull();
    expect(q('challenges-count')!.dataset.reached).toBe('0');
    click('plus');
    click('plus');
    expect(q('challenge-three')!.dataset.reached).toBe('false');
    click('plus');
    expect(q('challenge-three')!.dataset.reached).toBe('true');
    expect(q('challenge-three-why')!.textContent).toBe('It is 3 now.');
    expect(q('challenges-count')!.textContent).toBe('1 / 2 reached');
  });

  it('TC-2621: the hint shows only when asked for', () => {
    mount();
    expect(q('challenge-three-hint')).toBeNull();
    click('challenge-three-hint-button');
    expect(q('challenge-three-hint')!.textContent).toBe('Press +.');
    click('challenge-three-hint-button');
    expect(q('challenge-three-hint')).toBeNull();
  });

  it('TC-2622: a reached challenge stays reached when the controls move on, and after a reload', () => {
    mount(3);
    expect(q('challenge-three')!.dataset.reached).toBe('true');
    click('minus');
    expect(q('challenge-three')!.dataset.reached).toBe('true');
    act(() => root!.unmount());
    container!.remove();
    mount(0);
    expect(q('challenge-three')!.dataset.reached).toBe('true');
    expect(q('challenge-ten')!.dataset.reached).toBe('false');
  });

  it('TC-2623: starting again forgets what was reached', () => {
    mount(3);
    click('minus');
    expect(q('challenges-count')!.dataset.reached).toBe('1');
    click('challenges-reset');
    expect(q('challenge-three')!.dataset.reached).toBe('false');
    expect(q('challenges-count')!.dataset.reached).toBe('0');
    expect(window.localStorage.getItem(`netlab-challenges-${LESSON}`)).toBeNull();
  });
});
