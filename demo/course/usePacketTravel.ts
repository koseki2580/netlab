import { useEffect, useState, type RefObject } from 'react';

export type TravelPhase = 'idle' | 'travelling' | 'arrived';

const MARKER = '[data-testid="canvas-packet"]';

/** Time the course gives the packet per link, and the bounds on a whole journey. */
const LINK_MS = 650;
const JOURNEY_MIN_MS = 1500;
const JOURNEY_MAX_MS = 3200;
/** How long to wait for a marker that has not started moving before taking it as placed. */
const SETTLE_MS = 80;
/** A diagram that never draws a marker must not keep the result from the learner. */
const NO_MARKER_MS = 1200;
const GIVE_UP_MS = 6000;

/** How long a journey over `links` links is given in the course. */
export function journeyMs(links: number): number {
  return Math.min(JOURNEY_MAX_MS, Math.max(JOURNEY_MIN_MS, links * LINK_MS));
}

/**
 * The library moves its packet marker across a single link in under half a
 * second, which a beginner misses. The motion is the library's own animation,
 * so the course slows that animation rather than drawing a second packet.
 */
function slow(marker: Element, links: number): boolean {
  const animations = typeof marker.getAnimations === 'function' ? marker.getAnimations() : [];
  for (const animation of animations) {
    const duration = Number(animation.effect?.getComputedTiming().duration);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const wanted = journeyMs(links);
    if (wanted > duration) animation.updatePlaybackRate(duration / wanted);
  }
  return animations.length > 0;
}

/**
 * Follows the packet marker the canvas draws, so the course can say what is
 * happening while it moves and give the verdict only once it has come to rest.
 *
 * `run` identifies one send (null before the first); `links` is how many links
 * that journey crosses. The marker reports its own state as `data-moving`, which
 * is what this reads: no timing is guessed here except as a fallback for a
 * diagram that draws no marker at all.
 */
export function usePacketTravel(
  diagram: RefObject<HTMLElement | null>,
  run: string | null,
  links: number,
): TravelPhase {
  const [arrivedRun, setArrivedRun] = useState<string | null>(null);

  useEffect(() => {
    const root = diagram.current;
    if (run === null || !root) return undefined;
    let done = false;
    let sawMoving = false;
    let paced = false;
    const started = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      setArrivedRun(run);
    };
    const check = () => {
      if (done) return;
      const marker = root.querySelector(MARKER);
      if (!marker) return;
      if (marker.getAttribute('data-moving') === 'true') {
        sawMoving = true;
        if (!paced) paced = slow(marker, links);
        return;
      }
      // At rest. Either it has finished moving, or it never moves (reduced
      // motion): a marker still at rest after a moment is taken as placed.
      if (sawMoving || Date.now() - started >= SETTLE_MS) finish();
    };
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(check) : null;
    observer?.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-moving', 'data-at'],
    });
    check();
    timers.push(setTimeout(check, SETTLE_MS + 10));
    timers.push(
      setTimeout(() => {
        if (!root.querySelector(MARKER)) finish();
      }, NO_MARKER_MS),
    );
    timers.push(setTimeout(finish, GIVE_UP_MS));
    return () => {
      done = true;
      observer?.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [diagram, run, links]);

  if (run === null) return 'idle';
  return arrivedRun === run ? 'arrived' : 'travelling';
}
