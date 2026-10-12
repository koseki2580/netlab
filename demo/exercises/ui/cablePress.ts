/** Which cable a press on the diagram is taken for (`ExerciseDiagram.tsx`). */

/** A cable within reach of a press: how far its line is from the point, and whether it is unplugged. */
export interface CableInReach {
  readonly id: string;
  readonly distance: number;
  readonly down: boolean;
}

/**
 * Which of the cables within reach a press is taken for. An unplugged cable
 * wins over a plugged one, however near that is: where two cables share a
 * stretch of their drawn path, a learner who pressed the red dotted line was
 * unplugging the healthy cable beside it. Among equals, the nearest.
 */
export function cablePressed(inReach: readonly CableInReach[]): string | null {
  const nearest = (cables: readonly CableInReach[]): string | null =>
    cables.reduce<CableInReach | null>(
      (best, cable) => (best === null || cable.distance < best.distance ? cable : best),
      null,
    )?.id ?? null;
  return nearest(inReach.filter((cable) => cable.down)) ?? nearest(inReach);
}
