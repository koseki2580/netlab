/**
 * Q5 — container-bound section scroll.
 *
 * `Element.scrollIntoView` bubbles to every scrollable ancestor — in an
 * embed/iframe that can scroll the *host* page. This scrolls only the
 * gallery's own scroll context (its `<main>` when that element scrolls, else
 * the iframe's own `window`), so the host never moves. `prefers-reduced-motion`
 * downgrades the animation to an instant jump.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Scroll `target` to `offsetTop` px below the top of its scroll context.
 *
 * @param container The gallery's scroll element (`<main>`). When it is its own
 *   scroll container, it is scrolled directly; otherwise the (i)frame `window`
 *   is scrolled. Either way the change stays inside this document.
 * @param target The section element to bring into view.
 * @param offsetTop Sticky-header clearance. Defaults to 80px.
 */
export function scrollToSection(
  container: HTMLElement | null,
  target: HTMLElement | null,
  offsetTop = 80,
): void {
  if (!target) return;
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';

  if (container && container.scrollHeight > container.clientHeight + 1) {
    // `target.offsetTop` is relative to the positioned `<main>` (it sets
    // position: relative), so this lands the section under the sticky header.
    container.scrollTo({ top: Math.max(0, target.offsetTop - offsetTop), behavior });
    return;
  }

  // Fallback: the document/iframe window scrolls. Stay local to this window.
  const top = target.getBoundingClientRect().top + window.scrollY - offsetTop;
  window.scrollTo({ top: Math.max(0, top), behavior });
}
