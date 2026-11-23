/* @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import AnycastDemo from '../networking/AnycastDemo';
import ModernWifiDemo from '../networking/ModernWifiDemo';
import { LESSON_CARD, LESSON_TEAL_BUTTON_DISABLED } from './lessonStyles';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TC-2337 — a lesson legend names a line by its style, not by a colour that
 * changes with the theme, and a lesson card is edged with the strong border.
 */
describe('lesson styles (TC-2337)', () => {
  it('edges a lesson card with the strong border token, not a fixed dark hex', () => {
    expect(LESSON_CARD.border).toBe('1px solid var(--netlab-border-strong)');
  });

  it('draws the disabled teal button as a readable 44 px target in secondary text', () => {
    expect(Number(LESSON_TEAL_BUTTON_DISABLED.minHeight)).toBeGreaterThanOrEqual(44);
    expect(LESSON_TEAL_BUTTON_DISABLED.color).toBe('var(--netlab-text-secondary)');
    expect(LESSON_TEAL_BUTTON_DISABLED.background).toBe('var(--netlab-bg-elevated)');
    expect(LESSON_TEAL_BUTTON_DISABLED.opacity).toBeUndefined();
  });
});

describe('lesson legends name a line style, not a theme colour (TC-2337)', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    window.localStorage.removeItem('netlab-locale');
  });

  /** Render a lesson in `locale`, choose its first prediction and reveal the answer. */
  function revealed(Lesson: () => JSX.Element, prefix: string, locale: 'en' | 'ja'): string {
    if (locale === 'ja') window.localStorage.setItem('netlab-locale', 'ja');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <MemoryRouter>
          <Lesson />
        </MemoryRouter>,
      ),
    );
    const guess = container.querySelector<HTMLButtonElement>(`[data-testid^="${prefix}-guess-"]`);
    expect(guess).not.toBeNull();
    act(() => guess!.click());
    const reveal = container.querySelector<HTMLButtonElement>(
      `[data-testid="${prefix}-reveal-button"]`,
    );
    expect(reveal?.disabled).toBe(false);
    act(() => reveal!.click());
    return container.textContent ?? '';
  }

  it('the anycast map legend says thick solid and dashed lines, in English', () => {
    const text = revealed(AnycastDemo, 'any', 'en');
    expect(text).toContain('Thick solid line');
    expect(text).toContain('Thick dashed line');
    expect(text).not.toMatch(/cyan/i);
  });

  it('the anycast map legend says 太い実線 and 太い破線, in Japanese', () => {
    const text = revealed(AnycastDemo, 'any', 'ja');
    expect(text).toContain('太い実線');
    expect(text).toContain('太い破線');
    expect(text).not.toContain('水色');
  });

  it('the Wi-Fi airtime legend names the parts of a bar, not their colours', () => {
    const en = revealed(ModernWifiDemo, 'wifi', 'en');
    expect(en).toContain('Left part of each bar: overhead; right part: data.');
    expect(en).not.toMatch(/cyan/i);
  });

  it('the Wi-Fi airtime legend names the parts of a bar in Japanese', () => {
    const ja = revealed(ModernWifiDemo, 'wifi', 'ja');
    expect(ja).toContain('各バーの左側はオーバーヘッド、右側はデータです。');
    expect(ja).not.toContain('水色');
  });
});
