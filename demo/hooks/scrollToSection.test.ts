/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollToSection } from './scrollToSection';

/** Build a stub element with a scrollTo spy and controllable scroll metrics. */
function makeContainer(opts: { scrollHeight: number; clientHeight: number }) {
  const scrollTo = vi.fn();
  const el = {
    scrollHeight: opts.scrollHeight,
    clientHeight: opts.clientHeight,
    scrollTo,
    getBoundingClientRect: () => ({ top: 0 }) as DOMRect,
  } as unknown as HTMLElement;
  return { el, scrollTo };
}

function makeTarget(offsetTop: number, rectTop = 0) {
  return {
    offsetTop,
    getBoundingClientRect: () => ({ top: rectTop }) as DOMRect,
  } as unknown as HTMLElement;
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe('scrollToSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrolls the container to offsetTop - 80 when it owns the scroll', () => {
    mockReducedMotion(false);
    const { el, scrollTo } = makeContainer({ scrollHeight: 2000, clientHeight: 800 });
    scrollToSection(el, makeTarget(500));
    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'smooth' });
  });

  it('uses an instant jump under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const { el, scrollTo } = makeContainer({ scrollHeight: 2000, clientHeight: 800 });
    scrollToSection(el, makeTarget(500));
    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'auto' });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('never produces a negative scroll offset', () => {
    mockReducedMotion(false);
    const { el, scrollTo } = makeContainer({ scrollHeight: 2000, clientHeight: 800 });
    scrollToSection(el, makeTarget(40));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('falls back to the local window when the container does not scroll', () => {
    mockReducedMotion(false);
    const windowScroll = vi.fn();
    vi.stubGlobal('scrollY', 100);
    vi.stubGlobal('scrollTo', windowScroll);
    // Container shorter than its content threshold → not its own scroll context.
    const { el, scrollTo } = makeContainer({ scrollHeight: 800, clientHeight: 800 });
    scrollToSection(el, makeTarget(0, 300));
    expect(scrollTo).not.toHaveBeenCalled();
    // rectTop(300) + scrollY(100) - 80 = 320
    expect(windowScroll).toHaveBeenCalledWith({ top: 320, behavior: 'smooth' });
  });

  it('is a no-op when the target is missing', () => {
    mockReducedMotion(false);
    const { el, scrollTo } = makeContainer({ scrollHeight: 2000, clientHeight: 800 });
    scrollToSection(el, null);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
